"use server";

import { adminAuth, adminDb } from "@/lib/firebase-admin-file";

export interface CreateTeamMemberInput {
  userId: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: "employee" | "admin";
  annualQuota: number;
  monthlyGraceMinutes: number;
  shiftStart: string;
  shiftEnd: string;
  mustChangePassword: boolean;
}

const DEFAULT_AVATAR_URL = "";

export async function createTeamMember(
  input: CreateTeamMemberInput,
  idToken: string,
): Promise<{ success: boolean; userId?: string; error?: string }> {
  /* ---------- 1. Caller must be an admin ---------- */
  let callerUid: string;
  let callerEmail: string | undefined;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    callerUid = decoded.uid;
    callerEmail = decoded.email;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || "unknown";
    console.error(
      "❌ createTeamMember: ID token verification failed →",
      code,
      err,
    );

    if (code === "auth/id-token-expired") {
      return { success: false, error: "Session expired. Please log in again." };
    }
    if (code === "auth/argument-error") {
      return {
        success: false,
        error:
          "Session token rejected: client and server Firebase project IDs do not match.",
      };
    }
    return {
      success: false,
      error: `Could not verify your session (${code}).`,
    };
  }

  // Check admin rights: test by UID first, then fall back to email lookup
  try {
    let isAdmin = false;
    const callerSnap = await adminDb.collection("users").doc(callerUid).get();

    if (callerSnap.exists && callerSnap.data()?.role === "admin") {
      isAdmin = true;
    } else if (callerEmail) {
      const emailQuery = await adminDb
        .collection("users")
        .where("email", "==", callerEmail)
        .limit(1)
        .get();

      if (!emailQuery.empty && emailQuery.docs[0].data()?.role === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return { success: false, error: "Admin access required." };
    }
  } catch (err: unknown) {
    console.error("createTeamMember caller check error:", err);
    return {
      success: false,
      error: "Could not verify admin rights. Try again.",
    };
  }

  /* ---------- 2. Validate inputs ---------- */
  const userId = input.userId.trim();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const department = input.department.trim();
  const quota = Number(input.annualQuota);
  const grace = Number(input.monthlyGraceMinutes);

  if (!/^\d{3,8}$/.test(userId))
    return { success: false, error: "User ID must be numeric (e.g. 1006)." };
  if (!name) return { success: false, error: "Full name is required." };
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { success: false, error: "Enter a valid email address." };
  if (!input.password || input.password.length < 8)
    return { success: false, error: "Password must be at least 8 characters." };
  if (!department) return { success: false, error: "Department is required." };
  if (Number.isNaN(quota) || quota < 0)
    return {
      success: false,
      error: "Annual leave quota must be a valid number.",
    };
  if (Number.isNaN(grace) || grace < 0)
    return { success: false, error: "Grace minutes must be a valid number." };

  /* ---------- 3. Uniqueness checks ---------- */
  try {
    const existingDoc = await adminDb.collection("users").doc(userId).get();
    if (existingDoc.exists)
      return { success: false, error: `User ID "${userId}" is already taken.` };
  } catch (err: unknown) {
    console.error("createTeamMember lookup error:", err);
    return { success: false, error: "Could not verify User ID availability." };
  }

  try {
    await adminAuth.getUser(userId);
    return { success: false, error: `A login for "${userId}" already exists.` };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== "auth/user-not-found") {
      return {
        success: false,
        error: "Could not verify User ID availability.",
      };
    }
  }

  /* ---------- 4. Create Auth user with custom UID ---------- */
  try {
    await adminAuth.createUser({
      uid: userId,
      email,
      password: input.password,
      displayName: name,
      photoURL: DEFAULT_AVATAR_URL,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    console.error("createTeamMember auth error:", err);
    if (code === "auth/email-already-exists")
      return { success: false, error: "That email is already registered." };
    if (code === "auth/invalid-password")
      return { success: false, error: "Password is too weak." };
    return { success: false, error: "Failed to create the login account." };
  }

  /* ---------- 5. Firestore profile ---------- */
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const month = now.slice(0, 7);

  try {
    await adminDb
      .collection("users")
      .doc(userId)
      .set(
        {
          userId,
          name,
          email,
          photoURL: DEFAULT_AVATAR_URL,
          department,
          role: input.role,
          mustChangePassword: input.mustChangePassword,
          isActive: true,
          shift: {
            startTime: `${input.shiftStart || "09:00"}:00`,
            endTime: `${input.shiftEnd || "17:00"}:00`,
            monthlyGraceAllowance: grace,
          },
          leaves: {
            annualQuota: quota,
            used: 0,
            remaining: quota,
            year,
          },
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
  } catch (err: unknown) {
    console.error("createTeamMember profile error:", err);
    await adminAuth.deleteUser(userId).catch(() => {});
    return {
      success: false,
      error: "Failed to save profile. Changes rolled back.",
    };
  }

  /* ---------- 6. Current-month grace summary ---------- */
  try {
    const monthlyRef = adminDb
      .collection("monthly_summaries")
      .doc(`${month}_${userId}`);
    const existingMonthly = await monthlyRef.get();
    if (!existingMonthly.exists) {
      await monthlyRef.set({
        month,
        userId,
        name,
        graceTotalAllowed: grace,
        graceUsed: 0,
        graceRemaining: grace,
        totalLateMinutes: 0,
        presentDays: 0,
        lateDays: 0,
        halfDays: 0,
        absentDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        totalHoursWorked: 0,
        updatedAt: now,
      });
    }
  } catch (err: unknown) {
    console.error("createTeamMember monthly summary error:", err);
  }

  return { success: true, userId };
}
