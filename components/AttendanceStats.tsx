// "use client";

// import { useEffect, useState } from "react";
// import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";

// interface MonthlyStats {
//   lateDays?: number;
//   halfDays?: number;
//   overtimeMinutes?: number;
// }

// interface AttendanceStatsProps {
//   currentMonth: string; // e.g. "2026-08"
//   targetUserId?: string;
// }

// const AttendanceStats = ({
//   currentMonth,
//   targetUserId,
// }: AttendanceStatsProps) => {
//   const { user, loading: authLoading } = useAuth();
//   const effectiveUid = targetUserId || user?.uid;
//   const [stats, setStats] = useState<MonthlyStats | null>(null);
//   const [monthLeaveDays, setMonthLeaveDays] = useState(0);
//   const [monthHalfDays, setMonthHalfDays] = useState(0);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!user) return;
//     // eslint-disable-next-line react-hooks/set-state-in-effect
//     setLoading(true);

//     // 1. Listen to Monthly Summary (Late, Biometric Half Days, Overtime)
//     const summaryDocRef = doc(
//       db,
//       "monthly_summaries",
//       `${currentMonth}_${effectiveUid}`,
//     );
//     const unsubscribeSummary = onSnapshot(summaryDocRef, (docSnap) => {
//       if (docSnap.exists()) {
//         setStats(docSnap.data() as MonthlyStats);
//       } else {
//         setStats({ lateDays: 0, halfDays: 0, overtimeMinutes: 0 });
//       }
//     });

//     // 2. Listen to `leaves` collection to calculate leaves & half days for THIS month
//     const leavesQuery = query(
//       collection(db, "leaves"),
//       where("userId", "==", effectiveUid),
//     );

//     const unsubscribeLeaves = onSnapshot(leavesQuery, (snapshot) => {
//       let fullLeaveCount = 0;
//       let halfDayCount = 0;

//       snapshot.forEach((docSnap) => {
//         const data = docSnap.data();
//         if (data.status === "approved") {
//           const isHalfDay =
//             data.leaveType === "Half Day" ||
//             data.durationType === "half" ||
//             data.totalDays === 0.5;

//           const start = data.startDate; // "2026-08-11"
//           const end = data.endDate; // "2026-08-13"

//           if (isHalfDay) {
//             // Check if Half Day date falls into currently selected month
//             if (start && start.startsWith(currentMonth)) {
//               halfDayCount++;
//             }
//           } else {
//             // Full Leave: Count weekdays falling into currently selected month
//             if (start && end) {
//               const startDate = new Date(start);
//               const endDate = new Date(end);
//               const curDate = new Date(startDate);

//               while (curDate <= endDate) {
//                 const yyyyMm = curDate.toISOString().slice(0, 7);
//                 const dayOfWeek = curDate.getDay();

//                 if (
//                   yyyyMm === currentMonth &&
//                   dayOfWeek !== 0 &&
//                   dayOfWeek !== 6
//                 ) {
//                   fullLeaveCount++;
//                 }
//                 curDate.setDate(curDate.getDate() + 1);
//               }
//             }
//           }
//         }
//       });

//       setMonthLeaveDays(fullLeaveCount);
//       setMonthHalfDays(halfDayCount);
//       setLoading(false);
//     });

//     return () => {
//       unsubscribeSummary();
//       unsubscribeLeaves();
//     };
//   }, [user, currentMonth, effectiveUid]);

//   const isLoading = authLoading || loading;

//   const lateCount = String(stats?.lateDays ?? 0).padStart(2, "0");

//   // Combines approved Half Day requests + any biometric Half Days
//   const totalHalfDays = monthHalfDays + (stats?.halfDays ?? 0);
//   const halfDaysCount = String(totalHalfDays).padStart(2, "0");

//   const leaveCount = String(monthLeaveDays).padStart(2, "0");
//   const overtimeMins = stats?.overtimeMinutes ?? 0;

//   return (
//     <div className="w-full font-poppins">
//       <div className="flex gap-2.5">
//         {/* CARD 1: LATE (RED) */}
//         <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
//           <span className="text-black text-[9px] tracking-wide font-semibold">
//             Late
//           </span>
//           {isLoading ? (
//             <div className="h-8 w-8 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
//           ) : (
//             <h3 className="font-calSans text-[#E14948] text-4xl leading-none my-auto">
//               {lateCount}
//             </h3>
//           )}
//         </div>

//         {/* CARD 2: HALF DAY (CYAN) */}
//         <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
//           <span className="text-black text-[9px] tracking-wide font-semibold whitespace-nowrap">
//             Half Day
//           </span>
//           {isLoading ? (
//             <div className="h-8 w-8 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
//           ) : (
//             <h3 className="font-calSans text-[#74C0B5] text-4xl leading-none my-auto">
//               {halfDaysCount}
//             </h3>
//           )}
//         </div>

//         {/* CARD 3: LEAVE (TEAL / SLATE) */}
//         <div className="border border-[#E5DEC9] bg-transparent py-4 px-2 flex flex-col items-center justify-between text-center flex-[0.65] gap-0.5">
//           <span className="text-black text-[9px] tracking-wide font-semibold">
//             Leave
//           </span>
//           {isLoading ? (
//             <div className="h-8 w-8 bg-[#E5DEC9]/50 animate-pulse rounded my-auto" />
//           ) : (
//             <h3 className="font-calSans text-[#4E7B80] text-4xl leading-none my-auto">
//               {leaveCount}
//             </h3>
//           )}
//         </div>

