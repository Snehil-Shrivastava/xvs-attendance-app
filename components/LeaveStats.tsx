"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const LeaveStats = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const [monthDaysTaken, setMonthDaysTaken] = useState(0);
  const [yearDaysTaken, setYearDaysTaken] = useState(0);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const now = new Date();
  const currentYearStr = useMemo(() => String(now.getFullYear()), []); // e.g. "2026"
  const currentMonthStr = useMemo(() => {
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${currentYearStr}-${m}`;
  }, [currentYearStr]); // e.g. "2026-09"

  // @ts-expect-error user leaves quota
  const annualQuota: number = userData?.leaves?.annualQuota ?? 24;

  useEffect(() => {
    if (!user) return;
    setLoadingLeaves(true);

    const q = query(collection(db, "leaves"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let monthTotal = 0;
        let yearTotal = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          if (data.status === "approved") {
            const isHalfDay =
              data.leaveType === "Half Day" ||
              data.durationType === "half" ||
              Number(data.totalDays) === 0.5;

            const start = data.startDate;
            const end = data.endDate || start;

            if (!start) return;

            // 1. Half Day
            if (isHalfDay) {
              if (start.startsWith(currentYearStr)) {
                yearTotal += 0.5;
              }
              if (start.startsWith(currentMonthStr)) {
                monthTotal += 0.5;
              }
            } else if (start === end) {
              // 2. Single Day
              if (start.startsWith(currentYearStr)) {
                yearTotal += 1;
              }
              if (start.startsWith(currentMonthStr)) {
                monthTotal += 1;
              }
            } else {
              // 3. Multi-day span: iterate weekdays
              try {
                const cur = new Date(start);
                const last = new Date(end);

                while (cur <= last) {
                  const yyyy = String(cur.getFullYear());
                  const yyyyMm = cur.toISOString().slice(0, 7);
                  const dayOfWeek = cur.getDay();

                  // Exclude weekends (0 = Sun, 6 = Sat)
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    if (yyyy === currentYearStr) {
                      yearTotal += 1;
                    }
                    if (yyyyMm === currentMonthStr) {
                      monthTotal += 1;
                    }
                  }
                  cur.setDate(cur.getDate() + 1);
                }
              } catch {
                if (start.startsWith(currentYearStr)) {
                  yearTotal += Number(data.totalDays || 1);
                }
                if (start.startsWith(currentMonthStr)) {
                  monthTotal += Number(data.totalDays || 1);
                }
              }
            }
          }
        });

        setMonthDaysTaken(monthTotal);
        setYearDaysTaken(yearTotal);
        setLoadingLeaves(false);
      },
      (error) => {
        console.error("Error calculating leave stats:", error);
        setLoadingLeaves(false);
      },
    );

    return () => unsubscribe();
  }, [user, currentYearStr, currentMonthStr]);

  const isLoading = authLoading || loadingLeaves;

  // Helper: pad whole numbers (e.g. 2 -> "02"), but keep fractions (e.g. 1.5 -> "1.5")
  const formatDays = (days: number) => {
    if (Number.isInteger(days)) {
      return String(days).padStart(2, "0");
    }
    return String(days);
  };

  // 1. Leaves Taken: THIS MONTH ONLY
  const leavesTakenStr = formatDays(monthDaysTaken);

  // 2. Leaves Remaining: YEARLY REMAINING (e.g. 24 - yearDaysTaken)
  const remainingDays = Math.max(0, annualQuota - yearDaysTaken);
  const leavesRemainingStr = formatDays(remainingDays);

  // 3. Unpaid Leaves: EXHAUSTED BEYOND YEARLY QUOTA (24)
  const unpaidDays = Math.max(0, yearDaysTaken - annualQuota);
  const unpaidLeavesStr = formatDays(unpaidDays);

  return (
    <div className="w-full font-poppins">
      <div className="grid grid-cols-3 gap-3">
        {/* =========================================
            CARD 1: LEAVES TAKEN (THIS MONTH)
        ========================================= */}
        <div className="bg-[#457375] py-2.5 px-2 flex flex-col items-center justify-between text-center text-white gap-1.5">
          <span className="text-[8px] font-normal tracking-wide opacity-95">
            Leaves Taken
          </span>

          {isLoading ? (
            <div className="h-10 w-12 bg-white/20 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#FAF7F2] text-[40px] md:text-[48px] leading-none tracking-wider my-auto">
              {leavesTakenStr}
            </h3>
          )}
        </div>

        {/* =========================================
            CARD 2: LEAVES REMAINING (OUT OF 24/YR)
        ========================================= */}
        <div className="bg-[#849F9C] py-2.5 px-2 flex flex-col items-center justify-between text-center text-white gap-1.5">
          <span className="text-[8px] font-normal tracking-wide opacity-95">
            Leaves Remaining
          </span>

          {isLoading ? (
            <div className="h-10 w-12 bg-white/20 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#FAF7F2] text-[40px] md:text-[48px] leading-none tracking-wider my-auto">
              {leavesRemainingStr}
            </h3>
          )}
        </div>

        {/* =========================================
            CARD 3: UNPAID LEAVES (EXCEEDED 24/YR)
        ========================================= */}
        <div className="bg-[#DE4949] py-2.5 px-2 flex flex-col items-center justify-between text-center text-white gap-1.5">
          <span className="text-[8px] font-normal tracking-wide opacity-95">
            Unpaid Leaves
          </span>

          {isLoading ? (
            <div className="h-10 w-12 bg-white/20 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#FAF7F2] text-[40px] md:text-[48px] leading-none tracking-wider my-auto">
              {unpaidLeavesStr}
            </h3>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveStats;
