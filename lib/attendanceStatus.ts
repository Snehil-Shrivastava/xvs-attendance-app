// lib/attendanceStatus.ts
//
// Shared status-classification logic for check-in times.
// Used by both the webhook handler and the admin calendar override so a day
// classified automatically and a day classified manually show identical results.

export interface ShiftConfig {
  startTime: string; // "09:00:00" or "09:00"
  monthlyGraceAllowance: number; // minutes
}

export type ComputedAttendanceStatus = "On Time" | "Grace Used" | "Late";

export interface ComputedAttendance {
  status: ComputedAttendanceStatus;
  minutesDelayed: number;
  graceDeducted: number;
}

export function computeAttendanceFromCheckIn(
  checkInTime: string, // "HH:MM" or "HH:MM:SS"
  shift: ShiftConfig,
): ComputedAttendance {
  const [shH, shM] = shift.startTime.split(":").map(Number);
  const shiftMinutes = (shH || 9) * 60 + (shM || 0);

  const [ciH, ciM] = checkInTime.split(":").map(Number);
  const checkInMinutes = (ciH || 0) * 60 + (ciM || 0);

  const delay = Math.max(0, checkInMinutes - shiftMinutes);

  if (delay === 0) {
    return { status: "On Time", minutesDelayed: 0, graceDeducted: 0 };
  }

  if (delay <= shift.monthlyGraceAllowance) {
    return {
      status: "Grace Used",
      minutesDelayed: delay,
      graceDeducted: delay,
    };
  }

  return {
    status: "Late",
    minutesDelayed: delay,
    graceDeducted: shift.monthlyGraceAllowance,
  };
}
