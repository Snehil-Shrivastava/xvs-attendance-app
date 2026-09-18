// lib/calendarStatus.ts
//
// Pure status resolver for calendar day-cells. Extracted from
// AttendanceCalendarView's `getDayDetails`.
//
// Fix #7 semantics preserved:
//  - Status is primary; overtime is a secondary indicator.
//  - Exception: overtime-only days (no status set) show Overtime as primary.
//
// WFH fix: "WFH" is the canonical value written by admin. "Work from Home"
// is kept as a legacy alias on the read path only.

import type { CalendarDay } from "./calendarGrid";

export type AttendanceStatus =
  | "On Time"
  | "Grace Used"
  | "Late"
  | "Half Day"
  | "Absent"
  | "On Leave"
  | "WFH"
  | "Work from Home" // legacy alias — read-only
  | "Holiday";

export interface DayRecord {
  date: string;
  status?: AttendanceStatus;
  overtimeMinutes?: number;
  checkIn?: string;
  leaveType?: string;
  remark?: string;
}

export interface DayDetails {
  styleClass: string;
  label: string;
  remark: string;
  isNormal: boolean;
  hasOvertime: boolean;
  overtimeMinutes: number;
}

export function getDayDetails(
  day: CalendarDay,
  record: DayRecord | undefined,
  holidayName: string | undefined,
  approvedLeaveType: string | undefined,
): DayDetails {
  const remark = record?.remark || "";

  if (!day.isCurrentMonth) {
    return {
      styleClass: "bg-[#F3ECE0]/70 text-[#C4BCB1]",
      label: "",
      remark: "",
      isNormal: true,
      hasOvertime: false,
      overtimeMinutes: 0,
    };
  }

  if (day.isWeekend) {
    return {
      styleClass: "bg-transparent text-[#B8B1A8]",
      label: "",
      remark,
      isNormal: true,
      hasOvertime: false,
      overtimeMinutes: 0,
    };
  }

  // 1. Holiday
  if (holidayName) {
    return {
      styleClass: "bg-[#BA255F] text-white font-medium",
      label: holidayName,
      remark,
      isNormal: false,
      hasOvertime: false,
      overtimeMinutes: 0,
    };
  }

  // 2. Approved leaves (user or admin)
  if (approvedLeaveType === "Half Day") {
    return {
      styleClass: "bg-[#74C0B5] text-white font-medium",
      label: "Half Day",
      remark,
      isNormal: false,
      hasOvertime: false,
      overtimeMinutes: 0,
    };
  }
  if (approvedLeaveType) {
    return {
      styleClass: "bg-[#4E7B80] text-white font-medium",
      label: approvedLeaveType,
      remark,
      isNormal: false,
      hasOvertime: false,
      overtimeMinutes: 0,
    };
  }

  // 3. No attendance record yet
  if (!record) {
    return {
      styleClass: "bg-transparent text-[#231F20]",
      label: "",
      remark,
      isNormal: true,
      hasOvertime: false,
      overtimeMinutes: 0,
    };
  }

  const overtimeMinutes = record.overtimeMinutes ?? 0;
  const hasOvertime = overtimeMinutes > 0;

  // 4. Overtime-only days (no status) → Overtime primary
  if (!record.status && hasOvertime) {
    return {
      styleClass: "bg-[#55B5E5] text-white font-medium",
      label: "Overtime",
      remark,
      isNormal: false,
      hasOvertime: true,
      overtimeMinutes,
    };
  }

  // 5. Absent — render as a normal day (no background color).
  if (record.status === "Absent") {
    return {
      styleClass: "bg-transparent text-[#231F20]",
      label: "Absent",
      remark,
      isNormal: true,
      hasOvertime,
      overtimeMinutes,
    };
  }

  // 6. Status primary; overtime as secondary indicator
  let styleClass = "bg-brand-orange text-white font-medium";
  let label = "";

  switch (record.status) {
    case "Late":
      styleClass = "bg-[#DE4949] text-white font-medium";
      label = "Late";
      break;
    case "Grace Used":
      styleClass = "bg-[#91C95A] text-white font-medium";
      label = "Late/Allowed";
      break;
    case "Half Day":
      styleClass = "bg-[#74C0B5] text-white font-medium";
      label = "Half Day";
      break;
    case "On Leave":
      styleClass = "bg-[#4E7B80] text-white font-medium";
      label = record.leaveType || "Leave";
      break;
    case "WFH":
    case "Work from Home":
      styleClass = "bg-[#577A64] text-white font-medium";
      label = "WFH";
      break;
    case "Holiday":
      styleClass = "bg-[#BA255F] text-white font-medium";
      label = holidayName || "Holiday";
      break;
    case "On Time":
    default:
      styleClass = "bg-brand-orange text-white font-medium";
      label = "";
      break;
  }

  return {
    styleClass,
    label,
    remark,
    isNormal: false,
    hasOvertime,
    overtimeMinutes,
  };
}
