// "use client";

// import { useState, useEffect } from "react";
// import { useSearchParams } from "next/navigation";
// import { ChevronDown, Loader2 } from "lucide-react";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";
// import LeaveFormSuccessModal from "@/components/LeaveFormSuccessModal";

// const LEAVE_TYPES = [
//   "Planned Leave",
//   "Casual Leave",
//   "Sick Leave",
//   "Emergency Leave",
//   "Unpaid Leave",
// ];

// const LeaveRequestForm = () => {
//   const { user, userData } = useAuth();
//   const searchParams = useSearchParams();
//   const typeParam = searchParams.get("type"); // "half" | "single" | "multiple"

//   const [leaveDuration, setLeaveDuration] = useState<
//     "single" | "multiple" | "half"
//   >(() => (typeParam === "half" ? "half" : "single"));

//   // Sync state if user navigates with query params
//   useEffect(() => {
//     if (
//       typeParam === "half" ||
//       typeParam === "multiple" ||
//       typeParam === "single"
//     ) {
//       setLeaveDuration(typeParam);
//     }
//   }, [typeParam]);

//   const [singleDate, setSingleDate] = useState("");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [fromTime, setFromTime] = useState("09:00");
//   const [toTime, setToTime] = useState("13:00");
//   const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
//   const [remarks, setRemarks] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");
//   const [showSuccessModal, setShowSuccessModal] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!user) return;
//     setLoading(true);
//     setErrorMsg("");

//     let start = "";
//     let end = "";
//     let totalDays = 1;
//     let finalLeaveType = leaveType;

//     if (leaveDuration === "half") {
//       start = singleDate;
//       end = singleDate;
//       totalDays = 0.5;
//       finalLeaveType = "Half Day";
//     } else if (leaveDuration === "single") {
//       start = singleDate;
//       end = singleDate;
//       totalDays = 1;
//     } else {
//       start = startDate;
//       end = endDate;
//       const d1 = new Date(start);
//       const d2 = new Date(end);
//       const diffTime = Math.abs(d2.getTime() - d1.getTime());
//       totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
//     }

//     try {
//       await addDoc(collection(db, "leaves"), {
//         userId: user.uid,
//         name: userData?.name || "Employee",
//         durationType: leaveDuration,
//         startDate: start,
//         endDate: end,
//         totalDays: totalDays,
//         leaveType: finalLeaveType,
//         fromTime: leaveDuration === "half" ? fromTime : null,
//         toTime: leaveDuration === "half" ? toTime : null,
//         remarks: remarks,
//         status: "pending",
//         createdAt: serverTimestamp(),
//       });

//       // Clear form inputs
//       setSingleDate("");
//       setStartDate("");
//       setEndDate("");
//       setFromTime("09:00");
//       setToTime("13:00");
//       setRemarks("");

//       // Open Success Modal
//       setShowSuccessModal(true);
//     } catch (error: unknown) {
//       console.error("Error submitting leave request:", error);
//       setErrorMsg(
//         // @ts-expect-error unknown
//         error?.message || "Failed to submit leave request. Please try again.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       <div className="w-full font-poppins">
//         <div className="border border-[#E5DEC9] py-5 px-2.5">
//           <form onSubmit={handleSubmit} className="flex flex-col gap-5">
//             {/* Error Message Banner */}
//             {errorMsg && (
//               <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2.5 rounded text-center">
//                 {errorMsg}
//               </div>
//             )}

//             {/* 1. Duration Toggle (3 Tabs) */}
//             <div className="grid grid-cols-3 gap-2">
//               <button
//                 type="button"
//                 onClick={() => setLeaveDuration("single")}
//                 className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
//                   leaveDuration === "single"
//                     ? "bg-[#457375] text-white border-[#457375]"
//                     : "bg-transparent text-[#457375] border-[#E5DEC9]"
//                 }`}
//               >
//                 Single Day
//               </button>

//               <button
//                 type="button"
//                 onClick={() => setLeaveDuration("multiple")}
//                 className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
//                   leaveDuration === "multiple"
//                     ? "bg-[#457375] text-white border-[#457375]"
//                     : "bg-transparent text-[#457375] border-[#E5DEC9]"
//                 }`}
//               >
//                 Multiple Days
//               </button>

//               <button
//                 type="button"
//                 onClick={() => setLeaveDuration("half")}
//                 className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
//                   leaveDuration === "half"
//                     ? "bg-[#457375] text-white border-[#457375]"
//                     : "bg-transparent text-[#457375] border-[#E5DEC9]"
//                 }`}
//               >
//                 Half Day
//               </button>
//             </div>

//             {/* 2. Dates */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[11px] text-[#8C827A] font-normal">
//                 {leaveDuration === "multiple" ? "Dates" : "Date"}
//               </label>

