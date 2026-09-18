// lib/lateArrival.ts
//
// Side effect for approving a `late_arrivals` request.
//
// 1. Approved `newArrivalTime` becomes the effective shift start for that day.
// 2. Recompute daily_attendance status from the actual check-in.
// 3. Recompute the whole month's monthly_summaries from daily_attendance
//    (no incremental deltas — the summary is derived, not tracked).

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  computeAttendanceFromCheckIn,
  parseTimeToMinutes,
  type ShiftConfig,
} from "./attendanceStatus";
import { recomputeMonthlySummary } from "./monthlySummary";

export interface LateArrivalApprovalResult {
  ok: boolean;
  reason?: string;
  oldStatus?: string;
  newStatus?: string;
}

const DEFAULT_GRACE = 30;

export async function applyLateArrivalApproval(
  requestDocId: string,
): Promise<LateArrivalApprovalResult> {
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

  const dailyRef = doc(db, "daily_attendance", `${reqDate}_${reqUserId}`);
  const dailySnap = await getDoc(dailyRef);
  if (!dailySnap.exists()) return { ok: false, reason: "no-checkin-yet" };

  const daily = dailySnap.data();
  const checkIn = String(daily.checkIn || "");
  if (!checkIn) return { ok: false, reason: "no-checkin-time" };

  const oldStatus = String(daily.status || "");

  const userSnap = await getDoc(doc(db, "users", reqUserId));
  const u = userSnap.data() || {};
  const shiftStart = String(u?.shift?.startTime || "09:00:00");
  const graceAllowance = Number(
    u?.shift?.monthlyGraceAllowance ?? DEFAULT_GRACE,
  );

  const shiftMin = parseTimeToMinutes(shiftStart) ?? 9 * 60;
  const approvedMin = parseTimeToMinutes(approvedArrival) ?? shiftMin;
  const effectiveStart = approvedMin > shiftMin ? approvedArrival : shiftStart;

  const shift: ShiftConfig = {
    startTime: effectiveStart,
    monthlyGraceAllowance: graceAllowance,
  };

  const computed = computeAttendanceFromCheckIn(checkIn, shift);

  await updateDoc(dailyRef, {
    status: computed.status,
    minutesDelayed: computed.minutesDelayed,
    graceDeducted: computed.graceDeducted,
    approvedLateArrivalId: requestDocId,
    updatedAt: new Date().toISOString(),
  });

  const month = reqDate.slice(0, 7);
  await recomputeMonthlySummary(reqUserId, month, {
    startTime: String(u?.shift?.startTime || "09:00:00"),
    monthlyGraceAllowance: graceAllowance,
  });

  return { ok: true, oldStatus, newStatus: computed.status };
}
