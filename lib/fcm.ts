import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function requestNotificationPermissionAndSaveToken(
  userId: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) return null;

    // 1. Ask permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted.");
      return null;
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );

    // 3. Get FCM Token
    const messaging = getMessaging(app);
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      // 4. Save token to Firestore under users/{userId}
      await updateDoc(doc(db, "users", userId), {
        fcmTokens: arrayUnion(currentToken),
      });
      return currentToken;
    }
  } catch (error) {
    console.error("Error retrieving FCM token:", error);
  }
  return null;
}
