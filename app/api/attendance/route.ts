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

// -----------------------------------------------------------

// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-file";
import { FieldValue } from "firebase-admin/firestore";

// Helper: Convert UTC epoch or local string to IST (UTC+5:30)
function getISTDateParts(utcSeconds?: number, localeTimeStr?: string) {
  let date: Date;

  if (utcSeconds) {
    // If Unix timestamp (seconds), convert to ms
    date = new Date(utcSeconds * 1000);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    date = new Date(date.getTime() + istOffsetMs);
  } else if (localeTimeStr) {
    // Already in local format e.g. "2026-09-15 09:14:22"
    const [dPart, tPart] = localeTimeStr.split(" ");
    const [yyyy, mm, dd] = (dPart || "").split("-");
    const [hh, min, ss] = (tPart || "00:00:00").split(":");
    return {
      dateStr: `${yyyy}-${mm}-${dd}`,
      monthStr: `${yyyy}-${mm}`,
      timeStr: `${hh}:${min}:${ss}`,
      hours: Number(hh),
      minutes: Number(min),
      totalMinutes: Number(hh) * 60 + Number(min),
      timestamp: new Date(),
    };
  } else {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    date = new Date(
      now.getTime() + now.getTimezoneOffset() * 60000 + istOffsetMs,
    );
  }

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");

  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    monthStr: `${yyyy}-${mm}`,
    timeStr: `${hh}:${min}:${ss}`,
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
    totalMinutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
    timestamp: date,
  };
}

// -------------------------------------------------------------
// GET: Health check
// -------------------------------------------------------------
export async function GET() {
  console.log("🌐 [GET] Health check accessed on /api/attendance");
  return NextResponse.json(
    { status: "active", service: "Dahua Biometric Receiver on Vercel" },
    { status: 200 },
  );
}

