// lib/monthlySummary.ts
//
// Recomputes a user's monthly_summaries doc from scratch by aggregating all
// daily_attendance docs for the given month.
//
// Why recompute instead of incremental updates?
// The previous approach applied `increment(±delta)` on every write. Any
// drift (from webhook races, earlier buggy patches, manual testing) became
// permanent because nothing ever reset the baseline. Recomputing guarantees
// the summary always matches the raw daily records.

import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ShiftConfig } from "./attendanceStatus";

export interface MonthlySummarySnapshot {
  graceTotalAllowed: number;
  graceUsed: number;
  graceRemaining: number;
  lateDays: number;
  presentDays: number;
  totalLateMinutes: number;
  totalHoursWorked: number;
}

export async function recomputeMonthlySummary(
  userId: string,
  month: string,
  shift: ShiftConfig,
  name?: string,
): Promise<MonthlySummarySnapshot> {
  const q = query(
    collection(db, "daily_attendance"),
    where("userId", "==", userId),
    where("month", "==", month),
  );
  const snap = await getDocs(q);

  let graceUsed = 0;
  let lateDays = 0;
  let presentDays = 0;
  let totalLateMinutes = 0;
  let totalHoursWorked = 0;

  snap.forEach((d) => {
    const data = d.data();
    const gd = Number(data.graceDeducted || 0);
    graceUsed += gd;

    const status = String(data.status || "");
    if (status === "Late") {
      lateDays += 1;
      const delay = Number(data.minutesDelayed || 0);
      totalLateMinutes += Math.max(0, delay - gd);
    }

    if (data.checkIn) presentDays += 1;
    totalHoursWorked += Number(data.totalWorkingHours || 0);
  });

  const graceTotalAllowed = shift.monthlyGraceAllowance;
  const graceRemaining = Math.max(0, graceTotalAllowed - graceUsed);

  const result: MonthlySummarySnapshot = {
    graceTotalAllowed,
    graceUsed,
    graceRemaining,
    lateDays,
    presentDays,
    totalLateMinutes,
    totalHoursWorked,
  };

  await setDoc(
    doc(db, "monthly_summaries", `${month}_${userId}`),
    {
      userId,
      month,
      ...(name ? { name } : {}),
      ...result,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return result;
}
