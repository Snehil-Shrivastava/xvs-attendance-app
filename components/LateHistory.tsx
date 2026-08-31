"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface LateItem {
  id: string;
  date: string; // "2026-08-11"
  joinedAt: string; // "10:00AM"
  lateDuration: string; // "1 hr Late" or "30 mins Late"
}

const LateHistory = () => {
  const { user } = useAuth();
  const [lateRecords, setLateRecords] = useState<LateItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper: Format "2026-08-11" -> "08/11/2026"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  };

  // Helper: Format time string into "10:00AM" or "9:30AM"
  const formatTimeStr = (timeStr?: string | null) => {
    if (!timeStr) return "10:00AM";

    // If already has AM/PM (e.g. "10:00 AM" -> "10:00AM")
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr.replace(/\s+/g, "");
    }

    // If 24-hour format (e.g. "10:00:00")
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
          const lateMins = Number(data.lateMinutes || 0);

          if (data.status === "Late" || lateMins > 0) {
            const dateStr = data.date;
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

          // Only include approved requests
          if (data.status === "approved" && data.date) {
            const dateStr = data.date;
            const arrivalTime = data.newArrivalTime || "10:00 AM";

            // Calculate late minutes past 09:00 AM
            let lateMins = 60; // Default 1 hr
            try {
              const [timePart, modifier] = arrivalTime.split(" ");
              let [hours, minutes] = timePart.split(":").map(Number);
              if (modifier === "PM" && hours < 12) hours += 12;
              if (modifier === "AM" && hours === 12) hours = 0;
              const diffMins = (hours - 9) * 60 + (minutes || 0);
              lateMins = Math.max(0, diffMins);
            } catch {
              lateMins = 60;
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
  }, [user]);

  return (
    <div className="w-full font-poppins mt-6 text-black pb-10">
      {/* Section Title */}
      <span className="text-[13px] text-[#8C827A] font-normal block mb-2">
        Late History
      </span>

      {/* Main Table / Container */}
      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
          </div>
        ) : lateRecords.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C827A]">
            No late arrival history found.
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