//         {/* CARD 4: OVERTIME (SOLID BLUE) */}
//         <div className="bg-[#55B5E5] py-4 px-2 flex flex-col items-center justify-between text-center text-white flex-1 gap-0.5">
//           <span className="text-[9px] tracking-wide font-semibold">
//             Overtime
//           </span>
//           {isLoading ? (
//             <div className="h-8 w-14 bg-white/20 animate-pulse rounded my-auto" />
//           ) : (
//             <div className="flex items-center justify-center gap-1 my-auto">
//               <h3 className="font-calSans text-white text-4xl leading-none">
//                 {overtimeMins}
//               </h3>
//               <span className="text-[9px] font-normal opacity-90">mins</span>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AttendanceStats;

// ---------------------------------------------------------------------------------------

"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  computeLeaveSummary,
  buildHolidayDateSet,
  type LeaveDoc,
} from "@/lib/leaveCalc";

interface AttendanceStatsProps {
  currentMonth: string; // e.g. "2026-08"
  targetUserId?: string;
}

const AttendanceStats = ({
  currentMonth,
  targetUserId,
}: AttendanceStatsProps) => {
  const { user, loading: authLoading } = useAuth();
  const effectiveUid = targetUserId || user?.uid;

  const [leaves, setLeaves] = useState<LeaveDoc[]>([]);
  const [holidays, setHolidays] = useState<Array<{ date?: string }>>([]);
  const [attendanceHalfDayDates, setAttendanceHalfDayDates] = useState<
    Set<string>
  >(new Set());
  const [lateDaysCount, setLateDaysCount] = useState(0);
  const [overtimeMinsSum, setOvertimeMinsSum] = useState(0);
  const [loading, setLoading] = useState(true);

  // The util needs a Date for "which month/year are we summarising". We
  // anchor it to the 15th of `currentMonth` — safely mid-month so DST edges
  // or month-boundary arithmetic can never flip it to an adjacent month.
  const summaryNow = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return new Date(y, m - 1, 15);
  }, [currentMonth]);

  const holidayYear = currentMonth.slice(0, 4);

  useEffect(() => {
    if (!user || !effectiveUid) return;
    setLoading(true);

    // ---- 1. All leaves for this user. Util filters by month/year.
    const leavesQuery = query(
      collection(db, "leaves"),
      where("userId", "==", effectiveUid),
    );
    const unsubLeaves = onSnapshot(leavesQuery, (snapshot) => {
      const arr: LeaveDoc[] = [];
      snapshot.forEach((d) =>
        arr.push({ id: d.id, ...(d.data() as LeaveDoc) }),
      );
      setLeaves(arr);
      setLoading(false);
    });

    // ---- 2. Holidays for the year containing `currentMonth`.
    //      Fix #6.5: was previously missing — this is what made
    //      AttendanceStats disagree with LeaveStats on spans with a holiday.
    const holidaysQuery = query(
      collection(db, "holidays"),
      where("month", ">=", `${holidayYear}-01`),
      where("month", "<=", `${holidayYear}-12`),
    );
    const unsubHolidays = onSnapshot(holidaysQuery, (snapshot) => {
      const arr: Array<{ date?: string }> = [];
      snapshot.forEach((d) => arr.push(d.data() as { date?: string }));
      setHolidays(arr);
    });

    // ---- 3. Daily attendance: source of truth for half-days,
    //         late days, and overtime minutes for this month.
    const attendanceQuery = query(
      collection(db, "daily_attendance"),
      where("userId", "==", effectiveUid),
      where("month", "==", currentMonth),
    );
    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const localHalfDays = new Set<string>();
      let localLateCount = 0;
      let localOtMins = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.status === "Half Day" && data.date) {
          localHalfDays.add(data.date);
        }
        if (data.status === "Late") {
          localLateCount += 1;
        }
        localOtMins += Number(data.overtimeMinutes || 0);
      });

      setAttendanceHalfDayDates(localHalfDays);
      setLateDaysCount(localLateCount);
      setOvertimeMinsSum(localOtMins);
    });

    return () => {
      unsubLeaves();
      unsubHolidays();
      unsubAttendance();
    };
  }, [user, effectiveUid, currentMonth, holidayYear]);

  const summary = useMemo(
    () =>
      computeLeaveSummary(leaves, {
        now: summaryNow,
        holidayDates: buildHolidayDateSet(holidays),
      }),
    [leaves, holidays, summaryNow],
  );

  const isLoading = authLoading || loading;

  // Late + overtime come from the daily_attendance listener.
  const lateCount = String(lateDaysCount).padStart(2, "0");
  const overtimeMins = overtimeMinsSum;

  // Leave card: full leaves only (util already excludes half-days from
  // `monthFullLeaveDays`).
  const leaveCount = String(summary.monthFullLeaveDays).padStart(2, "0");

  // Half Day card: union of half-day dates from leaves AND daily_attendance.
  // A date can only be one half-day, so a Set collapses any source overlap.
  const halfDayUnion = new Set<string>([
    ...summary.monthHalfDayDates,
    ...attendanceHalfDayDates,
  ]);
  const halfDaysCount = String(halfDayUnion.size).padStart(2, "0");

  return (
    <div className="w-full font-poppins">
      <div className="flex gap-2.5">
        {/* CARD 1: LATE */}
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

        {/* CARD 2: HALF DAY */}
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

        {/* CARD 3: LEAVE */}
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

        {/* CARD 4: OVERTIME */}
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
