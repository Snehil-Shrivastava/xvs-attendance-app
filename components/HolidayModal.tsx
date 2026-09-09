"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // "2026-09-18" or ""
}

const HolidayModal = ({
  isOpen,
  onClose,
  initialDate = "",
}: HolidayModalProps) => {
  const [date, setDate] = useState(initialDate);
  const [title, setTitle] = useState("");
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setDate(initialDate);
    setTitle("");
    setIsExisting(false);

    // If a date was clicked, check if a holiday already exists on that date
    if (initialDate) {
      const checkExisting = async () => {
        try {
          const docSnap = await getDoc(doc(db, "holidays", initialDate));
          if (docSnap.exists()) {
            setTitle(docSnap.data().title || "");
            setIsExisting(true);
          }
        } catch (e) {
          console.error("Error reading holiday:", e);
        }
      };
      checkExisting();
    }
  }, [initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title.trim()) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const monthStr = date.slice(0, 7); // "2026-09"
      const dayNum = parseInt(date.split("-")[2], 10);

      // Save using date as document ID: `holidays/2026-09-18`
      await setDoc(doc(db, "holidays", date), {
        date,
        title: title.trim(),
        month: monthStr,
        day: dayNum,
        updatedAt: serverTimestamp(),
      });

      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving holiday:", error);
      setErrorMsg(error?.message || "Failed to save holiday.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!date) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "holidays", date));
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error deleting holiday:", error);
      setErrorMsg("Failed to delete holiday.");
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
        className="relative w-full max-w-sm border border-[#E5DEC9] bg-[#FAF7F2] p-5 rounded-xs shadow-xl text-[#231F20]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-[#E5DEC9] pb-3 mb-5">
          <h3 className="font-calSans text-lg font-medium text-[#231F20]">
            {isExisting ? "Edit Holiday" : "Mark Holiday"}
          </h3>
          <p className="text-[11px] text-[#8C827A] font-light">
            Set an official company holiday on the calendar.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2 rounded mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* 1. Date Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[#8C827A] font-normal">
              Holiday Date
            </label>
            <div className="border border-[#E5DEC9] bg-[#F7F3EB] px-3.5 py-3 rounded-xs">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-transparent text-xs text-[#231F20] focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* 2. Holiday Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[#8C827A] font-normal">
              Holiday Title
            </label>
            <input
              type="text"
              placeholder="e.g. Diwali, Independence Day"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border border-[#E5DEC9] bg-[#F7F3EB] p-3 text-xs text-[#231F20] placeholder-[#C4BCB1] focus:outline-none rounded-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {isExisting && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="p-3 border border-red-300 text-red-600 rounded-xs hover:bg-red-50 transition cursor-pointer"
                title="Delete Holiday"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-orange text-white text-xs md:text-sm font-medium py-3 rounded-xs shadow-xs transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer tracking-wide flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Holiday</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HolidayModal;
