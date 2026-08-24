// src/app/actions/auth.ts
"use server";

import { adminDb } from "@/lib/firebase-admin";

/**
 * Resolves whether the entered value is an email or a User ID.
 * If User ID (e.g. "1003"), looks up the real email from Firestore users collection.
 */
export async function resolveEmail(
  identifier: string,
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const cleanId = identifier.trim().toLowerCase();

    if (!cleanId) {
      return { success: false, error: "Please enter your User ID or Email." };
    }

    // 1. If user typed full email (e.g. snehil@xvscreations.com)
    if (cleanId.includes("@")) {
      return { success: true, email: cleanId };
    }

    // 2. If user typed numeric User ID (e.g. "1003")
    const userDoc = await adminDb.collection("users").doc(cleanId).get();

    if (!userDoc.exists) {
      return {
        success: false,
        error: `User ID "${cleanId}" not registered. Please contact Admin.`,
      };
    }

    const userData = userDoc.data();

    if (!userData?.isActive) {
      return { success: false, error: "This account has been deactivated." };
    }

    if (!userData?.email) {
      return {
        success: false,
        error: "No email associated with this User ID.",
      };
    }

    return { success: true, email: userData.email };
  } catch (err: unknown) {
    console.error("resolveEmail Error:", err);
    return {
      success: false,
      error: "Authentication service error. Try again.",
    };
  }
}
