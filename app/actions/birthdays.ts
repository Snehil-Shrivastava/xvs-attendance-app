"use server";

import { adminDb } from "@/lib/firebase-admin-file";

export interface BirthdayUser {
  id: string;
  name: string;
  photoUrl?: string;
  dob?: string;
}

function isBirthdayToday(dobStr: string | undefined, now: Date): boolean {
  if (!dobStr) return false;

  const day = now.getDate();
  const month = now.getMonth();

  // Try direct Date parsing first ("1996-09-08" or "08 September 1996")
  const parsed = new Date(dobStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.getDate() === day && parsed.getMonth() === month;
  }

  // Fallback for custom string formats
  const parts = dobStr.split(/[-/.\s]+/);
  if (parts.length >= 2) {
    const d = parseInt(parts[0], 10) || parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    return d === day && m === month;
  }

  return false;
}

/**
 * Returns all active users whose birthday is today.
 * Runs with the Admin SDK, so it bypasses Firestore rules.
 * Only exposes the 4 fields the banner needs — never the full doc.
 */
export async function getTodayBirthdays(): Promise<BirthdayUser[]> {
  try {
    const snap = await adminDb
      .collection("users")
      .where("isActive", "==", true)
      .get();

    const now = new Date();
    const result: BirthdayUser[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      if (!isBirthdayToday(data.dob, now)) return;

      result.push({
        id: doc.id,
        name: String(data.name || "Employee"),
        photoUrl: data.photoUrl,
        dob: data.dob,
      });
    });

    return result;
  } catch (err) {
    console.error("getTodayBirthdays failed:", err);
    return [];
  }
}
