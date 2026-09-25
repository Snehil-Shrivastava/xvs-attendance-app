"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { parseTimeToSeconds } from "@/lib/attendanceStatus";

interface LateItem {
  id: string;
  date: string; // "2026-08-11"
  joinedAt: string; // "10:00AM"
  lateDuration: string; // "1 hr Late" or "30 mins Late"
}

const DEFAULT_SHIFT_START = "09:01:00"; // seconds-precision string

const LateHistory = () => {
  const { user, userData } = useAuth();
  const [lateRecords, setLateRecords] = useState<LateItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Current month string: e.g. "2026-09"
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  // Current month title for display: e.g. "September 2026"
  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, []);

  // Read the user's real shift start time from their profile.
  // Falls back to 09:01 if the field is missing.
  const shiftStartSec = useMemo(() => {
    // Cast defensively — `shift` may not be on UserProfile's TS type yet.
    const raw = (userData as { shift?: { startTime?: string } } | null)?.shift
      ?.startTime;
    const parsed = parseTimeToSeconds(raw || DEFAULT_SHIFT_START);
    return parsed ?? parseTimeToSeconds(DEFAULT_SHIFT_START) ?? 9 * 3600 + 60;
  }, [userData]);

  // Helper: Format "2026-08-11" -> "08/11/2026"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  };

  // Helper: Format time string into "10:00AM" or "9:30AM"
  const formatTimeStr = (timeStr?: string | null) => {
    if (!timeStr) return "10:00AM";

    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr.replace(/\s+/g, "");
    }

    try {
      const [h, m] = timeStr.split(":");
      let hours = parseInt(h, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${m}${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Helper: Format minutes into "1 hr Late" or "30 mins Late"
  const formatLateMinutes = (mins: number) => {
    if (!mins || mins <= 0) return "Late";
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours > 0 && remainingMins > 0) {
      return `${hours} hr ${remainingMins} mins Late`;
    }
    if (hours > 0) {
      return `${hours} ${hours === 1 ? "hr" : "hrs"} Late`;
    }
    return `${remainingMins} mins Late`;
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    let attendanceLateMap: Record<string, LateItem> = {};
    let approvedRequestsMap: Record<string, LateItem> = {};

    const updateCombinedRecords = () => {
      // Merge records by date (biometric check-ins take precedence if both exist)
      const mergedMap = { ...approvedRequestsMap, ...attendanceLateMap };
      const mergedList = Object.values(mergedMap);

      // Sort newest dates first
      mergedList.sort((a, b) => b.date.localeCompare(a.date));
      setLateRecords(mergedList);
      setLoading(false);
    };

    // 1. Listen to `daily_attendance` for actual late biometric check-ins
    const attendanceQuery = query(
      collection(db, "daily_attendance"),
      where("userId", "==", user.uid),
    );

    const unsubAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const newMap: Record<string, LateItem> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const dateStr = data.date;

          // Only keep records that belong to the current month
          if (!dateStr || !dateStr.startsWith(currentMonthStr)) return;

          // Prefer new field; fall back to legacy float so pre-migration
          // docs still render.
          // const lateSec = Number(
          //   data.lateSeconds ?? (data.lateMinutes ? data.lateMinutes * 60 : 0),
          // );
          // const lateMins = Math.round(lateSec / 60);

          // Raw seconds past shift start (or the effective shift start if the day
          // had an approved late-arrival override).
          const lateMins = Math.round(Number(data.delaySeconds ?? 0) / 60);

          // Include both "Late" and "Late/Allowed" days — anyone who arrived past
          // shift start deserves a row here.
          if (lateMins > 0) {
            newMap[dateStr] = {
              id: `att_${docSnap.id}`,
              date: dateStr,
              joinedAt: formatTimeStr(data.checkIn),
              lateDuration: formatLateMinutes(lateMins),
            };
          }
        });

        attendanceLateMap = newMap;
        updateCombinedRecords();
      },
      (error) => {
        console.error("Error fetching late attendance:", error);
        setLoading(false);
      },
    );

    // 2. Listen to `late_arrivals` for approved late arrival requests
    const lateRequestsQuery = query(
      collection(db, "late_arrivals"),
      where("userId", "==", user.uid),
    );

    const unsubLateRequests = onSnapshot(
      lateRequestsQuery,
      (snapshot) => {
        const newMap: Record<string, LateItem> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const dateStr = data.date;

          // Only keep approved requests that belong to the current month
          if (
            data.status === "approved" &&
            dateStr &&
            dateStr.startsWith(currentMonthStr)
          ) {
            const arrivalTime = String(data.newArrivalTime || "10:00 AM");

            // Late minutes = arrival time − the user's real shift start.
            // (Both parsed uniformly by parseTimeToSeconds.)
            const arrivalSec = parseTimeToSeconds(arrivalTime);
            const shiftSec = shiftStartSec;

            let lateMins = 60; // safe fallback if parsing fails
            if (arrivalSec !== null) {
              const diffSec = Math.max(0, arrivalSec - shiftSec);
              lateMins = Math.round(diffSec / 60);
            }

            newMap[dateStr] = {
              id: `req_${docSnap.id}`,
              date: dateStr,
              joinedAt: formatTimeStr(arrivalTime),
              lateDuration: formatLateMinutes(lateMins),
            };
          }
        });

        approvedRequestsMap = newMap;
        updateCombinedRecords();
      },
      (error) => {
        console.error("Error fetching late requests:", error);
        setLoading(false);
      },
    );

    return () => {
      unsubAttendance();
      unsubLateRequests();
    };
  }, [user, currentMonthStr, shiftStartSec]);

  return (
    <div className="w-full font-poppins mt-6 text-black pb-10">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-[#8C827A] font-normal">
          Late History
        </span>
        <span className="text-[10px] text-[#8C827A] opacity-75 font-light">
          {currentMonthName}
        </span>
      </div>

      {/* Main Table / Container */}
      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
          </div>
        ) : lateRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C827A]">
            No late arrival records for {currentMonthName}.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {lateRecords.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center px-4 py-5 gap-2 text-[10px]"
              >
                {/* Column 1: Date (e.g. 08/11/2026) */}
                <div className="col-span-4 font-semibold text-[#231F20] tracking-wide text-[10px]">
                  {formatDate(item.date)}
                </div>

                {/* Column 2: Joined At (e.g. Joined at 10:00AM) */}
                <div className="col-span-4 text-[#8C827A] font-light text-center">
                  <span>Joined at {item.joinedAt}</span>
                </div>

                {/* Column 3: Duration (e.g. 1 hr Late / 30 mins Late) */}
                <div className="col-span-4 text-right font-semibold text-[#231F20] text-[10px]">
                  {item.lateDuration}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LateHistory;
