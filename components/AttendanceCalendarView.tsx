"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DayRecord {
  date: string; // "2026-08-24"
  status?:
    | "On Time"
    | "Grace Used"
    | "Late"
    | "Half Day"
    | "Absent"
    | "On Leave";
  overtimeMinutes?: number;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const AttendanceCalendarView = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date()); // Selected Month/Year
  const [monthlyRecords, setMonthlyRecords] = useState<
    Record<string, DayRecord>
  >({});
  const [loading, setLoading] = useState(true);

  // e.g. "2026-08"
  const currentMonthStr = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, [currentDate]);

  // Display Month Title: e.g. "August 2026"
  const formattedMonthTitle = useMemo(() => {
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate]);

  // Fetch Firestore Records for Selected Month
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, "daily_attendance"),
      where("userId", "==", user.uid),
      where("month", "==", currentMonthStr),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const recordsMap: Record<string, DayRecord> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DayRecord;
          recordsMap[data.date] = data;
        });
        setMonthlyRecords(recordsMap);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching monthly calendar:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, currentMonthStr]);

  // Month Navigation Handlers
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

  // Build Calendar Days Array (Monday to Sunday grid)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    // Adjust so Monday = 0, Sunday = 6
    const startingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    // 1. Previous Month Filler Days
    for (let i = startingOffset - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const isWeekend = prevDate.getDay() === 0 || prevDate.getDay() === 6;
      days.push({
        dayNumber: dayNum,
        dateString: "",
        isCurrentMonth: false,
        isWeekend,
      });
    }

    // 2. Current Month Days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayDate = new Date(year, month, d);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
        isWeekend,
      });
    }

    // 3. Next Month Filler Days to complete grid
    const remainingSlots =
      35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      const isWeekend = nextDate.getDay() === 0 || nextDate.getDay() === 6;
      days.push({
        dayNumber: nextDay,
        dateString: "",
        isCurrentMonth: false,
        isWeekend,
      });
    }

    return days;
  }, [currentDate]);

  // Determine Background Color & Text Color based on Status
  const getDayStyle = (day: (typeof calendarDays)[0]) => {
    if (!day.isCurrentMonth) {
      return "bg-[#F3ECE0]/70 text-[#C4BCB1]";
    }

    if (day.isWeekend) {
      return "bg-transparent text-[#B8B1A8]";
    }

    const record = monthlyRecords[day.dateString];
    if (!record) {
      // Normal working day with no record / future day
      return "bg-transparent text-[#231F20]";
    }

    // Priority: Overtime -> Late -> Grace Used -> Leave -> Half Day -> Present
    if ((record.overtimeMinutes ?? 0) > 0) {
      return "bg-[#4BA7E3] text-white font-medium"; // Overtime (Blue)
    }

    switch (record.status) {
      case "Late":
        return "bg-[#DE4949] text-white font-medium"; // Late (Red)
      case "Grace Used":
        return "bg-[#88C252] text-white font-medium"; // Late/Allowed (Lime Green)
      case "On Leave":
        return "bg-[#457373] text-white font-medium"; // Leave (Teal)
      case "Half Day":
        return "bg-[#74C0B5] text-white font-medium"; // Half Day (Cyan)
      case "On Time":
      default:
        return "bg-transparent text-[#231F20]"; // Present (Neutral)
    }
  };

  return (
    <div className="w-full font-poppins mt-4 pb-8 text-black">
      {/* Calendar Header with Controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-calSans text-xl tracking-wide">
          {formattedMonthTitle}
        </h2>

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

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 text-center mb-3">
        {WEEKDAYS.map((day) => (
          <span key={day} className="font-semibold text-sm text-[#231F20]">
            {day}
          </span>
        ))}
      </div>

      {/* 7x5 / 7x6 Calendar Grid */}
      <div className="grid grid-cols-7 border-t border-l border-[#E5DEC9] bg-[#F7F3EB]/40">
        {calendarDays.map((day, index) => {
          const styleClass = getDayStyle(day);

          return (
            <div
              key={index}
              className={`aspect-square border-r border-b border-[#E5DEC9] flex items-center justify-center text-sm md:text-base select-none transition-colors ${styleClass}`}
            >
              {day.dayNumber}
            </div>
          );
        })}
      </div>

      {/* Demarcations Legend Section */}
      <div className="mt-8">
        <span className="text-xs text-[#8C827A] font-normal block mb-4">
          Demarcations
        </span>

        <div className="grid grid-cols-4 gap-y-4 gap-x-3 text-[8px]">
          {/* Row 1 */}
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#457373] shrink-0" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#74C0B5] shrink-0" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#517A63] shrink-0" />
            <span>WFM</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#4BA7E3] shrink-0" />
            <span>Overtime</span>
          </div>

          {/* Row 2 */}
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#DE4949] shrink-0" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border border-[#E5DEC9] bg-transparent shrink-0" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#88C252] shrink-0" />
            <span>Late/Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#B81E57] shrink-0" />
            <span>Holiday</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendarView;
