"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AttendanceStats from "@/components/AttendanceStats";
import AttendanceCalendarView from "@/components/AttendanceCalendarView";
import AttendanceHistory from "@/components/AttendanceHistory";
import AttendanceCorrectionModal from "@/components/AttendanceCorrectionModal";

const AttendancePage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // "YYYY-MM" (e.g. "2026-08")
  const currentMonthStr = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, [currentDate]);

  // "August 2026"
  const formattedMonthTitle = useMemo(() => {
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  return (
    <>
      <div className="py-8 px-5 flex flex-col gap-6 font-poppins text-black">
        {/* =========================================
            GLOBAL TOP MONTH SELECTOR HEADER
        ========================================= */}
        <div className="flex items-center justify-between">
          <h1 className="font-calSans text-xl tracking-wide select-none">
            {formattedMonthTitle}
          </h1>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-[#8C827A] hover:text-black transition cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:opacity-75 transition cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 1. Stats based on selected month */}
        <AttendanceStats currentMonth={currentMonthStr} />

        {/* 2. Calendar grid based on selected month */}
        <AttendanceCalendarView
          currentDate={currentDate}
          currentMonthStr={currentMonthStr}
        />

        {/* 3. History logs */}
        <AttendanceHistory />

        {/* 4. Open Modal Button */}
        <button
          type="button"
          onClick={() => setIsCorrectionModalOpen(true)}
          className="capitalize text-white text-base bg-brand-orange py-3.5 w-full mt-2 text-center rounded-xs shadow-xs tracking-wider transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer"
        >
          Request Attendance Correction
        </button>
      </div>

      {/* Attendance Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
      />
    </>
  );
};

export default AttendancePage;
