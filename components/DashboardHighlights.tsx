// "use client";

// import { useEffect, useState } from "react";
// import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";

// interface MonthlySummary {
//   graceRemaining?: number; // In minutes (e.g. 28)
//   graceTotalAllowed?: number;
//   graceUsed?: number;
// }

// const DashboardHighlights = () => {
//   const { user, userData, loading: authLoading } = useAuth();
//   const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
//   const [totalLeaveDaysTaken, setTotalLeaveDaysTaken] = useState(0);
//   const [loadingSummary, setLoadingSummary] = useState(true);
//   const [loadingLeaves, setLoadingLeaves] = useState(true);

//   // Current Month String (e.g. "2026-08")
//   const currentMonth = new Date().toISOString().slice(0, 7);
//   // @ts-expect-error unknown
//   const annualQuota = userData?.leaves?.annualQuota ?? 24;

//   useEffect(() => {
//     if (!user) return;

//     // 1. Real-time listener for the employee's monthly grace bank
//     const summaryDocRef = doc(
//       db,
//       "monthly_summaries",
//       `${currentMonth}_${user.uid}`,
//     );

//     const unsubscribeSummary = onSnapshot(
//       summaryDocRef,
//       (docSnap) => {
//         if (docSnap.exists()) {
//           setMonthlyData(docSnap.data() as MonthlySummary);
//         } else {
//           // Default fallback (30 minutes)
//           setMonthlyData({
//             graceRemaining: 30,
//             graceTotalAllowed: 30,
//             graceUsed: 0,
//           });
//         }
//         setLoadingSummary(false);
//       },
//       (error) => {
//         console.error("Error fetching monthly summary:", error);
//         setLoadingSummary(false);
//       },
//     );

//     // 2. Real-time listener for `leaves` collection to calculate accurate balance
//     const leavesQuery = query(
//       collection(db, "leaves"),
//       where("userId", "==", user.uid),
//     );

//     const unsubscribeLeaves = onSnapshot(
//       leavesQuery,
//       (snapshot) => {
//         let totalDays = 0;
//         snapshot.forEach((docSnap) => {
//           const data = docSnap.data();
//           if (data.status === "approved") {
//             totalDays += Number(data.totalDays || 0);
//           }
//         });

//         setTotalLeaveDaysTaken(totalDays);
//         setLoadingLeaves(false);
//       },
//       (error) => {
//         console.error("Error calculating leave balance:", error);
//         setLoadingLeaves(false);
//       },
//     );

//     return () => {
//       unsubscribeSummary();
//       unsubscribeLeaves();
//     };
//   }, [user, currentMonth]);

//   const isLoading = authLoading || loadingSummary || loadingLeaves;

//   // 1. Calculate Minutes & Seconds for "Time Remaining"
//   const rawGraceMinutes = monthlyData?.graceRemaining ?? 30;
//   const graceMins = Math.floor(rawGraceMinutes);
//   const graceSecs = Math.round((rawGraceMinutes - graceMins) * 60);

//   const formattedMins = String(graceMins).padStart(2, "0");
//   const formattedSecs = String(graceSecs).padStart(2, "0");

//   // 2. Calculate Accurate Leave Balance from `leaves` collection
//   const remainingLeaveDays = Math.max(0, annualQuota - totalLeaveDaysTaken);
//   const formattedLeave = String(remainingLeaveDays).padStart(2, "0");

//   return (
//     <div className="text-black">
//       {/* Section Header */}
//       <span className="text-[10px] opacity-50 font-normal">Highlights</span>

//       {/* 2-Card Grid */}
//       <div className="flex items-stretch justify-between mt-3 text-center gap-3">
//         {/* =========================================
//             CARD 1: TIME REMAINING (00 : 28)
//         ========================================= */}
//         <div className="border border-[#E5DEC9] bg-transparent py-5 px-3 flex flex-col items-center justify-between text-center flex-1">
//           <h4 className="font-calSans text-[12px] tracking-wide">
//             Time Remaining
//           </h4>

//           {isLoading ? (
//             <div className="h-14 w-28 bg-[#E5DEC9]/50 animate-pulse my-auto rounded" />
//           ) : (
//             <div className="flex flex-col items-center my-auto">
//               {/* Numbers Display */}
//               <div className="flex items-center justify-center gap-1 font-calSans text-brand-orange text-[48px] md:text-[54px] leading-none tracking-wider">
//                 <span className="text-center">{formattedMins}</span>
//                 <span className="pb-1.5">:</span>
//                 <span className="text-center">{formattedSecs}</span>
//               </div>

//               {/* Sub-labels (minutes & secs) */}
//               <div className="flex items-center justify-between w-full text-[10px] opacity-50 tracking-tight">
//                 <span className="w-14 text-center">minutes</span>
//                 <span className="opacity-0 px-0.5">:</span>
//                 <span className="w-14 text-center">secs</span>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* =========================================
//             CARD 2: LEAVE BALANCE (e.g. 21)
//         ========================================= */}
//         <div className="border border-[#E5DEC9] bg-transparent py-5 px-5 flex flex-col items-center justify-between text-center">
//           <h4 className="font-calSans text-[12px] tracking-wide">
//             Leave Balance
//           </h4>

//           {isLoading ? (
//             <div className="h-14 w-16 bg-[#E5DEC9]/50 animate-pulse my-auto rounded" />
//           ) : (
//             <div className="flex flex-col items-center my-auto">
//               {/* Dynamically Computed Remaining Leaves */}
//               <h3 className="font-calSans text-brand-orange text-[48px] md:text-[54px] leading-none tracking-wider">
//                 {formattedLeave}
//               </h3>
//             </div>
//           )}

