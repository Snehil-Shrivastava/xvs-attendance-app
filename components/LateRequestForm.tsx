"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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

const LateRequestForm = () => {
  const { user, userData } = useAuth();
  const [date, setDate] = useState("");
  const [newArrivalTime, setNewArrivalTime] = useState("10:00 AM");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // Writes directly to `late_arrivals` collection
      await addDoc(collection(db, "late_arrivals"), {
        userId: user.uid,
        name: userData?.name || "Employee",
        date: date, // "2026-08-11"
        newArrivalTime: newArrivalTime, // "10:00 AM"
        reason: reason,
        status: "approved", // "pending" | "approved" | "denied"
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
        <div className="border border-[#E5DEC9] p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Header Box */}
            <div className="border border-[#E5DEC9] bg-transparent py-3 text-center rounded-xs">
              <span className="text-sm md:text-base font-medium text-[#231F20] tracking-wide">
                Late Request
              </span>
            </div>

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
              <div className="border border-[#E5DEC9] px-3.5 py-3 rounded-xs">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* 2. New Arrival Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#8C827A] font-normal">
                New Arrival Time
              </label>

              <div className="relative flex items-center border border-[#E5DEC9] py-3 rounded-xs">
                <select
                  value={newArrivalTime}
                  onChange={(e) => setNewArrivalTime(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#231F20] appearance-none focus:outline-none cursor-pointer px-3.5"
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
                placeholder="Write description"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full border border-[#E5DEC9] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs resize-none"
              />
            </div>

            {/* 4. Submit Button */}
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

export default LateRequestForm;
