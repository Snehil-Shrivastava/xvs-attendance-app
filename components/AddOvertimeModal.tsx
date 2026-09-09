"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addMemberOvertime } from "@/app/actions/overtime";

interface AddOvertimeModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const HOURS_OPTIONS = Array.from({ length: 13 }, (_, i) => i); // 0 to 12
const MINUTES_OPTIONS = [0, 15, 30, 45];

const AddOvertimeModal = ({
  open,
  onClose,
  userId,
  userName,
}: AddOvertimeModalProps) => {
  const { user } = useAuth();

  // Default to today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(todayStr);
      setHours(2);
      setMinutes(30);
      setErrorMessage("");
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open, todayStr]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    if (hours === 0 && minutes === 0) {
      setErrorMessage("Please select at least 15 minutes of overtime.");
      return;
    }

    setErrorMessage("");
    setSubmitting(true);

    try {
      const idToken = await user.getIdToken(true);
      const res = await addMemberOvertime(
        {
          userId,
          date,
          hours: Number(hours),
          minutes: Number(minutes),
        },
        idToken,
      );

      if (!res.success) {
        setErrorMessage(res.error || "Failed to add overtime.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-background shadow-2xl overflow-hidden font-poppins z-10 animate-in fade-in zoom-in-95 duration-150 p-4">
        {/* Top Header Banner */}
        <div className="bg-[#55B5E5] py-3 px-4 flex items-center justify-center relative mb-5">
          <h3 className="text-white text-base font-normal tracking-wide">
            Add Overtime
          </h3>
        </div>

        {/* Modal Body */}
        <div className="">
          {success ? (
            <div className="py-8 text-center">
              <span className="text-sm font-medium text-[#231F20]">
                Overtime added successfully for {userName}!
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2 rounded-xs">
                  {errorMessage}
                </div>
              )}

              {/* Date Input */}
              <div>
                <label className="block text-[11px] text-[#8C827A] mb-1.5">
                  Date
                </label>
                <div className="relative flex items-center bg-[#FAF6EC] border border-[#E5DEC9]">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={submitting}
                    className="w-full bg-transparent px-3 py-3 text-sm text-[#231F20] focus:outline-none cursor-pointer appearance-none"
                  />
                  <ChevronDown className="w-4 h-4 text-[#231F20] absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Time Inputs (Hours & Minutes) */}
              <div>
                <label className="block text-[11px] text-[#8C827A] mb-1.5">
                  Time
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Hours Dropdown */}
                  <div className="relative flex items-center bg-[#FAF6EC] border border-[#E5DEC9]">
                    <select
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                      disabled={submitting}
                      className="w-full bg-transparent px-3 py-3 text-sm text-[#231F20] focus:outline-none cursor-pointer appearance-none"
                    >
                      {HOURS_OPTIONS.map((h) => (
                        <option key={h} value={h}>
                          {h} {h === 1 ? "Hour" : "Hours"}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#231F20] absolute right-3 pointer-events-none" />
                  </div>

                  {/* Minutes Dropdown */}
                  <div className="relative flex items-center bg-[#FAF6EC] border border-[#E5DEC9]">
                    <select
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                      disabled={submitting}
                      className="w-full bg-transparent px-3 py-3 text-sm text-[#231F20] focus:outline-none cursor-pointer appearance-none"
                    >
                      {MINUTES_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m} Minutes
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#231F20] absolute right-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Centered Submit Button */}
              <div className="flex justify-center mt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand-black hover:bg-black active:scale-[0.98] text-white px-8 py-2.5 text-xs font-semibold tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddOvertimeModal;
