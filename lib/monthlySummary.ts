// lib/monthlySummary.ts
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseTimeToMinutes, type ShiftConfig } from "./attendanceStatus";

export interface MonthlySummarySnapshot {
  graceTotalAllowed: number;
  graceUsed: number;
  graceRemaining: number;
  lateDays: number;
  presentDays: number;
  totalLateMinutes: number;
  totalHoursWorked: number;
}

// Statuses that sit outside the grace pool. They neither consume grace nor
// get re-classified by the recompute.
const NON_WORKING_STATUSES = new Set([
  "Absent",
  "On Leave",
  "Half Day",
  "WFH",
  "Work from Home",
  "Holiday",
]);

export async function recomputeMonthlyAttendance(
  userId: string,
  month: string,
  shift: ShiftConfig,
  userName?: string,
): Promise<MonthlySummarySnapshot> {
  // 1. Fetch every daily_attendance doc for this user+month
  const dailySnap = await getDocs(
    query(
      collection(db, "daily_attendance"),
      where("userId", "==", userId),
      where("month", "==", month),
    ),
  );

  // 2. Fetch approved late_arrivals for this user (for per-day shift override)
  const lateSnap = await getDocs(
    query(
      collection(db, "late_arrivals"),
      where("userId", "==", userId),
      where("status", "==", "approved"),
    ),
  );
  // date -> latest approved arrival time (if multiple, take the latest)
  const overrideByDate: Record<string, string> = {};
  lateSnap.forEach((d) => {
    const data = d.data();
    const date = String(data.date || "");
    const newTime = String(data.newArrivalTime || "");
    if (!date || !newTime) return;
    const existing = overrideByDate[date];
    const newMin = parseTimeToMinutes(newTime) ?? 0;
    const existMin = existing ? (parseTimeToMinutes(existing) ?? 0) : 0;
    if (newMin > existMin) overrideByDate[date] = newTime;
  });

  // 3. Sort chronologically (YYYY-MM-DD sorts lexicographically)
  const days = dailySnap.docs
    .map((d) => ({ ref: d.ref, data: d.data() }))
    .sort((a, b) =>
      String(a.data.date || "").localeCompare(String(b.data.date || "")),
    );

  // 4. Iterate in order, tracking the shared grace pool
  let graceRemaining = shift.monthlyGraceAllowance;
  let graceUsed = 0;
  let lateDays = 0;
  let presentDays = 0;
  let totalLateMinutes = 0;
  let totalHoursWorked = 0;

  const writes: Promise<unknown>[] = [];

  for (const day of days) {
    const data = day.data;
    const status = String(data.status || "");
    const checkIn = String(data.checkIn || "");
    const dateKey = String(data.date || "");

    totalHoursWorked += Number(data.totalWorkingHours || 0);

    // Non-working days never touch grace. Clear any stale grace fields.
    if (NON_WORKING_STATUSES.has(status)) {
      if (Number(data.graceDeducted || 0) !== 0) {
        writes.push(
          updateDoc(day.ref, { graceDeducted: 0, minutesDelayed: 0 }),
        );
      }
      continue;
    }

    // No check-in yet → nothing to classify, ensure clean state.
    if (!checkIn) {
      if (
        status === "Late" ||
        Number(data.graceDeducted || 0) !== 0 ||
        Number(data.minutesDelayed || 0) !== 0
      ) {
        writes.push(
          updateDoc(day.ref, {
            status: "On Time",
            graceDeducted: 0,
            minutesDelayed: 0,
          }),
        );
      }
      continue;
    }

    // Effective shift start for the day (approved late-arrival override wins)
    const override = overrideByDate[dateKey];
    const shiftStart = override || shift.startTime;
    const shiftMin = parseTimeToMinutes(shiftStart) ?? 9 * 60;
    const checkInMin = parseTimeToMinutes(checkIn) ?? shiftMin;
    const delay = Math.max(0, checkInMin - shiftMin);

    let newGraceDeducted = 0;
    let newStatus: "On Time" | "Late" = "On Time";

    if (delay === 0) {
      newStatus = "On Time";
    } else if (delay <= graceRemaining) {
      // Fits entirely within the pool → still On Time, but pool shrinks.
      newGraceDeducted = delay;
      graceRemaining -= delay;
      graceUsed += delay;
      newStatus = "On Time";
    } else if (graceRemaining > 0) {
      // Partial: pool covers some, remainder is late.
      newGraceDeducted = graceRemaining;
      graceUsed += graceRemaining;
      graceRemaining = 0;
      newStatus = "Late";
      totalLateMinutes += delay - newGraceDeducted;
      lateDays += 1;
    } else {
      // Pool exhausted → fully late.
      newGraceDeducted = 0;
      newStatus = "Late";
      totalLateMinutes += delay;
      lateDays += 1;
    }

    presentDays += 1;

    const changed =
      status !== newStatus ||
      Number(data.graceDeducted || 0) !== newGraceDeducted ||
      Number(data.minutesDelayed || 0) !== delay;

    if (changed) {
      writes.push(
        updateDoc(day.ref, {
          status: newStatus,
          graceDeducted: newGraceDeducted,
          minutesDelayed: delay,
        }),
      );
    }
  }

  await Promise.all(writes);

  // 5. Persist the summary
  const snapshot: MonthlySummarySnapshot = {
    graceTotalAllowed: shift.monthlyGraceAllowance,
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
      ...(userName ? { name: userName } : {}),
      ...snapshot,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return snapshot;
}