//           {/* Subtext */}
//           <span className="text-[10px] opacity-50 tracking-tight">
//             Days out {annualQuota} days
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DashboardHighlights;

// -------------------------------------------------------------

"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  computeLeaveSummary,
  formatLeaveDays,
  buildHolidayDateSet,
  type LeaveDoc,
} from "@/lib/leaveCalc";

interface MonthlySummary {
  graceRemaining?: number;
  graceTotalAllowed?: number;
  graceUsed?: number;
}

const DashboardHighlights = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
  const [leaves, setLeaves] = useState<LeaveDoc[]>([]);
  const [holidays, setHolidays] = useState<Array<{ date?: string }>>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = currentMonth.slice(0, 4);

  const annualQuota = userData?.leaves?.annualQuota ?? 24;

  useEffect(() => {
    if (!user) return;

    // 1. Monthly grace summary
    const summaryDocRef = doc(
      db,
      "monthly_summaries",
      `${currentMonth}_${user.uid}`,
    );
    const unsubSummary = onSnapshot(
      summaryDocRef,
      (snap) => {
        if (snap.exists()) {
          setMonthlyData(snap.data() as MonthlySummary);
        } else {
          setMonthlyData({
            graceRemaining: 30,
            graceTotalAllowed: 30,
            graceUsed: 0,
          });
        }
        setLoadingSummary(false);
      },
      (err) => {
        console.error("Error fetching monthly summary:", err);
        setLoadingSummary(false);
      },
    );

    // 2. All leaves for this user (util filters by year internally)
    const leavesQuery = query(
      collection(db, "leaves"),
      where("userId", "==", user.uid),
    );
    const unsubLeaves = onSnapshot(
      leavesQuery,
      (snap) => {
        const arr: LeaveDoc[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as LeaveDoc) }));
        setLeaves(arr);
        setLoadingLeaves(false);
      },
      (err) => {
        console.error("Error fetching leaves:", err);
        setLoadingLeaves(false);
      },
    );

    // 3. Holidays for current year (for skip logic inside the util)
    const holidaysQuery = query(
      collection(db, "holidays"),
      where("month", ">=", `${currentYear}-01`),
      where("month", "<=", `${currentYear}-12`),
    );
    const unsubHolidays = onSnapshot(holidaysQuery, (snap) => {
      const arr: Array<{ date?: string }> = [];
      snap.forEach((d) => arr.push(d.data() as { date?: string }));
      setHolidays(arr);
    });

    return () => {
      unsubSummary();
      unsubLeaves();
      unsubHolidays();
    };
  }, [user, currentMonth, currentYear]);

  const summary = useMemo(
    () =>
      computeLeaveSummary(leaves, {
        annualQuota,
        holidayDates: buildHolidayDateSet(holidays),
      }),
    [leaves, holidays, annualQuota],
  );

  const isLoading = authLoading || loadingSummary || loadingLeaves;

  // --- Grace minutes display ---
  const rawGraceMinutes = monthlyData?.graceRemaining ?? 30;
  const graceMins = Math.floor(rawGraceMinutes);
  const graceSecs = Math.round((rawGraceMinutes - graceMins) * 60);
  const formattedMins = String(graceMins).padStart(2, "0");
  const formattedSecs = String(graceSecs).padStart(2, "0");

  // --- Leave balance (year-remaining, matches LeaveStats) ---
  const formattedLeave = formatLeaveDays(summary.yearRemaining);

  return (
    <div className="text-black">
      <span className="text-[10px] opacity-50 font-normal">Highlights</span>

      <div className="flex items-stretch justify-between mt-3 text-center gap-3">
        {/* CARD 1: Time Remaining (grace minutes) — unchanged */}
        <div className="border border-[#E5DEC9] bg-transparent py-5 px-3 flex flex-col items-center justify-between text-center flex-1">
          <h4 className="font-calSans text-[12px] tracking-wide">
            Time Remaining
          </h4>
          {isLoading ? (
            <div className="h-14 w-28 bg-[#E5DEC9]/50 animate-pulse my-auto rounded" />
          ) : (
            <div className="flex flex-col items-center my-auto">
              <div className="flex items-center justify-center gap-1 font-calSans text-brand-orange text-[48px] md:text-[54px] leading-none tracking-wider">
                <span className="text-center">{formattedMins}</span>
                <span className="pb-1.5">:</span>
                <span className="text-center">{formattedSecs}</span>
              </div>
              <div className="flex items-center justify-between w-full text-[10px] opacity-50 tracking-tight">
                <span className="w-14 text-center">minutes</span>
                <span className="opacity-0 px-0.5">:</span>
                <span className="w-14 text-center">secs</span>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: Leave Balance (year-remaining) */}
        <div className="border border-[#E5DEC9] bg-transparent py-5 px-5 flex flex-col items-center justify-between text-center">
          <h4 className="font-calSans text-[12px] tracking-wide">
            Leave Balance
          </h4>
          {isLoading ? (
            <div className="h-14 w-16 bg-[#E5DEC9]/50 animate-pulse my-auto rounded" />
          ) : (
            <div className="flex flex-col items-center my-auto">
              <h3 className="font-calSans text-brand-orange text-[48px] md:text-[54px] leading-none tracking-wider">
                {formattedLeave}
              </h3>
            </div>
          )}
          <span className="text-[10px] opacity-50 tracking-tight">
            Days out {annualQuota} days
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHighlights;
