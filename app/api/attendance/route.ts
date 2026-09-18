import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-file";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getISTDateParts(utcSeconds?: number) {
  const date = utcSeconds ? new Date(utcSeconds * 1000) : new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(
    date.getTime() + date.getTimezoneOffset() * 60000 + istOffsetMs,
  );
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, "0");
  const dd = String(istDate.getDate()).padStart(2, "0");
  const hh = String(istDate.getHours()).padStart(2, "0");
  const min = String(istDate.getMinutes()).padStart(2, "0");
  const ss = String(istDate.getSeconds()).padStart(2, "0");
  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    monthStr: `${yyyy}-${mm}`,
    timeStr: `${hh}:${min}:${ss}`,
    totalMinutes: istDate.getHours() * 60 + istDate.getMinutes(),
  };
}

function plain(msg: string) {
  return new NextResponse(msg, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, step: 3 }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const receivedAt = new Date().toISOString();
  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch {
    bodyText = "";
  }

  console.log("========== DAHUA STEP 3 ==========");
  console.log("receivedAt:", receivedAt);
  console.log("bodyText:", bodyText);

  // Raw archive (keep for now, we remove it later)
  try {
    await adminDb
      .collection("webhook_raw_events")
      .add({ receivedAt, bodyText });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("❌ raw save failed:", e?.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any = null;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    payload = null;
  }
  if (!payload) return plain("OK-NO-JSON");

  const code = String(payload.Code || "");
  const data = payload.Data || {};

  // Ignore DoorStatus Open/Close and anything that is not a verified access event
  if (code !== "AccessControl" || safeNumber(data.Status, -1) !== 1) {
    return plain("OK-IGNORED");
  }

  const userId = String(data.UserID || data.UserId || data.CardNo || "")
    .trim()
    .replace(/[\/\\]/g, "_");
  const employeeName = String(data.CardName || "Employee");

  if (!userId) {
    console.warn("⚠️ AccessControl event without UserID");
    return plain("OK-NO-USER");
  }

  const utc = safeNumber(data.UTC, 0) || safeNumber(data.CreateTime, 0);
  const ist = getISTDateParts(utc || undefined);
  const { dateStr, monthStr, timeStr } = ist;

  console.log(`📌 [PUNCH] ${userId} | ${employeeName} | ${dateStr} ${timeStr}`);

  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    let shiftStartTime = "09:00:00";
    let monthlyGraceAllowed = 30;
    if (userDoc.exists) {
      const u = userDoc.data() || {};
      if (u?.shift?.startTime) shiftStartTime = String(u.shift.startTime);
      if (u?.shift?.monthlyGraceAllowance != null) {
        monthlyGraceAllowed = safeNumber(u.shift.monthlyGraceAllowance, 30);
      }
    }

    const dailyRef = adminDb
      .collection("daily_attendance")
      .doc(`${dateStr}_${userId}`);
    const dailyDoc = await dailyRef.get();
    const monthlyRef = adminDb
      .collection("monthly_summaries")
      .doc(`${monthStr}_${userId}`);
    const monthlyDoc = await monthlyRef.get();

    let graceRemaining = monthlyGraceAllowed;
    let graceUsed = 0;
    let totalLateMins = 0;
    let presentDays = 0;
    let lateDays = 0;
    if (monthlyDoc.exists) {
      const m = monthlyDoc.data() || {};
      graceRemaining = safeNumber(m.graceRemaining, monthlyGraceAllowed);
      graceUsed = safeNumber(m.graceUsed, 0);
      totalLateMins = safeNumber(m.totalLateMinutes, 0);
      presentDays = safeNumber(m.presentDays, 0);
      lateDays = safeNumber(m.lateDays, 0);
    }

    const nowIso = new Date().toISOString();

    // ---------------- FIRST PUNCH = CHECK-IN ----------------
    if (!dailyDoc.exists) {
      const [shRaw, smRaw] = shiftStartTime.split(":");
      const shiftMinutes = safeNumber(shRaw, 9) * 60 + safeNumber(smRaw, 0);
      const delayMins = Math.max(0, ist.totalMinutes - shiftMinutes);

      let graceDeducted = 0;
      let status = "On Time";
      if (delayMins > 0) {
        if (graceRemaining >= delayMins) {
          graceDeducted = delayMins;
          graceRemaining -= delayMins;
          graceUsed += delayMins;
          status = "Grace Used";
        } else if (graceRemaining > 0) {
          graceDeducted = graceRemaining;
          const lateMinutes = delayMins - graceRemaining;
          graceUsed += graceRemaining;
          graceRemaining = 0;
          totalLateMins += lateMinutes;
          lateDays += 1;
          status = "Late";
        } else {
          totalLateMins += delayMins;
          lateDays += 1;
          status = "Late";
        }
      }
      presentDays += 1;

      await dailyRef.set({
        userId,
        name: employeeName,
        date: dateStr,
        month: monthStr,
        checkIn: timeStr,
        checkOut: null,
        scheduledCheckIn: shiftStartTime,
        minutesDelayed: delayMins,
        graceDeducted,
        status,
        totalWorkingHours: 0.0,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      await monthlyRef.set(
        {
          month: monthStr,
          userId,
          name: employeeName,
          graceTotalAllowed: monthlyGraceAllowed,
          graceUsed,
          graceRemaining,
          totalLateMinutes: totalLateMins,
          presentDays,
          lateDays,
          updatedAt: nowIso,
        },
        { merge: true },
      );

      console.log(`✅ CHECK-IN SAVED: ${userId} at ${timeStr} (${status})`);
    } else {
      // ---------------- SECOND PUNCH = CHECK-OUT ----------------
      const d = dailyDoc.data() || {};
      const checkInStr = String(d.checkIn || timeStr);
      let currentStatus = String(d.status || "On Time");

      const [ciHRaw, ciMRaw] = checkInStr.split(":");
      const workedMinutes = Math.max(
        0,
        ist.totalMinutes - (safeNumber(ciHRaw, 0) * 60 + safeNumber(ciMRaw, 0)),
      );
      const workingHours = Number((workedMinutes / 60).toFixed(2));

      if (workingHours < 4.5 && currentStatus !== "Late") {
        currentStatus = "Half Day";
      }

      const prevHours = safeNumber(d.totalWorkingHours, 0);
      const hoursDiff = Math.max(0, workingHours - prevHours);

      await dailyRef.update({
        checkOut: timeStr,
        totalWorkingHours: workingHours,
        status: currentStatus,
        updatedAt: nowIso,
      });

      if (hoursDiff > 0) {
        await monthlyRef.update({
          totalHoursWorked: FieldValue.increment(hoursDiff),
          updatedAt: nowIso,
        });
      }

      console.log(
        `✅ CHECK-OUT UPDATED: ${userId} at ${timeStr} (${workingHours} hrs)`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("❌ ATTENDANCE LOGIC ERROR:", e?.message || e);
  }

  return plain("OK");
}
