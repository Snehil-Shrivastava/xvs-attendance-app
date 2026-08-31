// "use client";

// import { useState } from "react";
// import { ChevronDown, Loader2 } from "lucide-react";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";

// const LEAVE_TYPES = [
//   "Planned Leave",
//   "Casual Leave",
//   "Sick Leave",
//   "Emergency Leave",
//   "Unpaid Leave",
// ];

// const LeaveRequestForm = () => {
//   const { user, userData } = useAuth();
//   const [leaveDuration, setLeaveDuration] = useState<"single" | "multiple">(
//     "multiple",
//   );
//   const [singleDate, setSingleDate] = useState("");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
//   const [remarks, setRemarks] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [successMsg, setSuccessMsg] = useState("");

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!user) return;
//     setLoading(true);
//     setSuccessMsg("");

//     const start = leaveDuration === "single" ? singleDate : startDate;
//     const end = leaveDuration === "single" ? singleDate : endDate;

//     // Calculate total days
//     const d1 = new Date(start);
//     const d2 = new Date(end);
//     const diffTime = Math.abs(d2.getTime() - d1.getTime());
//     const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

//     try {
//       // Automatically creates & writes to the `leaves` collection
//       await addDoc(collection(db, "leaves"), {
//         userId: user.uid,
//         name: userData?.name || "Employee",
//         durationType: leaveDuration,
//         startDate: start,
//         endDate: end,
//         totalDays: totalDays,
//         leaveType: leaveType,
//         remarks: remarks,
//         status: "approved", // or "pending" if you want admin approval
//         createdAt: serverTimestamp(),
//       });

//       setSuccessMsg("Leave submitted successfully!");
//       setSingleDate("");
//       setStartDate("");
//       setEndDate("");
//       setRemarks("");
//     } catch (error) {
//       console.error("Error adding leave:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="w-full font-poppins">
//       <div className="border border-[#E5DEC9] p-5">
//         <form onSubmit={handleSubmit} className="flex flex-col gap-5">
//           {successMsg && (
//             <div className="bg-green-500/10 border border-green-500/30 text-green-700 text-xs px-3 py-2 rounded text-center">
//               {successMsg}
//             </div>
//           )}

//           {/* 1. Duration Toggle */}
//           <div className="grid grid-cols-2 gap-3">
//             <button
//               type="button"
//               onClick={() => setLeaveDuration("single")}
//               className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
//                 leaveDuration === "single"
//                   ? "bg-[#457375] text-white border-[#457375]"
//                   : "bg-transparent text-[#457375] border-[#E5DEC9]"
//               }`}
//             >
//               Single Day Leave
//             </button>

//             <button
//               type="button"
//               onClick={() => setLeaveDuration("multiple")}
//               className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
//                 leaveDuration === "multiple"
//                   ? "bg-[#457375] text-white border-[#457375]"
//                   : "bg-transparent text-[#457375] border-[#E5DEC9]"
//               }`}
//             >
//               Multiple Days Leave
//             </button>
//           </div>

//           {/* 2. Dates */}
//           <div className="flex flex-col gap-1.5">
//             <label className="text-[11px] text-[#8C827A] font-normal">
//               {leaveDuration === "single" ? "Date" : "Dates"}
//             </label>

//             {leaveDuration === "single" ? (
//               <div className="border border-[#E5DEC9] px-3.5 py-3 rounded-xs">
//                 <input
//                   type="date"
//                   value={singleDate}
//                   onChange={(e) => setSingleDate(e.target.value)}
//                   required
//                   className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer"
//                 />
//               </div>
//             ) : (
//               <div className="grid grid-cols-2 gap-2">
//                 <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
//                   <span className="text-[9px] text-[#8C827A]">From</span>
//                   <input
//                     type="date"
//                     value={startDate}
//                     onChange={(e) => setStartDate(e.target.value)}
//                     required
//                     className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
//                   />
//                 </div>

