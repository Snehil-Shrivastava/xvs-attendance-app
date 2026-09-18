// lib/lateArrival.ts
//
// Approval side effect for a `late_arrivals` request. The approved
// newArrivalTime becomes the effective shift start for that day.
// After updating the affected daily doc, the entire month is recomputed
// (classification depends on chronological pool order).

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseTimeToMinutes, type ShiftConfig } from "./attendanceStatus";
import { recomputeMonthlyAttendance } from "./monthlySummary";

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
  const userId = String(req.userId || "");
  const date = String(req.date || "");
  const approvedArrival = String(req.newArrivalTime || "");
  if (!userId || !date || !approvedArrival) {
    return { ok: false, reason: "request-missing-fields" };
  }

  const dailyRef = doc(db, "daily_attendance", `${date}_${userId}`);
  const dailySnap = await getDoc(dailyRef);
  if (!dailySnap.exists()) return { ok: false, reason: "no-checkin-yet" };

  const oldStatus = String(dailySnap.data().status || "");

  const userSnap = await getDoc(doc(db, "users", userId));
  const u = userSnap.data() || {};
  const shift: ShiftConfig = {
    startTime: String(u?.shift?.startTime || "09:00:00"),
    monthlyGraceAllowance: Number(
      u?.shift?.monthlyGraceAllowance ?? DEFAULT_GRACE,
    ),
  };

  // Mark the doc so the calendar knows this day has an approved override.
  // (Recompute will pick it up by reading the late_arrivals collection.)
  await updateDoc(dailyRef, {
    approvedLateArrivalId: requestDocId,
    updatedAt: new Date().toISOString(),
  });

  const month = date.slice(0, 7);
  await recomputeMonthlyAttendance(userId, month, shift, String(u.name || ""));

  // For the caller's notification logic
  const shiftMin = parseTimeToMinutes(shift.startTime) ?? 9 * 60;
  const approvedMin = parseTimeToMinutes(approvedArrival) ?? shiftMin;
  return {
    ok: true,
    oldStatus,
    newStatus: approvedMin > shiftMin ? "override-applied" : oldStatus,
  };
}
