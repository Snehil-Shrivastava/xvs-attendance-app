// hooks/useAttendanceCalendarData.ts
"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDateKey, parseLocalDate } from "@/lib/leaveCalc";
import type { DayRecord } from "@/lib/calendarStatus";

export interface AttendanceCalendarData {
  monthlyRecords: Record<string, DayRecord>;
  approvedLeavesMap: Record<string, string>;
  holidayDatesSet: Set<string>;
  holidaysMap: Record<string, string>;
}

export function useAttendanceCalendarData(
  effectiveUid: string | undefined,
  currentMonthStr: string,
): AttendanceCalendarData {
  const [monthlyRecords, setMonthlyRecords] = useState<
    Record<string, DayRecord>
  >({});
  const [approvedLeavesMap, setApprovedLeavesMap] = useState<
    Record<string, string>
  >({});
  const [holidayDatesSet, setHolidayDatesSet] = useState<Set<string>>(
    new Set(),
  );
  const [holidaysMap, setHolidaysMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!effectiveUid) return;

    // 1. Daily punches + remarks for this month
    const attendanceQuery = query(
      collection(db, "daily_attendance"),
      where("userId", "==", effectiveUid),
      where("month", "==", currentMonthStr),
    );
    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const recordsMap: Record<string, DayRecord> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DayRecord;
        recordsMap[data.date] = data;
      });
      setMonthlyRecords(recordsMap);
    });

    // 2. Approved leaves (user + admin)
    const leavesQuery = query(
      collection(db, "leaves"),
      where("userId", "==", effectiveUid),
    );
    const unsubLeaves = onSnapshot(leavesQuery, (snapshot) => {
      const leavesMap: Record<string, string> = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status !== "approved") return;

        const isHalfDay =
          data.leaveType === "Half Day" ||
          data.durationType === "half" ||
          data.totalDays === 0.5;

        const start = data.startDate;
        const end = data.endDate;
        if (!start || !end) return;

        // Fix #6: parse as LOCAL midnight, never UTC.
        const startDate = parseLocalDate(start);
        const endDate = parseLocalDate(end);
        if (!startDate || !endDate || endDate < startDate) return;

        const curDate = new Date(startDate);
        while (curDate <= endDate) {
          const dateKey = getDateKey(curDate);
          leavesMap[dateKey] = isHalfDay
            ? "Half Day"
            : data.leaveType || "Leave";
          curDate.setDate(curDate.getDate() + 1);
        }
      });

      setApprovedLeavesMap(leavesMap);
    });

    // 3. Holidays for this month
    const holidaysQuery = query(
      collection(db, "holidays"),
      where("month", "==", currentMonthStr),
    );
    const unsubHolidays = onSnapshot(holidaysQuery, (snapshot) => {
      const hSet = new Set<string>();
      const hMap: Record<string, string> = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.date) {
          hSet.add(data.date);
          hMap[data.date] =
            data.name || data.title || data.holidayName || "Holiday";
        }
      });
      setHolidayDatesSet(hSet);
      setHolidaysMap(hMap);
    });

    return () => {
      unsubAttendance();
      unsubLeaves();
      unsubHolidays();
    };
  }, [effectiveUid, currentMonthStr]);

  return { monthlyRecords, approvedLeavesMap, holidayDatesSet, holidaysMap };
}