//                 <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
//                   <span className="text-[9px] text-[#8C827A]">To</span>
//                   <input
//                     type="date"
//                     value={endDate}
//                     min={startDate}
//                     onChange={(e) => setEndDate(e.target.value)}
//                     required
//                     className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
//                   />
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* 3. Leave Type */}
//           <div className="flex flex-col gap-1.5">
//             <label className="text-[11px] text-[#8C827A] font-normal">
//               Type of Leave
//             </label>

//             <div className="relative flex items-center border border-[#E5DEC9] py-3 rounded-xs">
//               <select
//                 value={leaveType}
//                 onChange={(e) => setLeaveType(e.target.value)}
//                 className="w-full bg-transparent text-xs text-[#231F20] appearance-none focus:outline-none cursor-pointer px-3.5 select-none"
//               >
//                 {LEAVE_TYPES.map((type) => (
//                   <option
//                     key={type}
//                     value={type}
//                     className="text-[#231F20] bg-background"
//                   >
//                     {type}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown className="w-4 h-4 text-[#231F20] pointer-events-none absolute right-3" />
//             </div>
//           </div>

//           {/* 4. Remarks */}
//           <div className="flex flex-col gap-1.5">
//             <label className="text-[11px] text-[#8C827A] font-normal">
//               Remarks
//             </label>
//             <textarea
//               rows={3}
//               placeholder="Write description"
//               value={remarks}
//               onChange={(e) => setRemarks(e.target.value)}
//               className="w-full border border-[#E5DEC9] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs resize-none"
//             />
//           </div>

//           {/* 5. Submit Button */}
//           <div className="flex justify-center mt-2">
//             <button
//               type="submit"
//               disabled={loading}
//               className="bg-brand-orange text-white text-sm font-medium py-3 px-12 rounded-xs shadow-xs transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer tracking-wide flex items-center gap-2 disabled:opacity-70"
//             >
//               {loading ? (
//                 <>
//                   <Loader2 className="w-4 h-4 animate-spin" />
//                   <span>Submitting...</span>
//                 </>
//               ) : (
//                 <span>Submit</span>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default LeaveRequestForm;

// -----------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
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

const LeaveRequestForm = () => {
  const { user, userData } = useAuth();
  const [leaveDuration, setLeaveDuration] = useState<"single" | "multiple">(
    "multiple",
  );
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg("");

    const start = leaveDuration === "single" ? singleDate : startDate;
    const end = leaveDuration === "single" ? singleDate : endDate;

    // Calculate total days
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      await addDoc(collection(db, "leaves"), {
        userId: user.uid,
        name: userData?.name || "Employee",
        durationType: leaveDuration,
        startDate: start,
        endDate: end,
        totalDays: totalDays,
        leaveType: leaveType,
        remarks: remarks,
        status: "approved",
        createdAt: serverTimestamp(),
      });

      // Clear form inputs
      setSingleDate("");
      setStartDate("");
      setEndDate("");
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
        <div className="border border-[#E5DEC9] p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Error Message Banner (Only shows if something goes wrong) */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2.5 rounded text-center">
                {errorMsg}
              </div>
            )}

            {/* 1. Duration Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLeaveDuration("single")}
                className={`py-3 text-xs md:text-sm font-medium transition-all rounded-xs cursor-pointer border ${
                  leaveDuration === "single"
                    ? "bg-[#457375] text-white border-[#457375]"
                    : "bg-transparent text-[#457375] border-[#E5DEC9]"
                }`}
              >
                Single Day Leave
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
                Multiple Days Leave
              </button>
            </div>

            {/* 2. Dates */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#8C827A] font-normal">
                {leaveDuration === "single" ? "Date" : "Dates"}
              </label>

              {leaveDuration === "single" ? (
                <div className="border border-[#E5DEC9] px-3.5 py-3 rounded-xs">
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    required
                    className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
                    <span className="text-[9px] text-[#8C827A]">From</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
                    />
                  </div>

                  <div className="border border-[#E5DEC9] px-3 py-2.5 rounded-xs flex flex-col">
                    <span className="text-[9px] text-[#8C827A]">To</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer mt-0.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Leave Type */}
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

      {/* Success Modal Triggered on Submit */}
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
