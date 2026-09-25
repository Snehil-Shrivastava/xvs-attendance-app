// lib/attendanceStatus.ts
//
// Classification rules (locked):
//   delay = 0, no override                    → "On Time"       (0 grace)
//   delay = 0, approved override              → "Late/Allowed"  (0 grace)
//   0 < delay ≤ graceRemaining                → "Late/Allowed"  (delay consumed)
//   delay > graceRemaining                    → "Late"          (pool drained,
//                                                                 remainder counted)
//
// Grace pool is shared across the month. Only "Late/Allowed" consumes it.

export interface ShiftConfig {
  startTime: string;
  monthlyGraceAllowance: number; // MINUTES
}

export type ComputedAttendanceStatus = "On Time" | "Late/Allowed" | "Late";

export interface ComputedAttendance {
  status: ComputedAttendanceStatus;
  delaySeconds: number;
  graceDeductedSeconds: number;
}

export function parseTimeToSeconds(t: string): number | null {
  if (!t) return null;
  const s = t.trim();

  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 3600 + m * 60;
  }

  const hms = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    const h = parseInt(hms[1], 10);
    const m = parseInt(hms[2], 10);
    const sec = hms[3] ? parseInt(hms[3], 10) : 0;
    return h * 3600 + m * 60 + sec;
  }
  return null;
}

export function computeAttendanceFromCheckIn(
  checkInTime: string,
  shift: ShiftConfig,
  hasApprovedLateArrival = false,
  graceRemainingSeconds?: number, // pass current pool to classify correctly
): ComputedAttendance {
  const shiftSec = parseTimeToSeconds(shift.startTime) ?? 9 * 3600 + 60;
  const checkInSec = parseTimeToSeconds(checkInTime) ?? 0;
  const poolSec = graceRemainingSeconds ?? shift.monthlyGraceAllowance * 60;

  const delaySeconds = Math.max(0, checkInSec - shiftSec);

  if (delaySeconds === 0) {
    return {
      status: hasApprovedLateArrival ? "Late/Allowed" : "On Time",
      delaySeconds: 0,
      graceDeductedSeconds: 0,
    };
  }

  if (delaySeconds <= poolSec) {
    return {
      status: "Late/Allowed",
      delaySeconds,
      graceDeductedSeconds: delaySeconds,
    };
  }

  // Beyond grace → Late. Pool is drained; remainder is pure late time.
  return {
    status: "Late",
    delaySeconds,
    graceDeductedSeconds: poolSec,
  };
}
