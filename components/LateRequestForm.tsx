// "use client";

// import { useState } from "react";
// import { ChevronDown, Loader2 } from "lucide-react";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";
// import LeaveFormSuccessModal from "@/components/LeaveFormSuccessModal";

// const COMMON_TIMES = [
//   "09:15 AM",
//   "09:30 AM",
//   "09:45 AM",
//   "10:00 AM",
//   "10:15 AM",
//   "10:30 AM",
//   "11:00 AM",
//   "11:30 AM",
// ];

// const LateRequestForm = () => {
//   const { user, userData } = useAuth();
//   const [date, setDate] = useState("");
//   const [newArrivalTime, setNewArrivalTime] = useState("10:00 AM");
//   const [reason, setReason] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");
//   const [showSuccessModal, setShowSuccessModal] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!user) return;
//     setLoading(true);
//     setErrorMsg("");

//     try {
//       // Writes directly to `late_arrivals` collection
//       await addDoc(collection(db, "late_arrivals"), {
//         userId: user.uid,
//         name: userData?.name || "Employee",
//         date: date, // "2026-08-11"
//         newArrivalTime: newArrivalTime, // "10:00 AM"
//         reason: reason,
//         status: "pending", // "pending" | "approved" | "denied"
//         createdAt: serverTimestamp(),
//       });

//       // Clear inputs
//       setDate("");
//       setNewArrivalTime("10:00 AM");
//       setReason("");

//       // Trigger success modal
//       setShowSuccessModal(true);
//     } catch (error: unknown) {
//       console.error("Error submitting late request:", error);
//       setErrorMsg(
//         // @ts-expect-error random
//         error?.message || "Failed to submit late request. Please try again.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       <div className="w-full font-poppins text-black">
//         {/* Outer Form Card */}
//         <div className="border border-[#E5DEC9] p-5">
//           <form onSubmit={handleSubmit} className="flex flex-col gap-5">
//             {/* Header Box */}
//             <div className="border border-[#E5DEC9] bg-transparent py-3 text-center rounded-xs">
//               <span className="text-sm md:text-base font-medium text-[#231F20] tracking-wide">
//                 Late Request
//               </span>
//             </div>

//             {/* Error Message */}
//             {errorMsg && (
//               <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2.5 rounded text-center">
//                 {errorMsg}
//               </div>
//             )}

//             {/* 1. Date Field */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[11px] text-[#8C827A] font-normal">
//                 Date
//               </label>
//               <div className="border border-[#E5DEC9] px-3.5 py-3 rounded-xs">
//                 <input
//                   type="date"
//                   value={date}
//                   onChange={(e) => setDate(e.target.value)}
//                   required
//                   className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer"
//                 />
//               </div>
//             </div>

//             {/* 2. New Arrival Time */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[11px] text-[#8C827A] font-normal">
//                 New Arrival Time
//               </label>

//               <div className="relative flex items-center border border-[#E5DEC9] py-3 rounded-xs">
//                 <select
//                   value={newArrivalTime}
//                   onChange={(e) => setNewArrivalTime(e.target.value)}
//                   className="w-full bg-transparent text-xs text-[#231F20] appearance-none focus:outline-none cursor-pointer px-3.5"
//                 >
//                   {COMMON_TIMES.map((timeOption) => (
//                     <option
//                       key={timeOption}
//                       value={timeOption}
//                       className="bg-background text-[#231F20]"
//                     >
//                       {timeOption}
//                     </option>
//                   ))}
//                 </select>
//                 <ChevronDown className="w-4 h-4 text-[#231F20] pointer-events-none absolute right-3" />
//               </div>
//             </div>

//             {/* 3. Reason for Being Late */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[11px] text-[#8C827A] font-normal">
//                 Reason of being late
//               </label>
//               <textarea
//                 rows={3}
//                 placeholder="Write description"
//                 value={reason}
//                 onChange={(e) => setReason(e.target.value)}
//                 required
//                 className="w-full border border-[#E5DEC9] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs resize-none"
//               />
//             </div>

//             {/* 4. Submit Button */}
//             <div className="flex justify-center mt-2">
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="bg-brand-orange text-white text-sm font-medium py-3 px-12 rounded-xs shadow-xs transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer tracking-wide flex items-center gap-2 disabled:opacity-70"
//               >
//                 {loading ? (
//                   <>
//                     <Loader2 className="w-4 h-4 animate-spin" />
//                     <span>Submitting...</span>
//                   </>
//                 ) : (
//                   <span>Submit</span>
//                 )}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>

//       {/* Success Modal */}
//       {showSuccessModal && (
//         <LeaveFormSuccessModal
//           isOpen={showSuccessModal}
//           onClose={() => setShowSuccessModal(false)}
//         />
//       )}
//     </>
//   );
// };

// export default LateRequestForm;

// ---------------------------------------------------------------------

"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import LeaveFormSuccessModal from "@/components/LeaveFormSuccessModal";

const COMMON_TIMES = [
  "09:15 AM",
  "09:30 AM",
  "09:45 AM",
  "10:00 AM",
  "10:15 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
];

const MAX_LATE_REQUESTS_PER_MONTH = 2;

