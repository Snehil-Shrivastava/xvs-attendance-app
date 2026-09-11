"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Pencil, X, Loader2 } from "lucide-react";

interface DayRecord {
  date: string;
  status?:
    | "On Time"
    | "Grace Used"
    | "Late"
    | "Half Day"
    | "Absent"
    | "On Leave"
    | "WFM"
    | "Work from Home"
    | "Holiday";
  overtimeMinutes?: number;
  remark?: string; // <--- Admin remark field
}

interface AttendanceCalendarViewProps {
  currentDate: Date;
  currentMonthStr: string; // e.g. "2026-08"
  targetUserId?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const AttendanceCalendarView = ({
  currentDate,
  currentMonthStr,
  targetUserId,
}: AttendanceCalendarViewProps) => {
  const { user, userData } = useAuth();
  const effectiveUid = targetUserId || user?.uid;
  const isAdmin = userData?.role === "admin";

  const [monthlyRecords, setMonthlyRecords] = useState<
    Record<string, DayRecord>
  >({});

  // Maps date string -> "Leave" | "Half Day"
  const [approvedLeavesMap, setApprovedLeavesMap] = useState<
    Record<string, string>
  >({});

  // Set of holiday date strings
  const [holidayDatesSet, setHolidayDatesSet] = useState<Set<string>>(
    new Set(),
  );

  // Maps date string -> Holiday Name
  const [holidaysMap, setHolidaysMap] = useState<Record<string, string>>({});

  // 2x2 expanded date state
  const [expandedDateStr, setExpandedDateStr] = useState<string | null>(null);

  // Remark Modal State
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [remarkDate, setRemarkDate] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  // Collapse if month changes
  useEffect(() => {
    setExpandedDateStr(null);
  }, [currentMonthStr]);

  useEffect(() => {
    if (!effectiveUid) return;

    // 1. Listen to Daily Punches and remarks for this month
    const attendanceQuery = query(
      collection(db, "daily_attendance"),
      where("userId", "==", effectiveUid),
      where("month", "==", currentMonthStr),
    );

    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const recordsMap: Record<string, DayRecord> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DayRecord;
        recordsMap[data.date] = data;
      });
      setMonthlyRecords(recordsMap);
    });

    // 2. Listen to `leaves` collection
    const leavesQuery = query(
      collection(db, "leaves"),
      where("userId", "==", effectiveUid),
    );

    const unsubscribeLeaves = onSnapshot(leavesQuery, (snapshot) => {
      const leavesMap: Record<string, string> = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "approved") {
          const isHalfDay =
            data.leaveType === "Half Day" ||
            data.durationType === "half" ||
            data.totalDays === 0.5;
          const start = data.startDate;
          const end = data.endDate;

          if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const curDate = new Date(startDate);

            while (curDate <= endDate) {
              const yyyy = curDate.getFullYear();
              const mm = String(curDate.getMonth() + 1).padStart(2, "0");
              const dd = String(curDate.getDate()).padStart(2, "0");
              const dateKey = `${yyyy}-${mm}-${dd}`;

              leavesMap[dateKey] = isHalfDay
                ? "Half Day"
                : data.leaveType || "Leave";
              curDate.setDate(curDate.getDate() + 1);
            }
          }
        }
      });

      setApprovedLeavesMap(leavesMap);
    });

    // 3. Listen to `holidays` collection
    const holidaysQuery = query(
      collection(db, "holidays"),
      where("month", "==", currentMonthStr),
    );

    const unsubscribeHolidays = onSnapshot(holidaysQuery, (snapshot) => {
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
      unsubscribeAttendance();
      unsubscribeLeaves();
      unsubscribeHolidays();
    };
  }, [effectiveUid, currentMonthStr]);

  // Build Calendar Days Array
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

  // Resolve type/label, remark, and style
  const getDayDetails = (day: (typeof calendarDays)[0]) => {
    const record = monthlyRecords[day.dateString];
    const remark = record?.remark || "";

    if (!day.isCurrentMonth) {
      return {
        styleClass: "bg-[#F3ECE0]/70 text-[#C4BCB1]",
        label: "",
        remark: "",
        isNormal: true,
      };
    }

    if (day.isWeekend) {
      return {
        styleClass: "bg-transparent text-[#B8B1A8]",
        label: "",
        remark,
        isNormal: true,
      };
    }

    // 1. Holiday
    if (holidayDatesSet.has(day.dateString)) {
      return {
        styleClass: "bg-[#BA255F] text-white font-medium",
        label: holidaysMap[day.dateString] || "Holiday",
        remark,
        isNormal: false,
      };
    }

    // 2. Approved Requests from `leaves`
    const approvedType = approvedLeavesMap[day.dateString];
    if (approvedType === "Half Day") {
      return {
        styleClass: "bg-[#74C0B5] text-white font-medium",
        label: "Half Day",
        remark,
        isNormal: false,
      };
    }
    if (approvedType) {
      return {
        styleClass: "bg-[#4E7B80] text-white font-medium",
        label: approvedType,
        remark,
        isNormal: false,
      };
    }

    // 3. Daily Attendance Records
    if (!record) {
      return {
        styleClass: "bg-transparent text-[#231F20]",
        label: "",
        remark,
        isNormal: true,
      };
    }

    if ((record.overtimeMinutes ?? 0) > 0) {
      return {
        styleClass: "bg-[#55B5E5] text-white font-medium",
        label: "Overtime",
        remark,
        isNormal: false,
      };
    }

    switch (record.status) {
      case "Late":
        return {
          styleClass: "bg-[#DE4949] text-white font-medium",
          label: "Late",
          remark,
          isNormal: false,
        };
      case "Grace Used":
        return {
          styleClass: "bg-[#91C95A] text-white font-medium",
          label: "Late/Allowed",
          remark,
          isNormal: false,
        };
      case "Half Day":
        return {
          styleClass: "bg-[#74C0B5] text-white font-medium",
          label: "Half Day",
          remark,
          isNormal: false,
        };
      case "On Leave":
        return {
          styleClass: "bg-[#4E7B80] text-white font-medium",
          label: "Leave",
          remark,
          isNormal: false,
        };
      case "WFM":
      case "Work from Home":
        return {
          styleClass: "bg-[#577A64] text-white font-medium",
          label: "WFM",
          remark,
          isNormal: false,
        };
      case "Holiday":
        return {
          styleClass: "bg-[#BA255F] text-white font-medium",
          label: holidaysMap[day.dateString] || "Holiday",
          remark,
          isNormal: false,
        };
      case "On Time":
      default:
        return {
          styleClass: "bg-transparent text-[#231F20]",
          label: "",
          remark,
          isNormal: true,
        };
    }
  };

  // Compute 2x2 expansion coordinates
  const expandedOverlayConfig = useMemo(() => {
    if (!expandedDateStr) return null;

    const idx = calendarDays.findIndex((d) => d.dateString === expandedDateStr);
    if (idx === -1) return null;

    const day = calendarDays[idx];
    const row = Math.floor(idx / 7);
    const col = idx % 7;
    const totalRows = Math.ceil(calendarDays.length / 7);

    let leftCol = col;
    if (col === 6) {
      leftCol = 5;
    }

    let topRow = row - 1;
    let bottomRow = row;
    if (row === 0) {
      topRow = 0;
      bottomRow = 1;
    }

    const isBottom = row === bottomRow;
    const isRight = col === leftCol + 1;

    const details = getDayDetails(day);

    return {
      day,
      details,
      topPercent: (topRow / totalRows) * 100,
      leftPercent: (leftCol / 7) * 100,
      widthPercent: (2 / 7) * 100,
      heightPercent: (2 / totalRows) * 100,
      isBottom,
      isRight,
    };
  }, [
    expandedDateStr,
    calendarDays,
    monthlyRecords,
    holidayDatesSet,
    approvedLeavesMap,
  ]);

  const handleDayClick = (day: (typeof calendarDays)[0]) => {
    if (!day.isCurrentMonth || !day.dateString) return;

    if (expandedDateStr === day.dateString) {
      setExpandedDateStr(null);
    } else {
      setExpandedDateStr(day.dateString);
    }
  };

  // Admin opens Remark Modal
  const openRemarkModal = (dateStr: string, currentRemark?: string) => {
    setRemarkDate(dateStr);
    setRemarkText(currentRemark || "");
    setIsRemarkModalOpen(true);
  };

  // Save Remark to Firestore
  const handleSaveRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUid || !remarkDate) return;

    setSavingRemark(true);
    try {
      const docRef = doc(
        db,
        "daily_attendance",
        `${remarkDate}_${effectiveUid}`,
      );
      await setDoc(
        docRef,
        {
          userId: effectiveUid,
          date: remarkDate,
          month: remarkDate.slice(0, 7),
          remark: remarkText.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setIsRemarkModalOpen(false);
    } catch (err) {
      console.error("Failed to save remark:", err);
    } finally {
      setSavingRemark(false);
    }
  };

  return (
    <div className="w-full font-poppins text-black select-none">
      {/* Calendar Grid Container */}
      <div className="relative">
        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 text-center py-3 bg-transparent border-b border-[#E5DEC9]">
          {WEEKDAYS.map((day) => (
            <span key={day} className="font-semibold text-xs text-[#231F20]">
              {day}
            </span>
          ))}
        </div>

        {/* 7-Column Day Grid */}
        <div className="grid grid-cols-7 relative">
          {calendarDays.map((day, index) => {
            const { styleClass } = getDayDetails(day);

            return (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                className={`aspect-square border-l border-r border-b border-[#E5DEC9] flex items-center justify-center text-xs md:text-sm transition-colors ${
                  day.isCurrentMonth ? "cursor-pointer" : "pointer-events-none"
                } ${styleClass}`}
              >
                {day.dayNumber}
              </div>
            );
          })}

          {/* =========================================================
              EXPANDED 2×2 TILE OVERLAY (OCCUPIES 4 SQUARES)
          ========================================================= */}
          {expandedOverlayConfig && (
            <div
              onClick={() => setExpandedDateStr(null)}
              style={{
                top: `${expandedOverlayConfig.topPercent}%`,
                left: `${expandedOverlayConfig.leftPercent}%`,
                width: `${expandedOverlayConfig.widthPercent}%`,
                height: `${expandedOverlayConfig.heightPercent}%`,
              }}
              className={`absolute z-20 border border-[#E5DEC9] p-1.5 flex flex-col justify-between cursor-pointer transition-all duration-150 shadow-md ${
                expandedOverlayConfig.details.isNormal
                  ? "bg-[#FAF6EC] text-[#231F20]"
                  : expandedOverlayConfig.details.styleClass
              }`}
            >
              {/* Top Row: Corner Number or Admin Edit Pencil */}
              <div className="flex items-center justify-between w-full">
                {!expandedOverlayConfig.isBottom ? (
                  <span className="text-xs font-medium">
                    {expandedOverlayConfig.day.dayNumber}
                  </span>
                ) : (
                  <div />
                )}

                {/* Admin Pencil Icon to Add/Edit Remark */}
                {isAdmin && (
                  <button
                    type="button"
                    title="Add / Edit Remark"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRemarkModal(
                        expandedOverlayConfig.day.dateString,
                        expandedOverlayConfig.details.remark,
                      );
                    }}
                    className="p-1 hover:opacity-75 transition cursor-pointer"
                  >
                    <Pencil className="w-3 h-3 stroke-[2.5]" />
                  </button>
                )}
              </div>

              {/* Center Area: Label & Remark (both text-xs) */}
              <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                {expandedOverlayConfig.details.label && (
                  <span className="font-calSans text-xs tracking-wide leading-tight drop-shadow-xs">
                    {expandedOverlayConfig.details.label}
                  </span>
                )}

                {/* Remark Text Display */}
                {expandedOverlayConfig.details.remark && (
                  <span className="text-[10px] opacity-90 font-normal italic leading-tight mt-1 line-clamp-2">
                    &ldquo;{expandedOverlayConfig.details.remark}&rdquo;
                  </span>
                )}
              </div>

              {/* Bottom Row: Corner Number if anchored to bottom */}
              {expandedOverlayConfig.isBottom && (
                <div
                  className={`flex ${
                    expandedOverlayConfig.isRight
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <span className="text-xs font-medium">
                    {expandedOverlayConfig.day.dayNumber}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Demarcations Legend Section */}
      <div className="mt-6">
        <span className="text-[10px] text-[#8C827A] font-normal block mb-3">
          Demarcations
        </span>

        <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 text-[8px] text-[#231F20]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#4E7B80] shrink-0" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#74C0B5] shrink-0" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#577A64] shrink-0" />
            <span>WFM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#55B5E5] shrink-0" />
            <span>Overtime</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#DE4949] shrink-0" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border border-[#E5DEC9] bg-transparent shrink-0" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#91C95A] shrink-0" />
            <span>Late/Allowed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#BA255F] shrink-0" />
            <span>Holiday</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          ADMIN REMARK POPUP MODAL
      ========================================================= */}
      {isRemarkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsRemarkModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm bg-background border border-[#E5DEC9] p-5 shadow-xl text-[#231F20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5DEC9]">
              <h4 className="text-xs font-semibold tracking-wide">
                Day Remark ({remarkDate})
              </h4>
              <button
                type="button"
                onClick={() => setIsRemarkModalOpen(false)}
                className="text-[#8C827A] hover:text-[#231F20]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRemark} className="flex flex-col gap-3">
              <textarea
                rows={3}
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="e.g. Special project day, Approved WFH, etc."
                className="w-full bg-background border border-[#E5DEC9] p-2.5 text-xs text-[#231F20] focus:outline-none resize-none"
              />

              <div className="flex justify-end gap-2 mt-1">
                {remarkText && (
                  <button
                    type="button"
                    onClick={() => setRemarkText("")}
                    className="text-[11px] text-red-600 hover:underline px-2"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingRemark}
                  className="bg-brand-orange text-white text-xs px-4 py-2 font-medium hover:bg-brand-orange/90 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingRemark ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Remark"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendarView;
