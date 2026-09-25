import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseTimeToSeconds, type ShiftConfig } from "./attendanceStatus";

export interface MonthlySummarySnapshot {
  graceTotalSeconds: number;
  graceUsedSeconds: number;
  graceRemainingSeconds: number;
  lateDays: number;
  presentDays: number;
  totalLateSeconds: number;
  totalHoursWorked: number;
}

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
  const dailySnap = await getDocs(
    query(
      collection(db, "daily_attendance"),
      where("userId", "==", userId),
      where("month", "==", month),
    ),
  );

  const lateSnap = await getDocs(
    query(
      collection(db, "late_arrivals"),
      where("userId", "==", userId),
      where("status", "==", "approved"),
    ),
  );

  const overrideByDate: Record<string, string> = {};
  lateSnap.forEach((d) => {
    const data = d.data();
    const date = String(data.date || "");
    const newTime = String(data.newArrivalTime || "");
    if (!date || !newTime) return;
    const newSec = parseTimeToSeconds(newTime) ?? 0;
    const existSec = overrideByDate[date]
      ? (parseTimeToSeconds(overrideByDate[date]) ?? 0)
      : 0;
    if (newSec > existSec) overrideByDate[date] = newTime;
  });

  const days = dailySnap.docs
    .map((d) => ({ ref: d.ref, data: d.data() }))
    .sort((a, b) =>
      String(a.data.date || "").localeCompare(String(b.data.date || "")),
    );

  const gracePoolSec = shift.monthlyGraceAllowance * 60;
  let graceRemainingSec = gracePoolSec;
  let graceUsedSec = 0;
  let lateDays = 0;
  let presentDays = 0;
  let totalLateSec = 0;
  let totalHoursWorked = 0;

  const writes: Promise<unknown>[] = [];

  for (const day of days) {
    const data = day.data;
    const status = String(data.status || "");
    const checkIn = String(data.checkIn || "");
    const dateKey = String(data.date || "");

    totalHoursWorked += Number(data.totalWorkingHours || 0);

    if (NON_WORKING_STATUSES.has(status)) {
      const g = Number(data.graceDeductedSeconds || 0);
      if (g !== 0 || Number(data.delaySeconds || 0) !== 0) {
        writes.push(
          updateDoc(day.ref, {
            graceDeductedSeconds: 0,
            delaySeconds: 0,
            // purge legacy float fields if present
            graceDeducted: deleteField(),
            minutesDelayed: deleteField(),
          }),
        );
      }
      continue;
    }

    if (!checkIn) {
      const stale =
        status === "Late" ||
        Number(data.graceDeductedSeconds || 0) !== 0 ||
        Number(data.delaySeconds || 0) !== 0;
      if (stale) {
        writes.push(
          updateDoc(day.ref, {
            status: "On Time",
            graceDeductedSeconds: 0,
            delaySeconds: 0,
            graceDeducted: deleteField(),
            minutesDelayed: deleteField(),
          }),
        );
      }
      continue;
    }

    const override = overrideByDate[dateKey];
    const normalShiftSec = parseTimeToSeconds(shift.startTime) ?? 9 * 3600 + 60;
    const overrideSec = override ? (parseTimeToSeconds(override) ?? 0) : 0;
    const hasApprovedOverride = overrideSec > normalShiftSec;
    const effectiveShiftStart = hasApprovedOverride
      ? override!
      : shift.startTime;

    const shiftSec = parseTimeToSeconds(effectiveShiftStart) ?? normalShiftSec;
    const checkInSec = parseTimeToSeconds(checkIn) ?? shiftSec;
    const delaySec = Math.max(0, checkInSec - shiftSec);

    let newGraceSec = 0;
    let newStatus: "On Time" | "Late/Allowed" | "Late" = "On Time";

    if (delaySec === 0) {
      newStatus = hasApprovedOverride ? "Late/Allowed" : "On Time";
    } else if (delaySec <= graceRemainingSec) {
      newGraceSec = delaySec;
      graceRemainingSec -= delaySec;
      graceUsedSec += delaySec;
      newStatus = "Late/Allowed";
    } else if (graceRemainingSec > 0) {
      newGraceSec = graceRemainingSec;
      graceUsedSec += graceRemainingSec;
      graceRemainingSec = 0;
      newStatus = "Late";
      totalLateSec += delaySec - newGraceSec;
      lateDays += 1;
    } else {
      newGraceSec = 0;
      newStatus = "Late";
      totalLateSec += delaySec;
      lateDays += 1;
    }

    presentDays += 1;

    const changed =
      status !== newStatus ||
      Number(data.graceDeductedSeconds || 0) !== newGraceSec ||
      Number(data.delaySeconds || 0) !== delaySec;

    if (changed) {
      writes.push(
        updateDoc(day.ref, {
          status: newStatus,
          graceDeductedSeconds: newGraceSec,
          delaySeconds: delaySec,
          // purge legacy float fields
          graceDeducted: deleteField(),
          minutesDelayed: deleteField(),
        }),
      );
    }
  }

  await Promise.all(writes);

  const snapshot: MonthlySummarySnapshot = {
    graceTotalSeconds: gracePoolSec,
    graceUsedSeconds: graceUsedSec,
    graceRemainingSeconds: graceRemainingSec,
    lateDays,
    presentDays,
    totalLateSeconds: totalLateSec,
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
      // purge legacy float fields
      graceTotalAllowed: deleteField(),
      graceUsed: deleteField(),
      graceRemaining: deleteField(),
      totalLateMinutes: deleteField(),
    },
    { merge: true },
  );

  return snapshot;
}