const LateRequestForm = () => {
  const { user, userData } = useAuth();
  const [date, setDate] = useState("");
  const [newArrivalTime, setNewArrivalTime] = useState("10:00 AM");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingQuota, setCheckingQuota] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Store all active requests for counting
  const [monthRequests, setMonthRequests] = useState<
    { id: string; date: string; status: string }[]
  >([]);

  // Current month string "YYYY-MM" (defaults to current date or selected date's month)
  const targetMonth = useMemo(() => {
    if (date) return date.slice(0, 7);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, [date]);

  // 1. Real-time listener for this user's late arrivals
  useEffect(() => {
    if (!user) return;
    setCheckingQuota(true);

    const q = query(
      collection(db, "late_arrivals"),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: { id: string; date: string; status: string }[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Only count approved and pending (ignore denied)
          if (data.status === "approved" || data.status === "pending") {
            records.push({
              id: docSnap.id,
              date: data.date || "",
              status: data.status,
            });
          }
        });
        setMonthRequests(records);
        setCheckingQuota(false);
      },
      (err) => {
        console.error("Error fetching late requests quota:", err);
        setCheckingQuota(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Calculate requests used for the target month
  const activeCountForMonth = useMemo(() => {
    return monthRequests.filter((r) => r.date.startsWith(targetMonth)).length;
  }, [monthRequests, targetMonth]);

  const approvedCount = useMemo(() => {
    return monthRequests.filter(
      (r) => r.date.startsWith(targetMonth) && r.status === "approved",
    ).length;
  }, [monthRequests, targetMonth]);

  const pendingCount = useMemo(() => {
    return monthRequests.filter(
      (r) => r.date.startsWith(targetMonth) && r.status === "pending",
    ).length;
  }, [monthRequests, targetMonth]);

  // Limit reached when approved + pending >= 2
  const isLimitReached = activeCountForMonth >= MAX_LATE_REQUESTS_PER_MONTH;

  // 3. Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (isLimitReached) {
      setErrorMsg(
        `You have already reached the maximum limit of ${MAX_LATE_REQUESTS_PER_MONTH} late arrival requests for this month.`,
      );
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await addDoc(collection(db, "late_arrivals"), {
        userId: user.uid,
        name: userData?.name || "Employee",
        date: date,
        month: targetMonth,
        newArrivalTime: newArrivalTime,
        reason: reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Clear inputs
      setDate("");
      setNewArrivalTime("10:00 AM");
      setReason("");

      // Trigger success modal
      setShowSuccessModal(true);
    } catch (error: unknown) {
      console.error("Error submitting late request:", error);
      setErrorMsg(
        // @ts-expect-error random
        error?.message || "Failed to submit late request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full font-poppins text-black">
        {/* Outer Form Card */}
        <div className="border border-[#E5DEC9] p-5 relative">
          {/* Quota Tracker Indicator */}
          <div className="flex items-center justify-between text-[11px] mb-4 pb-3 border-b border-[#E5DEC9]">
            <span className="text-[#8C827A]">
              Monthly Quota:{" "}
              <b className="text-[#231F20]">
                {activeCountForMonth} / {MAX_LATE_REQUESTS_PER_MONTH} used
              </b>
            </span>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="text-[10px] bg-brand-orange/15 text-brand-orange px-2 py-0.5 rounded-xs font-medium">
                  {pendingCount} Pending
                </span>
              )}
              {approvedCount > 0 && (
                <span className="text-[10px] bg-green-600/15 text-green-700 px-2 py-0.5 rounded-xs font-medium">
                  {approvedCount} Approved
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Header Box */}
            <div className="border border-[#E5DEC9] bg-transparent py-3 text-center rounded-xs">
              <span className="text-sm md:text-base font-medium text-[#231F20] tracking-wide">
                Late Request
              </span>
            </div>

            {/* Quota Limit Warning Banner */}
            {/* {isLimitReached && (
              <div className="bg-[#D64545]/10 border border-[#D64545]/30 text-[#D64545] text-xs px-3.5 py-3 rounded-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold">Monthly limit reached (2/2)</p>
                </div>
              </div>
            )} */}

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2.5 rounded text-center">
                {errorMsg}
              </div>
            )}

            {/* 1. Date Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#8C827A] font-normal">
                Date
              </label>
              <div
                className={`border border-[#E5DEC9] px-3.5 py-3 rounded-xs ${
                  isLimitReached ? "opacity-50" : ""
                }`}
              >
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={isLimitReached || loading || checkingQuota}
                  className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* 2. New Arrival Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#8C827A] font-normal">
                New Arrival Time
              </label>

              <div
                className={`relative flex items-center border border-[#E5DEC9] py-3 rounded-xs ${
                  isLimitReached ? "opacity-50" : ""
                }`}
              >
                <select
                  value={newArrivalTime}
                  onChange={(e) => setNewArrivalTime(e.target.value)}
                  disabled={isLimitReached || loading || checkingQuota}
                  className="w-full bg-transparent text-xs text-[#231F20] appearance-none focus:outline-none cursor-pointer px-3.5 disabled:cursor-not-allowed"
                >
                  {COMMON_TIMES.map((timeOption) => (
                    <option
                      key={timeOption}
                      value={timeOption}
                      className="bg-background text-[#231F20]"
                    >
                      {timeOption}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#231F20] pointer-events-none absolute right-3" />
              </div>
            </div>

            {/* 3. Reason for Being Late */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#8C827A] font-normal">
                Reason of being late
              </label>
              <textarea
                rows={3}
                placeholder={
                  isLimitReached
                    ? "Monthly quota reached."
                    : "Write description"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                disabled={isLimitReached || loading || checkingQuota}
                className="w-full border border-[#E5DEC9] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* 4. Submit Button */}
            <div className="flex justify-center mt-2">
              <button
                type="submit"
                disabled={isLimitReached || loading || checkingQuota}
                className="bg-brand-orange text-white text-sm font-medium py-3 px-12 rounded-xs shadow-xs transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer tracking-wide flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-orange"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : isLimitReached ? (
                  <span>Limit Reached (2/2)</span>
                ) : (
                  <span>Submit</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <LeaveFormSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </>
  );
};

export default LateRequestForm;