//               {leaveDuration === "single" || leaveDuration === "half" ? (
//                 <div className="border border-[#E5DEC9] px-3.5 py-3 rounded-xs">
//                   <input
//                     type="date"
//                     value={singleDate}
//                     onChange={(e) => setSingleDate(e.target.value)}
//                     required
//                     className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer"
//                   />
//                 </div>
//               ) : (
//                 <div className="grid grid-cols-2 gap-2">
//                   <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
//                     <span className="text-[9px] text-[#8C827A]">From</span>
//                     <input
//                       type="date"
//                       value={startDate}
//                       onChange={(e) => setStartDate(e.target.value)}
//                       required
//                       className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
//                     />
//                   </div>

//                   <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
//                     <span className="text-[9px] text-[#8C827A]">To</span>
//                     <input
//                       type="date"
//                       value={endDate}
//                       min={startDate}
//                       onChange={(e) => setEndDate(e.target.value)}
//                       required
//                       className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* 3. Type of Leave OR Half Day Time Select */}
//             {leaveDuration === "half" ? (
//               /* Half Day Time Range */
//               <div className="flex flex-col gap-1.5">
//                 <label className="text-[11px] text-[#8C827A] font-normal">
//                   Time Range
//                 </label>

//                 <div className="grid grid-cols-2 gap-2">
//                   <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
//                     <span className="text-[9px] text-[#8C827A]">From Time</span>
//                     <input
//                       type="time"
//                       value={fromTime}
//                       onChange={(e) => setFromTime(e.target.value)}
//                       required
//                       className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
//                     />
//                   </div>

//                   <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
//                     <span className="text-[9px] text-[#8C827A]">To Time</span>
//                     <input
//                       type="time"
//                       value={toTime}
//                       onChange={(e) => setToTime(e.target.value)}
//                       required
//                       className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
//                     />
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               /* Standard Type of Leave Dropdown */
//               <div className="flex flex-col gap-1.5">
//                 <label className="text-[11px] text-[#8C827A] font-normal">
//                   Type of Leave
//                 </label>

//                 <div className="relative flex items-center border border-[#E5DEC9] py-3 rounded-xs">
//                   <select
//                     value={leaveType}
//                     onChange={(e) => setLeaveType(e.target.value)}
//                     className="w-full bg-transparent text-xs text-[#231F20] appearance-none focus:outline-none cursor-pointer px-3.5 select-none"
//                   >
//                     {LEAVE_TYPES.map((type) => (
//                       <option
//                         key={type}
//                         value={type}
//                         className="bg-brand-cream text-[#231F20]"
//                       >
//                         {type}
//                       </option>
//                     ))}
//                   </select>
//                   <ChevronDown className="w-4 h-4 text-[#231F20] pointer-events-none absolute right-3" />
//                 </div>
//               </div>
//             )}

//             {/* 4. Remarks */}
//             <div className="flex flex-col gap-1.5">
//               <label className="text-[11px] text-[#8C827A] font-normal">
//                 Remarks
//               </label>
//               <textarea
//                 rows={3}
//                 placeholder="Write description"
//                 value={remarks}
//                 onChange={(e) => setRemarks(e.target.value)}
//                 className="w-full border border-[#E5DEC9] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs resize-none"
//               />
//             </div>

//             {/* 5. Submit Button */}
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

// export default LeaveRequestForm;

// ----------------------------------------------------------------------------

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Loader2, Clock } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import LeaveFormSuccessModal from "@/components/LeaveFormSuccessModal";

const LEAVE_TYPES = [
  "Planned Leave",
  "Casual Leave",
  "Sick Leave",
  "Emergency Leave",
  "Unpaid Leave",
];

