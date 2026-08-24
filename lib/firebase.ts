// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Resolves User ID (e.g. "1003") -> Email (e.g. "snehil@xvscreations.com")
 * using standard client Firestore SDK.
 */
export async function resolveEmailFromId(
  identifier: string,
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const cleanId = identifier.trim().toLowerCase();

    if (!cleanId) {
      return { success: false, error: "Please enter your User ID or Email." };
    }

    // If user typed email directly
    if (cleanId.includes("@")) {
      return { success: true, email: cleanId };
    }

    // Look up Firestore users/1003 directly
    const userDocRef = doc(db, "users", cleanId);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      return {
        success: false,
        error: `User ID "${cleanId}" not registered. Please contact Admin.`,
      };
    }

    const data = snap.data();
    if (!data?.email) {
      return {
        success: false,
        error: "No email associated with this User ID.",
      };
    }

    return { success: true, email: data.email };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Lookup error:", err);
    return { success: false, error: "Failed to verify User ID." };
  }
}
