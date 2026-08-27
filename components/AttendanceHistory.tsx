"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Check, XCircle } from "lucide-react";

interface DailyRecord {
  id: string;
  date: string; // "2026-08-24"
  checkIn?: string | null; // "08:49:00"
  checkOut?: string | null;
  status:
    | "On Time"
    | "Grace Used"
    | "Late"
    | "Half Day"
    | "Absent"
    | "On Leave";
}

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 1. Query daily_attendance for the logged-in employee
    const q = query(
      collection(db, "daily_attendance"),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedRecords: DailyRecord[] = [];
        snapshot.forEach((docSnap) => {
          fetchedRecords.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<DailyRecord, "id">),
          });
        });

        // 2. Sort by latest date first (client-side)
        fetchedRecords.sort((a, b) => b.date.localeCompare(a.date));
        setRecords(fetchedRecords);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching attendance history:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Helper: Format "2026-08-24" -> "24 Aug 2026"
  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Helper: Format "08:49:15" -> "08:49"
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "--:--";
    return timeStr.slice(0, 5); // Takes HH:MM
  };

  return (
    <div className="w-full font-poppins mt-4 text-black">
      {/* Section Title */}
      <span className="text-[10px] opacity-50 font-normal block mb-2">
        Attendance History
      </span>

      {/* Main Table Card */}
      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-3 items-center px-6 py-4 border-b border-[#E5DEC9] text-[#231F20] text-[10px] font-semibold">
          <div>Date</div>
          <div className="text-center">Check-in</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-[#E5DEC9]/40 rounded" />
            <div className="h-10 bg-[#E5DEC9]/40 rounded" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C827A]">
            No attendance records found yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {records.map((record) => {
              const isLate = record.status === "Late";

              return (
                <div
                  key={record.id}
                  className="grid grid-cols-3 items-center px-6 py-4"
                >
                  {/* Column 1: Date */}
                  <div className="font-semibold text-xs tracking-wide">
                    {formatDate(record.date)}
                  </div>

                  {/* Column 2: Check-in Time */}
                  <div
                    className={`text-center text-xs font-normal ${
                      isLate ? "text-[#DE4949]" : "text-[#7A8B99]"
                    }`}
                  >
                    {formatTime(record.checkIn)}
                  </div>

                  {/* Column 3: Status Badge */}
                  <div className="flex justify-end">
                    {isLate ? (
                      <div className="bg-[#C23C3C] text-white text-xs font-medium px-2 py-1.5 flex items-center justify-center gap-1.5 rounded-xs shadow-xs">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Late</span>
                      </div>
                    ) : (
                      <div className="bg-[#F28B31] text-white text-xs font-medium px-2 py-1.5 flex items-center justify-center gap-1.5 rounded-xs shadow-xs">
                        <Check className="w-4 h-4 shrink-0 stroke-3" />
                        <span>On Time</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