// Helper: Get local "YYYY-MM-DD" string (safe from UTC offset issues)
const getLocalDateString = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Helper: Safely parse "YYYY-MM-DD" to local Date
const parseDateParts = (dStr: string) => {
  const [y, m, d] = dStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const LeaveRequestForm = () => {
  const { user, userData } = useAuth();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type"); // "half" | "single" | "multiple"

  const [leaveDuration, setLeaveDuration] = useState<
    "single" | "multiple" | "half"
  >(() => (typeParam === "half" ? "half" : "single"));

  // Sync state if user navigates with query params
  useEffect(() => {
    if (
      typeParam === "half" ||
      typeParam === "multiple" ||
      typeParam === "single"
    ) {
      setLeaveDuration(typeParam);
    }
  }, [typeParam]);

  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("13:00");
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // =========================================================
  // 1. 8:00 AM CUTOFF LOGIC (APPLIES TO TODAY AS START DATE)
  // =========================================================
  const { isPast8AM, minAllowedDate, todayStr } = useMemo(() => {
    const now = new Date();
    const todayFormatted = getLocalDateString(now);
    const past8 = now.getHours() >= 8;

    if (past8) {
      // After 8:00 AM: Earliest selectable start date is Tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return {
        isPast8AM: true,
        minAllowedDate: getLocalDateString(tomorrow),
        todayStr: todayFormatted,
      };
    }

    // Before 8:00 AM: Today is selectable
    return {
      isPast8AM: false,
      minAllowedDate: todayFormatted,
      todayStr: todayFormatted,
    };
  }, []);

  // =========================================================
  // 2. MAXIMUM 4 CONSECUTIVE DAYS LOGIC FOR MULTIPLE DAYS
  // =========================================================
  const maxEndDate = useMemo(() => {
    if (!startDate) return "";
    const startObj = parseDateParts(startDate);
    // +3 days gives a 4-day inclusive span (e.g. 12th + 3 = 15th: 12, 13, 14, 15 = 4 days)
    startObj.setDate(startObj.getDate() + 3);
    return getLocalDateString(startObj);
  }, [startDate]);

  // Reset end date if start date changes and end date falls out of bounds
  useEffect(() => {
    if (leaveDuration === "multiple" && startDate) {
      if (
        endDate &&
        (endDate < startDate || (maxEndDate && endDate > maxEndDate))
      ) {
        setEndDate("");
      }
    }
  }, [startDate, maxEndDate, endDate, leaveDuration]);

  // Reset dates if cutoff passes while user was on the page
  useEffect(() => {
    if (singleDate && singleDate < minAllowedDate) {
      setSingleDate("");
    }
    if (startDate && startDate < minAllowedDate) {
      setStartDate("");
      setEndDate("");
    }
  }, [minAllowedDate, singleDate, startDate]);

  // =========================================================
  // 3. SUBMIT HANDLER
  // =========================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg("");

    let start = "";
    let end = "";
    let totalDays = 1;
    let finalLeaveType = leaveType;

    if (leaveDuration === "half") {
      start = singleDate;
      end = singleDate;
      totalDays = 0.5;
      finalLeaveType = "Half Day";

      if (start < todayStr) {
        setErrorMsg("You cannot apply for past dates.");
        setLoading(false);
        return;
      }
      if (start === todayStr && isPast8AM) {
        setErrorMsg(
          "Same-day half-day leave must be submitted before 8:00 AM. Please select tomorrow or a later date.",
        );
        setLoading(false);
        return;
      }
    } else if (leaveDuration === "single") {
      start = singleDate;
      end = singleDate;
      totalDays = 1;

      if (start < todayStr) {
        setErrorMsg("You cannot apply for past dates.");
        setLoading(false);
        return;
      }
      if (start === todayStr && isPast8AM) {
        setErrorMsg(
          "Same-day leave must be submitted before 8:00 AM. Please select tomorrow or a later date.",
        );
        setLoading(false);
        return;
      }
    } else {
      // Multiple Days
      start = startDate;
      end = endDate;

      if (!start || !end) {
        setErrorMsg("Please select both start and end dates.");
        setLoading(false);
        return;
      }

      if (start < todayStr) {
        setErrorMsg("You cannot apply for past dates.");
        setLoading(false);
        return;
      }

      // 8:00 AM cutoff if start date is today
      if (start === todayStr && isPast8AM) {
        setErrorMsg(
          "Multiple days leave starting today must be submitted before 8:00 AM. Please select tomorrow or a later start date.",
        );
        setLoading(false);
        return;
      }

      if (end < start) {
        setErrorMsg("End date cannot be earlier than start date.");
        setLoading(false);
        return;
      }

      // Calculate consecutive calendar days (including weekends and holidays)
      const d1 = parseDateParts(start);
      const d2 = parseDateParts(end);
      const diffTime = d2.getTime() - d1.getTime();
      const consecutiveDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (consecutiveDays > 4) {
        setErrorMsg(
          "Multiple days leave cannot exceed 4 consecutive days (including weekends and holidays).",
        );
        setLoading(false);
        return;
      }

      totalDays = consecutiveDays;
    }

    try {
      await addDoc(collection(db, "leaves"), {
        userId: user.uid,
        name: userData?.name || "Employee",
        durationType: leaveDuration,
        startDate: start,
        endDate: end,
        totalDays: totalDays,
        leaveType: finalLeaveType,
        fromTime: leaveDuration === "half" ? fromTime : null,
        toTime: leaveDuration === "half" ? toTime : null,
        remarks: remarks,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Clear form inputs
      setSingleDate("");
      setStartDate("");
      setEndDate("");
      setFromTime("09:00");
      setToTime("13:00");
      setRemarks("");

      // Open Success Modal
      setShowSuccessModal(true);
    } catch (error: unknown) {
      console.error("Error submitting leave request:", error);
      setErrorMsg(
        // @ts-expect-error unknown
        error?.message || "Failed to submit leave request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full font-poppins">
        <div className="border border-[#E5DEC9] py-5 px-2.5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Error Message Banner */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2.5 rounded text-center">
                {errorMsg}
              </div>
            )}

            {/* 1. Duration Toggle (3 Tabs) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLeaveDuration("single")}
                className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
                  leaveDuration === "single"
                    ? "bg-[#457375] text-white border-[#457375]"
                    : "bg-transparent text-[#457375] border-[#E5DEC9]"
                }`}
              >
                Single Day
              </button>

              <button
                type="button"
                onClick={() => setLeaveDuration("multiple")}
                className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
                  leaveDuration === "multiple"
                    ? "bg-[#457375] text-white border-[#457375]"
                    : "bg-transparent text-[#457375] border-[#E5DEC9]"
                }`}
              >
                Multiple Days
              </button>

              <button
                type="button"
                onClick={() => setLeaveDuration("half")}
                className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
                  leaveDuration === "half"
                    ? "bg-[#457375] text-white border-[#457375]"
                    : "bg-transparent text-[#457375] border-[#E5DEC9]"
                }`}
              >
                Half Day
              </button>
            </div>

            {/* 2. Dates Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-[#8C827A] font-normal">
                  {leaveDuration === "multiple" ? "Dates" : "Date"}
                </label>

                {/* Dynamic Rule Helper Badge */}
                <span className="text-[9px] text-[#8C827A] flex items-center gap-1 font-light">
                  <Clock className="w-3 h-3 text-brand-orange" />
                  {isPast8AM ? (
                    <span className="text-brand-orange">
                      Past 8:00 AM cutoff (Earliest: Tomorrow)
                    </span>
                  ) : (
                    <span>Same-day allowed before 8:00 AM</span>
                  )}
                </span>
              </div>

              {leaveDuration === "single" || leaveDuration === "half" ? (
                /* Single Day / Half Day Input */
                <div className="border border-[#E5DEC9] px-3.5 py-3 rounded-xs">
                  <input
                    type="date"
                    value={singleDate}
                    min={minAllowedDate} // Disables today after 8:00 AM
                    onChange={(e) => setSingleDate(e.target.value)}
                    required
                    className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer"
                  />
                </div>
              ) : (
                /* Multiple Days Inputs */
                <div className="grid grid-cols-2 gap-2">
                  {/* From Date */}
                  <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
                    <span className="text-[9px] text-[#8C827A]">From</span>
                    <input
                      type="date"
                      value={startDate}
                      min={minAllowedDate} // Disables today after 8:00 AM
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
                    />
                  </div>

                  {/* To Date (Clamped to max 4 consecutive days) */}
                  <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
                    <span className="text-[9px] text-[#8C827A]">
                      To (Max 4 Days)
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || minAllowedDate}
                      max={maxEndDate || undefined} // Disables 5th day and beyond
                      disabled={!startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5 disabled:opacity-50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Type of Leave OR Half Day Time Select */}
            {leaveDuration === "half" ? (
              /* Half Day Time Range */
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[#8C827A] font-normal">
                  Time Range
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
                    <span className="text-[9px] text-[#8C827A]">From Time</span>
                    <input
                      type="time"
                      value={fromTime}
                      onChange={(e) => setFromTime(e.target.value)}
                      required
                      className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
                    />
                  </div>

                  <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
                    <span className="text-[9px] text-[#8C827A]">To Time</span>
                    <input
                      type="time"
                      value={toTime}
                      onChange={(e) => setToTime(e.target.value)}
                      required
                      className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Standard Type of Leave Dropdown */
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[#8C827A] font-normal">
                  Type of Leave
                </label>

                <div className="relative flex items-center border border-[#E5DEC9] py-3 rounded-xs">
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#231F20] appearance-none focus:outline-none cursor-pointer px-3.5 select-none"
                  >
                    {LEAVE_TYPES.map((type) => (
                      <option
                        key={type}
                        value={type}
                        className="bg-brand-cream text-[#231F20]"
                      >
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#231F20] pointer-events-none absolute right-3" />
                </div>
              </div>
            )}

            {/* 4. Remarks */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#8C827A] font-normal">
                Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Write description"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border border-[#E5DEC9] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs resize-none"
              />
            </div>

            {/* 5. Submit Button */}
            <div className="flex justify-center mt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-orange text-white text-sm font-medium py-3 px-12 rounded-xs shadow-xs transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer tracking-wide flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
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

export default LeaveRequestForm;
