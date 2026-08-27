"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface MonthlyStats {
  lateDays?: number;
  overtimeMinutes?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
}

const AttendanceStats = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Current Month String (e.g., "2026-08")
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for current month's stats
    const summaryDocRef = doc(
      db,
      "monthly_summaries",
      `${currentMonth}_${user.uid}`,
    );

    const unsubscribe = onSnapshot(
      summaryDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setStats(docSnap.data() as MonthlyStats);
        } else {
          setStats({
            lateDays: 0,
            overtimeMinutes: 0,
            paidLeaveDays: 0,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching monthly stats:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, currentMonth]);

  const isLoading = authLoading || loading;

  // Format numbers with leading zeros (e.g. 4 -> "04")
  const lateCount = String(stats?.lateDays ?? 0).padStart(2, "0");
  const lateRequests = "00"; // Placeholder for now
  const leaveCount = String(
    // @ts-expect-error unknown
    userData?.leaves?.used ?? stats?.paidLeaveDays ?? 0,
  ).padStart(2, "0");
  const overtimeMins = stats?.overtimeMinutes ?? 0;

  return (
    <div className="w-full font-poppins">
      <div className="flex gap-2.5">
        {/* =========================================
            CARD 1: LATE (RED)
        ========================================= */}
        <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
          <span className="text-black text-[8px] tracking-wide font-semibold">
            Late
          </span>

          {isLoading ? (
            <div className="h-10 w-10 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#E14948] text-4xl leading-none my-auto">
              {lateCount}
            </h3>
          )}
        </div>

        {/* =========================================
            CARD 2: LATE REQUEST (PLACEHOLDER)
        ========================================= */}
        <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
          <span className="text-black text-[8px] tracking-wide font-semibold">
            Late Request
          </span>

          {isLoading ? (
            <div className="h-10 w-10 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#E14948] text-4xl leading-none my-auto">
              {lateRequests}
            </h3>
          )}
        </div>

        {/* =========================================
            CARD 3: LEAVE (TEAL / SLATE)
        ========================================= */}
        <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
          <span className="text-black text-[8px] tracking-wide font-semibold">
            Leave
          </span>

          {isLoading ? (
            <div className="h-10 w-10 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
          ) : (
            <h3 className="font-calSans text-[#4E7B80] text-4xl leading-none my-auto">
              {leaveCount}
            </h3>
          )}
        </div>

        {/* =========================================
            CARD 4: OVERTIME (SOLID BLUE)
        ========================================= */}
        <div className="bg-[#4CA7E2] py-4 px-2 flex flex-col items-center justify-between text-center text-white flex-1 gap-0.5">
          <span className="text-[8px] tracking-wide font-semibold">
            Overtime
          </span>

          {isLoading ? (
            <div className="h-10 w-16 bg-white/20 animate-pulse rounded my-auto" />
          ) : (
            <div className="flex items-center justify-center gap-1 my-auto">
              <h3 className="font-calSans text-white text-4xl leading-none">
                {overtimeMins}
              </h3>
              <span className="text-[8px] font-normal opacity-90">mins</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceStats;
