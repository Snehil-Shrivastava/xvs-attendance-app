import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-file";
import { notifyAdminsOfMissingAttendance } from "@/app/actions/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getLocalDateString(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  // Optional but recommended: Secure the endpoint so random people can't trigger it
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = getLocalDateString();
  const dayOfWeek = new Date().getDay();

  // 1. Skip weekends (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ ok: true, message: "Weekend - skipped" });
  }

  try {
    // 2. Skip if today is a holiday
    const holidaySnap = await adminDb
      .collection("holidays")
      .where("date", "==", today)
      .limit(1)
      .get();
    if (!holidaySnap.empty) {
      return NextResponse.json({ ok: true, message: "Holiday - skipped" });
    }

    // 3. Idempotency check: Has the alert already been sent today?
    const existingNotif = await adminDb
      .collection("notifications")
      .where("title", ">=", "Attendance Alert:")
      .where("createdAt", ">=", `${today}T00:00:00.000Z`)
      .limit(1)
      .get();
    if (!existingNotif.empty) {
      return NextResponse.json({
        ok: true,
        message: "Alert already sent today",
      });
    }

    // 4. Fetch all active users
    const usersSnap = await adminDb
      .collection("users")
      .where("isActive", "==", true)
      .get();
    const activeUsers = usersSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name || "Employee",
    }));

    // 5. Fetch today's attendance
    const attendanceSnap = await adminDb
      .collection("daily_attendance")
      .where("date", "==", today)
      .get();
    const usersWithAttendance = new Set(
      attendanceSnap.docs.map((d) => d.data().userId),
    );

    // 6. Fetch today's approved leaves
    const leavesSnap = await adminDb
      .collection("leaves")
      .where("status", "==", "approved")
      .where("startDate", "<=", today)
      .get();

    const usersOnLeave = new Set();
    leavesSnap.forEach((d) => {
      const data = d.data();
      const end = data.endDate || data.startDate;
      if (end >= today) usersOnLeave.add(data.userId);
    });

    // 7. Find missing users
    const missingUsers = activeUsers.filter(
      (u) => !usersWithAttendance.has(u.id) && !usersOnLeave.has(u.id),
    );

    if (missingUsers.length > 0) {
      const names = missingUsers.map((u) => u.name);
      console.log(`[Cron] Missing attendance for:`, names);
      await notifyAdminsOfMissingAttendance(names);
    }

    return NextResponse.json({
      ok: true,
      date: today,
      missingCount: missingUsers.length,
      missingUsers: missingUsers.map((u) => u.name),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("[Cron] Absence check failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
