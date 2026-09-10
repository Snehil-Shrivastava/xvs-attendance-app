// "use server";

// import { adminDb, adminMessaging } from "@/lib/firebase-admin-file";

// interface SendApprovalPushInput {
//   targetUserId: string;
//   title: string;
//   body: string;
//   url?: string;
// }

// export async function sendPushNotificationToUser({
//   targetUserId,
//   title,
//   body,
//   url = "/attendance",
// }: SendApprovalPushInput) {
//   try {
//     // console.log(
//     //   "🔔 Preparing push notification for user identifier:",
//     //   targetUserId,
//     // );

//     let fcmTokens: string[] = [];
//     let matchedDocId = targetUserId;

//     // 1. Try finding doc by ID directly
//     const userDoc = await adminDb.collection("users").doc(targetUserId).get();
//     if (userDoc.exists) {
//       fcmTokens = userDoc.data()?.fcmTokens || [];
//     } else {
//       // 2. Fallback: Search where userId field matches
//       const querySnap = await adminDb
//         .collection("users")
//         .where("userId", "==", targetUserId)
//         .limit(1)
//         .get();

//       if (!querySnap.empty) {
//         matchedDocId = querySnap.docs[0].id;
//         fcmTokens = querySnap.docs[0].data()?.fcmTokens || [];
//       }
//     }

//     // console.log(`Found ${fcmTokens.length} token(s) for user ${targetUserId}`);

//     if (fcmTokens.length === 0) {
//       console.warn(
//         "⚠️ No active FCM tokens found in Firestore. Has the user granted notification permission?",
//       );
//       return {
//         success: false,
//         message: "No active devices registered for this user.",
//       };
//     }

//     // 3. Dispatch multicast payload
//     const response = await adminMessaging.sendEachForMulticast({
//       tokens: fcmTokens,
//       notification: {
//         title,
//         body,
//       },
//       data: {
//         title,
//         body,
//         url,
//       },
//       android: {
//         priority: "high",
//         notification: {
//           sound: "default",
//           channelId: "default",
//         },
//       },
//     });

//     // console.log(
//     //   `Push sent: ${response.successCount} succeeded, ${response.failureCount} failed.`,
//     // );

//     // 4. Clean up expired tokens if any
//     const validTokens: string[] = [];
//     response.responses.forEach((res, idx) => {
//       if (res.success) {
//         validTokens.push(fcmTokens[idx]);
//       } else {
//         console.error(`Token #${idx} failed with error:`, res.error);
//       }
//     });

//     if (validTokens.length !== fcmTokens.length) {
//       await adminDb.collection("users").doc(matchedDocId).update({
//         fcmTokens: validTokens,
//       });
//     }

//     return { success: response.successCount > 0 };
//   } catch (err) {
//     console.error("❌ Failed to send push notification:", err);
//     return { success: false, error: "Push dispatch failed" };
//   }
// }

// --------------------------------------------

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
    let fcmTokens: string[] = [];
    let matchedDocId = targetUserId;

    // 1. Try finding doc by ID directly
    const userDoc = await adminDb.collection("users").doc(targetUserId).get();
    if (userDoc.exists) {
      fcmTokens = userDoc.data()?.fcmTokens || [];
    } else {
      // 2. Fallback: Search where userId field matches
      const querySnap = await adminDb
        .collection("users")
        .where("userId", "==", targetUserId)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        matchedDocId = querySnap.docs[0].id;
        fcmTokens = querySnap.docs[0].data()?.fcmTokens || [];
      }
    }

    // 3. Save to in-app `notifications` collection so NotificationMenu displays it
    try {
      await adminDb.collection("notifications").add({
        userId: matchedDocId,
        targetUserId: targetUserId,
        title,
        body,
        url,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error("⚠️ Failed to store in-app notification:", dbErr);
    }

    // 4. If no device tokens exist, stop here (in-app notification was already saved)
    if (fcmTokens.length === 0) {
      console.warn(
        "⚠️ No active FCM tokens found in Firestore. Has the user granted notification permission?",
      );
      return {
        success: true,
        message:
          "Saved in-app notification, but no active device push tokens registered.",
      };
    }

    // 5. Dispatch Web Push notification to all user devices
    const response = await adminMessaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title,
        body,
      },
      data: {
        title,
        body,
        url,
      },
      webpush: {
        fcmOptions: {
          link: url,
        },
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
    });

    // 6. Clean up expired tokens if any
    const validTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (res.success) {
        validTokens.push(fcmTokens[idx]);
      } else {
        console.error(`Token #${idx} failed with error:`, res.error);
      }
    });

    if (validTokens.length !== fcmTokens.length) {
      await adminDb.collection("users").doc(matchedDocId).update({
        fcmTokens: validTokens,
      });
    }

    return { success: response.successCount > 0 };
  } catch (err) {
    console.error("❌ Failed to send push notification:", err);
    return { success: false, error: "Push dispatch failed" };
  }
}
