"use server";

import { adminDb, adminMessaging } from "@/lib/firebase-admin-file";

interface SendApprovalPushInput {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotificationToUser({
  targetUserId,
  title,
  body,
  url = "/attendance",
}: SendApprovalPushInput) {
  try {
    const userDoc = await adminDb.collection("users").doc(targetUserId).get();
    if (!userDoc.exists) return { success: false, error: "User not found" };

    const fcmTokens: string[] = userDoc.data()?.fcmTokens || [];
    if (fcmTokens.length === 0) {
      return { success: false, message: "No active devices for this user" };
    }

    // Send push to all active devices registered for this user
    const response = await adminMessaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title,
        body,
      },
      data: {
        url,
      },
      webpush: {
        fcmOptions: {
          link: url,
        },
      },
    });

    // Clean up stale or invalid tokens automatically
    const validTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (res.success) {
        validTokens.push(fcmTokens[idx]);
      }
    });

    if (validTokens.length !== fcmTokens.length) {
      await adminDb.collection("users").doc(targetUserId).update({
        fcmTokens: validTokens,
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to send push notification:", err);
    return { success: false, error: "Push dispatch failed" };
  }
}
