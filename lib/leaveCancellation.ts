// lib/leaveCancellation.ts
//
// Side effect fired when the admin approves a `leave_cancellations` request:
// flips the original leave doc's status to "cancelled" so it drops out of
// every leave-balance calculation and shows a "Cancelled" badge everywhere.

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface LeaveCancellationApprovalResult {
  ok: boolean;
  reason?: string;
}

export async function applyLeaveCancellationApproval(
  cancellationRequestId: string,
): Promise<LeaveCancellationApprovalResult> {
  const reqRef = doc(db, "leave_cancellations", cancellationRequestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return { ok: false, reason: "request-not-found" };

  const req = reqSnap.data();
  const leaveId = String(req.leaveId || "");
  if (!leaveId) return { ok: false, reason: "missing-leave-id" };

  const leaveRef = doc(db, "leaves", leaveId);
  const leaveSnap = await getDoc(leaveRef);
  if (!leaveSnap.exists()) return { ok: false, reason: "leave-not-found" };

  const nowIso = new Date().toISOString();
  await updateDoc(leaveRef, {
    status: "cancelled",
    cancelledAt: nowIso,
    cancelledByUserId: String(req.userId || ""),
    cancellationRequestId,
  });

  return { ok: true };
}
