// lib/fcm.ts
import { getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function requestNotificationPermissionAndSaveToken(
  userId: string,
) {
  if (typeof window === "undefined")
    return { success: false, error: "Window undefined" };

  if (!("serviceWorker" in navigator)) {
    console.error("❌ Service Workers not supported in this browser.");
    return { success: false, error: "Service Worker not supported." };
  }

  if (!("Notification" in window)) {
    console.error("❌ Notifications not supported in this browser.");
    return { success: false, error: "Notifications not supported." };
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.error("❌ Firebase Messaging not supported.");
      return {
        success: false,
        error: "FCM not supported on this device/browser.",
      };
    }

    // 1. Request Permission
    const permission = await Notification.requestPermission();
    console.log("Notification permission status:", permission);

    if (permission !== "granted") {
      return {
        success: false,
        error: "Notification permission was denied or dismissed.",
      };
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" },
    );
    await navigator.serviceWorker.ready;
    console.log("✅ Service worker active with scope:", registration.scope);

    // 3. Get FCM Token
    const app = getApp();
    const messaging = getMessaging(app);

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error(
        "❌ NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing from environment variables!",
      );
      return { success: false, error: "Missing VAPID key in .env.local" };
    }

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) {
      return { success: false, error: "Failed to generate FCM device token." };
    }

    console.log("✅ Generated FCM Token:", currentToken);

    // 4. Save to Firestore (using setDoc with merge: true prevents errors if doc doesn't exist)
    await setDoc(
      doc(db, "users", userId),
      { fcmTokens: arrayUnion(currentToken) },
      { merge: true },
    );

    console.log("✅ Token successfully saved to Firestore for user:", userId);
    return { success: true, token: currentToken };
  } catch (error: unknown) {
    console.error(
      "❌ Error in requestNotificationPermissionAndSaveToken:",
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
