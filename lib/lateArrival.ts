// lib/lateArrival.ts
//
// Side effect for approving a `late_arrivals` request.
//
// Logic: once approved, the request's `newArrivalTime` becomes the effective
// shift start for that day. We recompute the day's status from the actual
// check-in and update:
//   - daily_attendance.{status, minutesDelayed, graceDeducted}
//   - monthly_summaries.{lateDays, graceRemaining, graceUsed}
//
// Refunds the difference between the old and new grace deduction, and
// reconciles lateDays in whichever direction changed.

import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  computeAttendanceFromCheckIn,
  parseTimeToMinutes,
  type ShiftConfig,
} from "./attendanceStatus";

export interface LateArrivalApprovalResult {
  ok: boolean;
  reason?: string;
  oldStatus?: string;
  newStatus?: string;
  graceRefunded?: number;
  lateDaysDelta?: number;
}

const DEFAULT_GRACE = 30;

export async function applyLateArrivalApproval(
  requestDocId: string,
): Promise<LateArrivalApprovalResult> {
  // 1. Read the request doc
  const reqRef = doc(db, "late_arrivals", requestDocId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return { ok: false, reason: "request-not-found" };

  const req = reqSnap.data();
  const reqUserId = String(req.userId || "");
  const reqDate = String(req.date || "");
  const approvedArrival = String(req.newArrivalTime || "");
  if (!reqUserId || !reqDate || !approvedArrival) {
    return { ok: false, reason: "request-missing-fields" };
  }

  // 2. Read the day's attendance doc
  const dailyRef = doc(db, "daily_attendance", `${reqDate}_${reqUserId}`);
  const dailySnap = await getDoc(dailyRef);
  if (!dailySnap.exists()) return { ok: false, reason: "no-checkin-yet" };

  const daily = dailySnap.data();
  const checkIn = String(daily.checkIn || "");
  if (!checkIn) return { ok: false, reason: "no-checkin-time" };

  const oldStatus = String(daily.status || "");
  const oldGraceDeducted = Number(daily.graceDeducted || 0);

  // 3. Read the user's shift config
  const userSnap = await getDoc(doc(db, "users", reqUserId));
  const u = userSnap.data() || {};
  const shiftStart = String(u?.shift?.startTime || "09:00:00");
  const graceAllowance = Number(
    u?.shift?.monthlyGraceAllowance ?? DEFAULT_GRACE,
  );

  // 4. Effective shift start = later of (original shift start, approved arrival).
  //    Protects against a weird case where admin approves an EARLIER time than
  //    the shift start, which would otherwise make the day look later than it is.
  const shiftMin = parseTimeToMinutes(shiftStart) ?? 9 * 60;
  const approvedMin = parseTimeToMinutes(approvedArrival) ?? shiftMin;
  const effectiveStart = approvedMin > shiftMin ? approvedArrival : shiftStart;

  const shift: ShiftConfig = {
    startTime: effectiveStart,
    monthlyGraceAllowance: graceAllowance,
  };

  // 5. Recompute status using the effective shift start
  const computed = computeAttendanceFromCheckIn(checkIn, shift);

  // 6. Update daily_attendance
  await updateDoc(dailyRef, {
    status: computed.status,
    minutesDelayed: computed.minutesDelayed,
    graceDeducted: computed.graceDeducted,
    approvedLateArrivalId: requestDocId,
    updatedAt: new Date().toISOString(),
  });

  // 7. Update monthly_summaries
  const month = reqDate.slice(0, 7);
  const summaryRef = doc(db, "monthly_summaries", `${month}_${reqUserId}`);

  const updates: Record<string, unknown> = {};

  const wasLate = oldStatus === "Late";
  const isLate = computed.status === "Late";
  let lateDaysDelta = 0;

  if (wasLate && !isLate) {
    updates.lateDays = increment(-1);
    lateDaysDelta = -1;
  } else if (!wasLate && isLate) {
    updates.lateDays = increment(1);
    lateDaysDelta = 1;
  }

  const graceDelta = oldGraceDeducted - computed.graceDeducted;
  if (graceDelta !== 0) {
    updates.graceRemaining = increment(graceDelta);
    updates.graceUsed = increment(-graceDelta);
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date().toISOString();
    await setDoc(summaryRef, updates, { merge: true });
  }

  return {
    ok: true,
    oldStatus,
    newStatus: computed.status,
    graceRefunded: graceDelta > 0 ? graceDelta : 0,
    lateDaysDelta,
  };
}
