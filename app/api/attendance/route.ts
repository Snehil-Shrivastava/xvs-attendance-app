// // app/api/attendance/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { adminDb } from "@/lib/firebase-admin-file";
// import { FieldValue } from "firebase-admin/firestore";

// // Helper: Convert UTC epoch / time to IST (UTC+5:30)
// function getISTDateParts(utcSeconds?: number, localeTimeStr?: string) {
//   let date: Date;

//   if (utcSeconds) {
//     date = new Date(utcSeconds * 1000);
//   } else if (localeTimeStr) {
//     date = new Date(localeTimeStr);
//   } else {
//     date = new Date();
//   }

//   // Offset by +5:30 for Indian Standard Time
//   const istOffsetMs = 5.5 * 60 * 60 * 1000;
//   const istDate = new Date(
//     date.getTime() + date.getTimezoneOffset() * 60000 + istOffsetMs,
//   );

//   const yyyy = istDate.getFullYear();
//   const mm = String(istDate.getMonth() + 1).padStart(2, "0");
//   const dd = String(istDate.getDate()).padStart(2, "0");
//   const hh = String(istDate.getHours()).padStart(2, "0");
//   const min = String(istDate.getMinutes()).padStart(2, "0");
//   const ss = String(istDate.getSeconds()).padStart(2, "0");

//   return {
//     dateStr: `${yyyy}-${mm}-${dd}`,
//     monthStr: `${yyyy}-${mm}`,
//     timeStr: `${hh}:${min}:${ss}`,
//     hours: istDate.getHours(),
//     minutes: istDate.getMinutes(),
//     totalMinutes: istDate.getHours() * 60 + istDate.getMinutes(),
//     timestamp: istDate,
//   };
// }

// // -------------------------------------------------------------
// // GET: Health check & browser test
// // -------------------------------------------------------------
// export async function GET() {
//   return NextResponse.json(
//     { status: "active", service: "Dahua Biometric Receiver on Vercel" },
//     { status: 200 },
//   );
// }

// // -------------------------------------------------------------
// // POST: Dahua Auto Upload Webhook
// // -------------------------------------------------------------
// export async function POST(req: NextRequest) {
//   try {
//     let bodyText = "";
//     try {
//       bodyText = await req.text();
//     } catch {
//       bodyText = "";
//     }

//     // 1. Handle empty ping / Dahua "Test" button probe
//     if (!bodyText || bodyText.trim() === "") {
//       console.log("🔍 Received Dahua test ping on Vercel");
//       return NextResponse.json(
//         { code: 200, message: "Test successful" },
//         { status: 200 },
//       );
//     }

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     let payload: any = {};
//     try {
//       payload = JSON.parse(bodyText);
//     } catch {
//       console.warn("⚠️ Could not parse JSON from Dahua:", bodyText);
//       return NextResponse.json(
//         { code: 200, message: "Ignored non-json" },
//         { status: 200 },
//       );
//     }

//     const code = payload.Code;
//     const data = payload.Data || {};

//     // 2. Only process verified access control events (Status == 1)
//     if (code === "AccessControl" && data.Status === 1) {
//       const userId = String(data.UserID || "").trim();
//       const employeeName = data.CardName || "Employee";

//       if (!userId) {
//         return NextResponse.json(
//           { code: 400, message: "Missing UserID" },
//           { status: 400 },
//         );
//       }

//       // Calculate IST Date and Time
//       const ist = getISTDateParts(data.UTC || data.CreateTime, data.LocaleTime);
//       const { dateStr, monthStr, timeStr } = ist;

//       console.log(
//         `📌 [PUNCH] User: ${userId} | Date: ${dateStr} | Time: ${timeStr}`,
//       );

//       // 3. Fetch user's shift start & monthly grace allowance from Firestore
//       const userDoc = await adminDb.collection("users").doc(userId).get();
//       let shiftStartTime = "09:00:00";
//       let monthlyGraceAllowed = 30;

//       if (userDoc.exists) {
//         const uData = userDoc.data();
//         if (uData?.shift?.startTime) shiftStartTime = uData.shift.startTime;
//         if (uData?.shift?.monthlyGraceAllowance != null) {
//           monthlyGraceAllowed = Number(uData.shift.monthlyGraceAllowance);
//         }
//       }

//       const dailyRef = adminDb
//         .collection("daily_attendance")
//         .doc(`${dateStr}_${userId}`);
//       const dailyDoc = await dailyRef.get();

//       const monthlyRef = adminDb
//         .collection("monthly_summaries")
//         .doc(`${monthStr}_${userId}`);
//       const monthlyDoc = await monthlyRef.get();

