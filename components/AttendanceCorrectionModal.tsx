"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AttendanceCorrectionModal = ({
  isOpen,
  onClose,
}: AttendanceCorrectionModalProps) => {
  const { user, userData } = useAuth();
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // Writes to `attendance_corrections` collection
      await addDoc(collection(db, "attendance_corrections"), {
        userId: user.uid,
        name: userData?.name || "Employee",
        date: date, // "2026-08-11"
        remarks: remarks,
        status: "pending", // "pending" | "approved" | "denied"
        createdAt: serverTimestamp(),
      });

      // Clear & Close
      setDate("");
      setRemarks("");
      onClose();
    } catch (error: unknown) {
      console.error("Error submitting attendance correction:", error);
      setErrorMsg(
        // @ts-expect-error unknown
        error?.message || "Failed to submit request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 font-poppins"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm border border-[#E5DEC9] bg-background py-5 px-4 rounded-xs shadow-xl text-[#231F20]"
      >
        {/* Top Header Bar */}
        <div className="bg-brand-orange text-white py-3 px-4 text-center rounded-xs mb-5 -mt-1 font-medium text-sm md:text-base tracking-wide">
          Attendance Correction
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2 rounded mb-4 text-center">
            {errorMsg}
          </div>
        )}

        {/* Correction Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          {/* 2. Remarks Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[#8C827A] font-normal">
              Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Write description"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              required
              className="w-full border border-[#E5DEC9] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs resize-none"
            />
          </div>

          {/* 3. Dark Submit Button */}
          <div className="flex justify-center mt-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-black text-white text-xs md:text-sm font-medium py-3 px-12 rounded-xs shadow-xs transition hover:bg-black active:scale-[0.99] cursor-pointer tracking-wide flex items-center gap-2 disabled:opacity-70"
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
  );
};

export default AttendanceCorrectionModal;
