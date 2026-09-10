"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HolidayModal from "./HolidayModal";

interface HolidayRecord {
  date: string; // "2026-09-18"
  title: string; // "Diwali"
  day: number; // 18
  month: string; // "2026-09"
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Record<string, HolidayRecord>>({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  // "YYYY-MM" (e.g. "2026-09")
  const currentMonthStr = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, [currentDate]);

  // "Sep 2026"
  const formattedMonthTitle = useMemo(() => {
    return currentDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }, [currentDate]);

  // Real-time listener for holidays in the current month
  useEffect(() => {
    const q = query(
      collection(db, "holidays"),
      where("month", "==", currentMonthStr),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: Record<string, HolidayRecord> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as HolidayRecord;
        map[data.date] = data;
      });
      setHolidays(map);
    });

    return () => unsubscribe();
  }, [currentMonthStr]);

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

  // Open modal for a specific clicked day cell
  const handleDayClick = (dateString: string) => {
    if (!dateString) return;
    setSelectedDate(dateString);
    setIsModalOpen(true);
  };

  // Open modal via bottom button (blank date)
  const handleModifyButtonClick = () => {
    setSelectedDate("");
    setIsModalOpen(true);
  };

  // Build Calendar Days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    // Previous month filler days
    for (let i = startingOffset - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      days.push({
        dayNumber: dayNum,
        dateString: "",
        isCurrentMonth: false,
        isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayDate = new Date(year, month, d);
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
        isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
      });
    }

    // Next month filler days
    const remainingSlots =
      35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      days.push({
        dayNumber: nextDay,
        dateString: "",
        isCurrentMonth: false,
        isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6,
      });
    }

    return days;
  }, [currentDate]);

  // List of holidays sorted by day
  const holidayList = useMemo(() => {
    return Object.values(holidays).sort((a, b) => a.day - b.day);
  }, [holidays]);

  return (
    <>
      <div className="w-full font-poppins text-black py-4">
        {/* =========================================
            HEADER (MONTH & NAV)
        ========================================= */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-calSans text-xl tracking-wide select-none">
            {formattedMonthTitle}
          </h1>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 text-[#231F20] hover:opacity-75 transition cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* =========================================
            CALENDAR GRID
        ========================================= */}
        <div>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center py-3">
            {WEEKDAYS.map((day) => (
              <span key={day} className="font-semibold text-xs text-[#231F20]">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const isHoliday = Boolean(holidays[day.dateString]);

              let cellStyle =
                "bg-transparent text-[#231F20] hover:bg-[#E5DEC9]/40 cursor-pointer";

              if (!day.isCurrentMonth) {
                cellStyle = "bg-[#F3ECE0]/70 text-[#C4BCB1] cursor-default";
              } else if (isHoliday) {
                cellStyle =
                  "bg-[#BA255F] text-white font-medium cursor-pointer hover:opacity-90";
              } else if (day.isWeekend) {
                cellStyle =
                  "bg-transparent text-[#B8B1A8] cursor-pointer hover:bg-[#E5DEC9]/40";
              }

              return (
                <div
                  key={index}
                  onClick={() =>
                    day.isCurrentMonth && handleDayClick(day.dateString)
                  }
                  className={`aspect-square border border-[#E5DEC9] flex items-center justify-center text-xs md:text-sm select-none transition-colors ${cellStyle}`}
                >
                  {day.dayNumber}
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================
            HOLIDAY LIST (3 COLUMNS)
        ========================================= */}
        <div className="mt-8 mb-8">
          {holidayList.length === 0 ? (
            <div className="text-center py-4 text-xs text-[#8C827A]">
              No holidays marked for this month.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-y-4 gap-x-3 text-xs">
              {holidayList.map((h) => (
                <div
                  key={h.date}
                  onClick={() => handleDayClick(h.date)}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
                  title="Click to edit holiday"
                >
                  {/* Square Badge */}
                  <span className="w-6 h-6 bg-[#BA255F] text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {h.day}
                  </span>
                  {/* Holiday Title */}
                  <span className="text-xs text-[#231F20] font-normal truncate">
                    {h.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================
            MODIFY CALENDAR BUTTON
        ========================================= */}
        <button
          type="button"
          onClick={handleModifyButtonClick}
          className="w-full bg-brand-orange text-white text-sm md:text-base font-medium py-3.5 transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer tracking-wider"
        >
          Modify Calendar
        </button>
      </div>

      {/* Holiday Modal */}
      <HolidayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDate={selectedDate}
      />
    </>
  );
};

export default AdminCalendar;
