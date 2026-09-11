// "use client";

// import { useEffect, useState } from "react";
// import { collection, query, where, onSnapshot } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";

// interface LeaveItem {
//   id: string;
//   leaveType: string;
//   startDate: string;
//   endDate: string;
//   totalDays: number;
// }

// const LeaveHistory = () => {
//   const { user } = useAuth();
//   const [leaves, setLeaves] = useState<LeaveItem[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!user) return;

//     // Read directly from the `leaves` collection for this employee
//     const q = query(collection(db, "leaves"), where("userId", "==", user.uid));

//     const unsubscribe = onSnapshot(
//       q,
//       (snapshot) => {
//         const fetched: LeaveItem[] = [];
//         snapshot.forEach((docSnap) => {
//           const data = docSnap.data() as Omit<LeaveItem, "id"> & {
//             status?: string;
//           };

//           if (data.status === "approved") {
//             fetched.push({
//               id: docSnap.id,
//               ...(docSnap.data() as Omit<LeaveItem, "id">),
//             });
//           }
//         });

//         // Sort newest first
//         fetched.sort((a, b) =>
//           (b.startDate || "").localeCompare(a.startDate || ""),
//         );
//         setLeaves(fetched);
//         setLoading(false);
//       },
//       (error) => {
//         console.error("Error fetching leave history:", error);
//         setLoading(false);
//       },
//     );

//     return () => unsubscribe();
//   }, [user]);

//   const formatDate = (dateStr: string) => {
//     if (!dateStr) return "";
//     const [year, month, day] = dateStr.split("-");
//     return `${month}/${day}/${year}`;
//   };

//   const formatDisplayDate = (start: string, end: string) => {
//     const formattedStart = formatDate(start);
//     if (!end || start === end) return formattedStart;
//     return `${formattedStart} - ${formatDate(end)}`;
//   };

//   return (
//     <div className="w-full font-poppins mt-6 text-black pb-10">
//       <span className="text-[10px] text-[#8C827A] font-normal block mb-2">
//         Leaves History
//       </span>

//       <div className="border border-[#E5DEC9] bg-transparent overflow-hidden">
//         {loading ? (
//           <div className="p-6 space-y-4 animate-pulse">
//             <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
//             <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
//           </div>
//         ) : leaves.length === 0 ? (
//           <div className="p-8 text-center text-xs text-[#8C827A]">
//             No leave records found yet.
//           </div>
//         ) : (
//           <div className="divide-y divide-[#E5DEC9]">
//             {leaves.map((item) => (
//               <div
//                 key={item.id}
//                 className="grid grid-cols-12 items-center px-5 py-4 gap-2 text-[10px]"
//               >
//                 {/* Column 1: Leave Type */}
//                 <div className="col-span-4 font-semibold text-[#231F20] tracking-wide">
//                   {item.leaveType}
//                 </div>

//                 {/* Column 2: Date Range */}
//                 <div className="col-span-5 text-[#8C827A] font-light text-center md:text-left">
//                   <span className="text-[8px]">
//                     {formatDisplayDate(item.startDate, item.endDate)}
//                   </span>
//                 </div>

//                 {/* Column 3: Total Days */}
//                 <div className="col-span-3 text-right font-semibold text-[#231F20]">
//                   {item.totalDays} {item.totalDays === 1 ? "Day" : "Days"}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LeaveHistory;

// ------------------------------------------------------------------

"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface LeaveItem {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}

// Helper to parse "YYYY-MM-DD" safely without timezone/UTC offset glitches
const parseDateParts = (dStr: string) => {
  const [y, m, d] = dStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Count calendar days between two "YYYY-MM-DD" strings (inclusive)
const countDaysBetween = (startStr: string, endStr: string) => {
  const d1 = parseDateParts(startStr);
  const d2 = parseDateParts(endStr);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const LeaveHistory = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Current month string "YYYY-MM" (e.g. "2026-09")
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  // Boundaries of the current month (e.g. "2026-09-01" and "2026-09-30")
  const { monthStartStr, monthEndStr } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      monthStartStr: `${currentMonthStr}-01`,
      monthEndStr: `${currentMonthStr}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [currentMonthStr]);

  // Display title: e.g. "September 2026"
  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(collection(db, "leaves"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: LeaveItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          if (data.status === "approved") {
            const rawStart = data.startDate || "";
            const rawEnd = data.endDate || rawStart;

            if (!rawStart) return;

            const isHalfDay =
              data.leaveType === "Half Day" ||
              data.durationType === "half" ||
              Number(data.totalDays) === 0.5;

            // 1. Check if leave range overlaps with the current month
            const overlapsCurrentMonth =
              rawStart <= monthEndStr && rawEnd >= monthStartStr;

            if (overlapsCurrentMonth) {
              // 2. Clamp dates to current month boundaries
              // (e.g. Aug 31 -> Sept 01, or Oct 03 -> Sept 30)
              const clampedStart =
                rawStart < monthStartStr ? monthStartStr : rawStart;
              const clampedEnd = rawEnd > monthEndStr ? monthEndStr : rawEnd;

              // 3. Recalculate days count for the clamped range
              const clampedDays = isHalfDay
                ? 0.5
                : countDaysBetween(clampedStart, clampedEnd);

              fetched.push({
                id: docSnap.id,
                leaveType: data.leaveType || "Leave",
                startDate: clampedStart,
                endDate: clampedEnd,
                totalDays: clampedDays,
              });
            }
          }
        });

        // Sort newest first
        fetched.sort((a, b) =>
          (b.startDate || "").localeCompare(a.startDate || ""),
        );
        setLeaves(fetched);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching leave history:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, currentMonthStr, monthStartStr, monthEndStr]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  };

  const formatDisplayDate = (start: string, end: string) => {
    const formattedStart = formatDate(start);
    if (!end || start === end) return formattedStart;
    return `${formattedStart} - ${formatDate(end)}`;
  };

  return (
    <div className="w-full font-poppins mt-6 text-black pb-10">
      {/* Section Header with Current Month */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#8C827A] font-normal">
          Leaves History
        </span>
        <span className="text-[10px] text-[#8C827A] opacity-75 font-light">
          {currentMonthName}
        </span>
      </div>

      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C827A]">
            No leave records for {currentMonthName}.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {leaves.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center px-5 py-4 gap-2 text-[10px]"
              >
                {/* Column 1: Leave Type */}
                <div className="col-span-4 font-semibold text-[#231F20] tracking-wide">
                  {item.leaveType}
                </div>

                {/* Column 2: Date Range (Clamped to Current Month) */}
                <div className="col-span-5 text-[#8C827A] font-light text-center md:text-left">
                  <span className="text-[8px]">
                    {formatDisplayDate(item.startDate, item.endDate)}
                  </span>
                </div>

                {/* Column 3: Total Days (Clamped to Current Month) */}
                <div className="col-span-3 text-right font-semibold text-[#231F20]">
                  {item.totalDays} {item.totalDays === 1 ? "Day" : "Days"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistory;
