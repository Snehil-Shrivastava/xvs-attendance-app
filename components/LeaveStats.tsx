"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  computeLeaveSummary,
  formatLeaveDays,
  buildHolidayDateSet,
  type LeaveDoc,
} from "@/lib/leaveCalc";

interface LeaveStatsProps {
  targetUserId?: string;
}

const LeaveStats = ({ targetUserId }: LeaveStatsProps) => {
  const { user, userData, loading: authLoading } = useAuth();
  const effectiveUid = targetUserId || user?.uid;

  const [leaves, setLeaves] = useState<LeaveDoc[]>([]);
  const [holidays, setHolidays] = useState<Array<{ date?: string }>>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const currentYearStr = String(new Date().getFullYear());
  const annualQuota = userData?.leaves?.annualQuota ?? 24;
  const openingUsedDays = userData?.leaves?.openingUsedDays; // NEW

  useEffect(() => {
    if (!effectiveUid) return;
    setLoadingLeaves(true);

    const q = query(
      collection(db, "leaves"),
      where("userId", "==", effectiveUid),
    );
    const unsubLeaves = onSnapshot(
      q,
      (snap) => {
        const arr: LeaveDoc[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as LeaveDoc) }));
        setLeaves(arr);
        setLoadingLeaves(false);
      },
      (err) => {
        console.error("Error calculating leave stats:", err);
        setLoadingLeaves(false);
      },
    );

    const holidaysQuery = query(
      collection(db, "holidays"),
      where("month", ">=", `${currentYearStr}-01`),
      where("month", "<=", `${currentYearStr}-12`),
    );
    const unsubHolidays = onSnapshot(holidaysQuery, (snap) => {
      const arr: Array<{ date?: string }> = [];
      snap.forEach((d) => arr.push(d.data() as { date?: string }));
      setHolidays(arr);
    });

    return () => {
      unsubLeaves();
      unsubHolidays();
    };
  }, [effectiveUid, currentYearStr]);

  const summary = useMemo(
    () =>
      computeLeaveSummary(leaves, {
        annualQuota,
        openingUsedDays, // NEW
        holidayDates: buildHolidayDateSet(holidays),
      }),
    [leaves, holidays, annualQuota, openingUsedDays],
  );

  const isLoading = authLoading || loadingLeaves;

  const leavesTakenStr = formatLeaveDays(
    summary.yearOpeningUsedDays + summary.yearPaidDays,
  );
  const leavesRemainingStr = formatLeaveDays(summary.yearRemaining);
  const unpaidLeavesStr = formatLeaveDays(summary.yearTotalUnpaidDays);

  return (
    <div className="w-full font-poppins">
      <div className="grid grid-cols-3 gap-3">
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