//       // Read current monthly grace pool
//       let graceRemaining = monthlyGraceAllowed;
//       let graceUsed = 0;
//       let totalLateMins = 0;
//       let presentDays = 0;
//       let lateDays = 0;

//       if (monthlyDoc.exists) {
//         const mData = monthlyDoc.data() || {};
//         graceRemaining = mData.graceRemaining ?? monthlyGraceAllowed;
//         graceUsed = mData.graceUsed ?? 0;
//         totalLateMins = mData.totalLateMinutes ?? 0;
//         presentDays = mData.presentDays ?? 0;
//         lateDays = mData.lateDays ?? 0;
//       }

//       const nowIso = new Date().toISOString();

//       // -------------------------------------------------------
//       // FIRST PUNCH OF THE DAY -> CHECK-IN
//       // -------------------------------------------------------
//       if (!dailyDoc.exists) {
//         const [sh, sm] = shiftStartTime.split(":").map(Number);
//         const shiftMinutes = sh * 60 + sm;
//         const delayMins = Math.max(0, ist.totalMinutes - shiftMinutes);

//         let graceDeducted = 0;
//         let lateMinutes = 0;
//         let status = "On Time";

//         if (delayMins > 0) {
//           if (graceRemaining >= delayMins) {
//             graceDeducted = delayMins;
//             graceRemaining -= delayMins;
//             graceUsed += delayMins;
//             status = "Grace Used";
//           } else if (graceRemaining > 0) {
//             graceDeducted = graceRemaining;
//             lateMinutes = delayMins - graceRemaining;
//             graceUsed += graceRemaining;
//             graceRemaining = 0;
//             totalLateMins += lateMinutes;
//             lateDays += 1;
//             status = "Late";
//           } else {
//             lateMinutes = delayMins;
//             totalLateMins += lateMinutes;
//             lateDays += 1;
//             status = "Late";
//           }
//         }

//         presentDays += 1;

//         // Save check-in
//         await dailyRef.set({
//           userId,
//           name: employeeName,
//           date: dateStr,
//           month: monthStr,
//           checkIn: timeStr,
//           checkOut: null,
//           scheduledCheckIn: shiftStartTime,
//           minutesDelayed: delayMins,
//           graceDeducted,
//           status,
//           totalWorkingHours: 0.0,
//           createdAt: nowIso,
//           updatedAt: nowIso,
//         });

//         // Update monthly summaries
//         await monthlyRef.set(
//           {
//             month: monthStr,
//             userId,
//             name: employeeName,
//             graceTotalAllowed: monthlyGraceAllowed,
//             graceUsed,
//             graceRemaining,
//             totalLateMinutes: totalLateMins,
//             presentDays,
//             lateDays,
//             updatedAt: nowIso,
//           },
//           { merge: true },
//         );

//         console.log(`✅ CHECK-IN SAVED: ${userId} at ${timeStr} (${status})`);
//       } else {
//         // -------------------------------------------------------
//         // SUBSEQUENT PUNCH -> CHECK-OUT
//         // -------------------------------------------------------
//         const dData = dailyDoc.data() || {};
//         const checkInStr = dData.checkIn || timeStr;
//         let currentStatus = dData.status || "On Time";

//         // Calculate hours worked
//         const [ciH, ciM] = checkInStr.split(":").map(Number);
//         const workedMinutes = Math.max(0, ist.totalMinutes - (ciH * 60 + ciM));
//         const workingHours = Number((workedMinutes / 60).toFixed(2));

//         // Mark Half Day if employee worked less than 4.5 hours (unless marked Late)
//         if (workingHours < 4.5 && currentStatus !== "Late") {
//           currentStatus = "Half Day";
//         }

//         const prevHours = Number(dData.totalWorkingHours || 0);
//         const hoursDiff = Math.max(0, workingHours - prevHours);

//         await dailyRef.update({
//           checkOut: timeStr,
//           totalWorkingHours: workingHours,
//           status: currentStatus,
//           updatedAt: nowIso,
//         });

//         if (hoursDiff > 0) {
//           await monthlyRef.update({
//             totalHoursWorked: FieldValue.increment(hoursDiff),
//             updatedAt: nowIso,
//           });
//         }

//         console.log(
//           `✅ CHECK-OUT UPDATED: ${userId} at ${timeStr} (${workingHours} hrs)`,
//         );
//       }
//     }

//     return NextResponse.json(
//       { code: 200, message: "Success" },
//       { status: 200 },
//     );
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (error: any) {
//     console.error("❌ Attendance Webhook Error:", error);
//     return NextResponse.json(
//       { error: error?.message || "Internal Error" },
//       { status: 500 },
//     );
//   }
// }

// -------------------------------------------------------------------------

// app/api/attendance/route.ts
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
