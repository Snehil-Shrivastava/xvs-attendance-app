// lib/calendarGrid.ts
//
// Pure calendar-grid builder extracted from AttendanceCalendarView.
// Produces a flat array of day-cells (Mon-first) for the given month,
// padded with filler cells from the adjacent months.

export interface CalendarDay {
  dayNumber: number;
  dateString: string; // "YYYY-MM-DD" for current-month cells, "" for filler
  isCurrentMonth: boolean;
  isWeekend: boolean;
}

export function buildCalendarDays(currentDate: Date): CalendarDay[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const startingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

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

  // Next month filler days (pad to 5 or 6 rows total)
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
}
