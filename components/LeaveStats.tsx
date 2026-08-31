// "use client";

// import { useAuth } from "@/context/AuthContext";

// const LeaveStats = () => {
//   const { userData, loading } = useAuth();

//   //   console.log(userData);

//   // Extract real leave values from AuthContext
//   // @ts-expect-error unknown
//   const leavesTaken = String(userData?.leaves?.used ?? 0).padStart(2, "0");
//   // @ts-expect-error unknown
//   const leavesRemaining = String(userData?.leaves?.remaining ?? 24).padStart(
//     2,
//     "0",
//   );
//   const unpaidLeaves = "02"; // Placeholder for now (admin managed)

//   return (
//     <div className="w-full font-poppins">
//       <div className="grid grid-cols-3 gap-3">
//         {/* =========================================
//             CARD 1: LEAVES TAKEN (DARK TEAL)
//         ========================================= */}
//         <div className="bg-[#4E7B80] py-3 px-2 flex flex-col items-center justify-between text-center text-white gap-1.5">
//           <span className="text-[8px] font-normal tracking-wide opacity-95">
//             Leaves Taken
//           </span>

//           {loading ? (
//             <div className="h-10 w-12 bg-white/20 animate-pulse rounded my-auto" />
//           ) : (
//             <h3 className="font-calSans text-[#FAF7F2] text-[40px] md:text-[48px] leading-none tracking-wider my-auto">
//               {leavesTaken}
//             </h3>
//           )}
//         </div>

//         {/* =========================================
//             CARD 2: LEAVES REMAINING (MUTED SAGE TEAL)
//         ========================================= */}
//         <div className="bg-[#4E7B80]/60 py-3 px-2 flex flex-col items-center justify-between text-center text-white gap-1.5">
//           <span className="text-[8px] font-normal tracking-wide opacity-95">
//             Leaves Remaining
//           </span>

//           {loading ? (
//             <div className="h-10 w-12 bg-white/20 animate-pulse rounded my-auto" />
//           ) : (
//             <h3 className="font-calSans text-[#FAF7F2] text-[40px] md:text-[48px] leading-none tracking-wider my-auto">
//               {leavesRemaining}
//             </h3>
//           )}
//         </div>

//         {/* =========================================
//             CARD 3: UNPAID LEAVES (CORAL RED)
//         ========================================= */}
//         <div className="bg-[#E14948] py-3 px-2 flex flex-col items-center justify-between text-center text-white gap-1.5">
//           <span className="text-[8px] font-normal tracking-wide opacity-95">
//             Unpaid Leaves
//           </span>

//           {loading ? (
//             <div className="h-10 w-12 bg-white/20 animate-pulse rounded my-auto" />
//           ) : (
//             <h3 className="font-calSans text-[#FAF7F2] text-[40px] md:text-[48px] leading-none tracking-wider my-auto">
//               {unpaidLeaves}
//             </h3>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LeaveStats;

// -------------------------------------------------------------------------------------

"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const LeaveStats = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const [totalDaysTaken, setTotalDaysTaken] = useState(0);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  // @ts-expect-error random
  const annualQuota = userData?.leaves?.annualQuota ?? 24;

  useEffect(() => {
    if (!user) return;

    // Listen to the employee's approved/submitted leaves in the `leaves` collection
    const q = query(collection(db, "leaves"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Sum up total days from all leave entries
          if (data.status === "approved") {
            total += Number(data.totalDays || 0);
          }
        });

        setTotalDaysTaken(total);
        setLoadingLeaves(false);
      },
      (error) => {
        console.error("Error calculating leave stats:", error);
        setLoadingLeaves(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const isLoading = authLoading || loadingLeaves;

  // 1. Calculate Leaves Taken
  const leavesTakenStr = String(totalDaysTaken).padStart(2, "0");

  // 2. Calculate Leaves Remaining (e.g. 24 - 4 = 20)
  const remainingDays = Math.max(0, annualQuota - totalDaysTaken);
  const leavesRemainingStr = String(remainingDays).padStart(2, "0");

  // 3. Calculate Unpaid Leaves (Any leaves taken beyond 24 days)
  const unpaidDays = Math.max(0, totalDaysTaken - annualQuota);
  const unpaidLeavesStr = String(unpaidDays).padStart(2, "0");

  return (
    <div className="w-full font-poppins">
      <div className="grid grid-cols-3 gap-3">
        {/* =========================================
            CARD 1: LEAVES TAKEN (DARK TEAL)
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
            CARD 2: LEAVES REMAINING (MUTED SAGE TEAL)
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
            CARD 3: UNPAID LEAVES (CORAL RED)
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
