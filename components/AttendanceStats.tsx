"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface MonthlyStats {
  lateDays?: number;
  halfDays?: number;
  overtimeMinutes?: number;
}

interface AttendanceStatsProps {
  currentMonth: string; // e.g. "2026-08"
}

const AttendanceStats = ({ currentMonth }: AttendanceStatsProps) => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [monthLeaveDays, setMonthLeaveDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // 1. Listen to Monthly Summary (Late, Half Days, Overtime)
    const summaryDocRef = doc(
      db,
      "monthly_summaries",
      `${currentMonth}_${user.uid}`,
    );
    const unsubscribeSummary = onSnapshot(summaryDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as MonthlyStats);
      } else {
        setStats({ lateDays: 0, halfDays: 0, overtimeMinutes: 0 });
      }
    });

    // 2. Listen to `leaves` collection to calculate leaves for THIS specific month
    const leavesQuery = query(
      collection(db, "leaves"),
      where("userId", "==", user.uid),
    );

    const unsubscribeLeaves = onSnapshot(leavesQuery, (snapshot) => {
      let daysCount = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "approved") {
          const start = data.startDate; // "2026-08-11"
          const end = data.endDate; // "2026-08-13"

          // Count how many days of this leave fall into currentMonth
          if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const curDate = new Date(startDate);

            while (curDate <= endDate) {
              const yyyyMm = curDate.toISOString().slice(0, 7);
              const dayOfWeek = curDate.getDay();
              // Count if in current month and is a weekday (Mon-Fri)
              if (
                yyyyMm === currentMonth &&
                dayOfWeek !== 0 &&
                dayOfWeek !== 6
              ) {
                daysCount++;
              }
              curDate.setDate(curDate.getDate() + 1);
            }
          }
        }
      });

      setMonthLeaveDays(daysCount);
      setLoading(false);
    });

    return () => {
      unsubscribeSummary();
      unsubscribeLeaves();
    };
  }, [user, currentMonth]);

  const isLoading = authLoading || loading;

  const lateCount = String(stats?.lateDays ?? 0).padStart(2, "0");
  const halfDaysCount = String(stats?.halfDays ?? 0).padStart(2, "0");
  const leaveCount = String(monthLeaveDays).padStart(2, "0");
  const overtimeMins = stats?.overtimeMinutes ?? 0;

  return (
    <div className="w-full font-poppins">
      <div className="flex gap-2.5">
        {/* CARD 1: LATE (RED) */}
        <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
          <span className="text-black text-[9px] tracking-wide font-semibold">
            Late
          </span>
          {isLoading ? (
            <div className="h-8 w-8 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#E14948] text-4xl leading-none my-auto">
              {lateCount}
            </h3>
          )}
        </div>

        {/* CARD 2: HALF DAY (CYAN) */}
        <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
          <span className="text-black text-[9px] tracking-wide font-semibold whitespace-nowrap">
            Half Day
          </span>
          {isLoading ? (
            <div className="h-8 w-8 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#74C0B5] text-4xl leading-none my-auto">
              {halfDaysCount}
            </h3>
          )}
        </div>

        {/* CARD 3: LEAVE (TEAL / SLATE) */}
        <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
          <span className="text-black text-[9px] tracking-wide font-semibold">
            Leave
          </span>
          {isLoading ? (
            <div className="h-8 w-8 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#4E7B80] text-4xl leading-none my-auto">
              {leaveCount}
            </h3>
          )}
        </div>

        {/* CARD 4: OVERTIME (SOLID BLUE) */}
        <div className="bg-[#55B5E5] py-4 px-2 flex flex-col items-center justify-between text-center text-white flex-1 gap-0.5">
          <span className="text-[9px] tracking-wide font-semibold">
            Overtime
          </span>
          {isLoading ? (
            <div className="h-8 w-14 bg-white/20 animate-pulse rounded my-auto" />
          ) : (
            <div className="flex items-center justify-center gap-1 my-auto">
              <h3 className="font-calSans text-white text-4xl leading-none">
                {overtimeMins}
              </h3>
              <span className="text-[9px] font-normal opacity-90">mins</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceStats;
