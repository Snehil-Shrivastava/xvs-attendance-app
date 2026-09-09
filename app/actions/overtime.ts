"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin-file";
import { FieldValue } from "firebase-admin/firestore";

interface AddOvertimeInput {
  userId: string;
  date: string; // "YYYY-MM-DD", e.g. "2026-08-11"
  hours: number;
  minutes: number;
}

export async function addMemberOvertime(
  input: AddOvertimeInput,
  idToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Verify caller session
    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerUid = decoded.uid;

    // 2. Verify admin rights
    const callerSnap = await adminDb.collection("users").doc(callerUid).get();
    const isAdmin = callerSnap.exists && callerSnap.data()?.role === "admin";

    if (!isAdmin && decoded.email) {
      const emailSnap = await adminDb
        .collection("users")
        .where("email", "==", decoded.email)
        .limit(1)
        .get();
      if (emailSnap.empty || emailSnap.docs[0].data()?.role !== "admin") {
        return { success: false, error: "Admin access required." };
      }
    }

    const { userId, date, hours, minutes } = input;
    const additionalMins = Number(hours) * 60 + Number(minutes);

    if (additionalMins <= 0) {
      return {
        success: false,
        error: "Please enter valid overtime hours or minutes.",
      };
    }

    if (!date) {
      return { success: false, error: "Please select a date." };
    }

    const monthStr = date.slice(0, 7); // "YYYY-MM"
    const now = new Date().toISOString();

    // 3. Update or create daily_attendance record: `${date}_${userId}`
    const attendanceDocRef = adminDb
      .collection("daily_attendance")
      .doc(`${date}_${userId}`);

    const existingAtt = await attendanceDocRef.get();
    if (existingAtt.exists) {
      await attendanceDocRef.update({
        overtimeMinutes: FieldValue.increment(additionalMins),
        updatedAt: now,
      });
    } else {
      await attendanceDocRef.set({
        userId,
        date,
        month: monthStr,
        status: "On Time",
        overtimeMinutes: additionalMins,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Increment monthly_summaries record: `${month}_${userId}`
    const summaryDocRef = adminDb
      .collection("monthly_summaries")
      .doc(`${monthStr}_${userId}`);

    const existingSummary = await summaryDocRef.get();
    if (existingSummary.exists) {
      await summaryDocRef.update({
        overtimeMinutes: FieldValue.increment(additionalMins),
        updatedAt: now,
      });
    } else {
      await summaryDocRef.set({
        month: monthStr,
        userId,
        overtimeMinutes: additionalMins,
        lateDays: 0,
        halfDays: 0,
        updatedAt: now,
      });
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("addMemberOvertime error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to record overtime.",
    };
  }
}