// -------------------------------------------------------------
// POST: Dahua Auto Upload Webhook
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch {
      bodyText = "";
    }

    console.log("\n" + "=".repeat(60));
    console.log("📥 [INCOMING POST REQUEST]");
    console.log("   Content-Length:", bodyText.length);
    console.log("   Raw Payload:", bodyText.slice(0, 500));
    console.log("=".repeat(60));

    // 1. Handle empty ping / Dahua "Test" button probe
    if (!bodyText || bodyText.trim() === "") {
      console.log("🔍 Received empty body / connection test from Dahua");
      return NextResponse.json(
        { code: 200, message: "Test successful" },
        { status: 200 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any = {};
    try {
      payload = JSON.parse(bodyText);
    } catch {
      console.warn("⚠️ Payload is not standard JSON:", bodyText);
      return NextResponse.json(
        { code: 200, message: "Non-JSON ignored" },
        { status: 200 },
      );
    }

    // Support array payload or single object
    if (Array.isArray(payload)) {
      payload = payload[0] || {};
    }

    const code = String(payload.Code || payload.code || "");
    const data = payload.Data || payload.data || {};

    // 2. Extract UserID & verification status flexibly
    const userId = String(
      data.UserID || data.userId || data.User_ID || data.CardNo || "",
    ).trim();
    const employeeName = data.CardName || data.name || "Employee";
    const statusNum = Number(data.Status ?? data.status);

    console.log(
      `🔎 Parsed Event: Code="${code}", Status=${statusNum}, UserID="${userId}"`,
    );

    // Audit log: Always write raw payload to Firestore so you can verify it
    try {
      await adminDb.collection("raw_punches").add({
        raw: payload,
        receivedAt: new Date().toISOString(),
        userId: userId || "unknown",
        code,
      });
    } catch (auditErr) {
      console.error("Failed to write audit log:", auditErr);
    }

    // Verify AccessControl event and successful scan (Status 1 or 0 depending on firmware)
    const isAccessEvent =
      code.toLowerCase().includes("accesscontrol") ||
      code.toLowerCase().includes("unlock") ||
      code === "";

    if (
      !isAccessEvent ||
      (statusNum !== 1 && statusNum !== 0 && !isNaN(statusNum))
    ) {
      console.log(
        `ℹ️ Ignored non-access or unverified event: Code=${code}, Status=${statusNum}`,
      );
      return NextResponse.json(
        { code: 200, message: "Event ignored" },
        { status: 200 },
      );
    }

    if (!userId) {
      console.warn("⚠️ Received verified event but UserID is missing!");
      return NextResponse.json(
        { code: 400, message: "Missing UserID" },
        { status: 400 },
      );
    }

    // 3. Process Check-In / Check-Out
    const ist = getISTDateParts(data.UTC || data.CreateTime, data.LocaleTime);
    const { dateStr, monthStr, timeStr } = ist;

    console.log(
      `📌 Processing Attendance for User: ${userId} on ${dateStr} at ${timeStr} (IST)`,
    );

    // Fetch shift settings
    const userDoc = await adminDb.collection("users").doc(userId).get();
    let shiftStartTime = "09:00:00";
    let monthlyGraceAllowed = 30;

    if (userDoc.exists) {
      const uData = userDoc.data();
      if (uData?.shift?.startTime) shiftStartTime = uData.shift.startTime;
      if (uData?.shift?.monthlyGraceAllowance != null) {
        monthlyGraceAllowed = Number(uData.shift.monthlyGraceAllowance);
      }
    } else {
      console.warn(
        `⚠️ User "${userId}" not found in Firestore "users" collection! Proceeding with defaults.`,
      );
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
      const mData = monthlyDoc.data() || {};
      graceRemaining = mData.graceRemaining ?? monthlyGraceAllowed;
      graceUsed = mData.graceUsed ?? 0;
      totalLateMins = mData.totalLateMinutes ?? 0;
      presentDays = mData.presentDays ?? 0;
      lateDays = mData.lateDays ?? 0;
    }

    const nowIso = new Date().toISOString();

    // -------------------------------------------------------
    // FIRST PUNCH OF THE DAY -> CHECK-IN
    // -------------------------------------------------------
    if (!dailyDoc.exists) {
      const [sh, sm] = shiftStartTime.split(":").map(Number);
      const shiftMinutes = sh * 60 + sm;
      const delayMins = Math.max(0, ist.totalMinutes - shiftMinutes);

      let graceDeducted = 0;
      let lateMinutes = 0;
      let status = "On Time";

      if (delayMins > 0) {
        if (graceRemaining >= delayMins) {
          graceDeducted = delayMins;
          graceRemaining -= delayMins;
          graceUsed += delayMins;
          status = "Grace Used";
        } else if (graceRemaining > 0) {
          graceDeducted = graceRemaining;
          lateMinutes = delayMins - graceRemaining;
          graceUsed += graceRemaining;
          graceRemaining = 0;
          totalLateMins += lateMinutes;
          lateDays += 1;
          status = "Late";
        } else {
          lateMinutes = delayMins;
          totalLateMins += lateMinutes;
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

      console.log(
        `✅ [CHECK-IN RECORDED] User: ${userId} | Time: ${timeStr} | Status: ${status}`,
      );
    } else {
      // -------------------------------------------------------
      // SUBSEQUENT PUNCH -> CHECK-OUT
      // -------------------------------------------------------
      const dData = dailyDoc.data() || {};
      const checkInStr = dData.checkIn || timeStr;
      let currentStatus = dData.status || "On Time";

      const [ciH, ciM] = checkInStr.split(":").map(Number);
      const workedMinutes = Math.max(0, ist.totalMinutes - (ciH * 60 + ciM));
      const workingHours = Number((workedMinutes / 60).toFixed(2));

      if (workingHours < 4.5 && currentStatus !== "Late") {
        currentStatus = "Half Day";
      }

      const prevHours = Number(dData.totalWorkingHours || 0);
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
        `✅ [CHECK-OUT UPDATED] User: ${userId} | Time: ${timeStr} | Hours: ${workingHours} hrs`,
      );
    }

    return NextResponse.json(
      { code: 200, message: "Success" },
      { status: 200 },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("❌ Attendance Webhook Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Error" },
      { status: 500 },
    );
  }
}
