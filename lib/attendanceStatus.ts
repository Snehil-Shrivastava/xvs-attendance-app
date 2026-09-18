// lib/attendanceStatus.ts
//
// Shared status-classification logic for check-in times.
// Used by both the webhook handler and the admin calendar override.
//
// Within-grace delays stay classified as "On Time" for display, but
// `graceDeducted` records how many minutes were consumed from the bank.
// Beyond-grace delays are "Late".
//
// Late-arrival approval: when a late request is approved, its newArrivalTime
// becomes the effective shift start for that day.

export interface ShiftConfig {
  startTime: string; // "09:00:00" | "09:00" | "10:30 AM"
  monthlyGraceAllowance: number; // minutes
}

export type ComputedAttendanceStatus = "On Time" | "Grace Used" | "Late";

export interface ComputedAttendance {
  status: ComputedAttendanceStatus;
  minutesDelayed: number;
  graceDeducted: number;
}

export function parseTimeToMinutes(t: string): number | null {
  if (!t) return null;
  const s = t.trim();

  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  const hms = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    return parseInt(hms[1], 10) * 60 + parseInt(hms[2], 10);
  }

  return null;
}

export function computeAttendanceFromCheckIn(
  checkInTime: string,
  shift: ShiftConfig,
): ComputedAttendance {
  const shiftMinutes = parseTimeToMinutes(shift.startTime) ?? 9 * 60;
  const checkInMinutes = parseTimeToMinutes(checkInTime) ?? 0;

  const delay = Math.max(0, checkInMinutes - shiftMinutes);

  if (delay === 0) {
    return { status: "On Time", minutesDelayed: 0, graceDeducted: 0 };
  }

  // Within grace → still "On Time" for display, but grace is consumed.
  if (delay <= shift.monthlyGraceAllowance) {
    return {
      status: "On Time",
      minutesDelayed: delay,
      graceDeducted: delay,
    };
  }

  // Beyond grace → Late. Grace fully consumed; remainder is late minutes.
  return {
    status: "Late",
    minutesDelayed: delay,
    graceDeducted: shift.monthlyGraceAllowance,
  };
}
