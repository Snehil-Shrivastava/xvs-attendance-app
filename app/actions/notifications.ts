// "use server";

// import { adminDb, adminMessaging } from "@/lib/firebase-admin-file";

// interface SendApprovalPushInput {
//   targetUserId: string;
//   title: string;
//   body: string;
//   url?: string;
// }

// // -------------------------------------------------------------
// // 1. NOTIFY INDIVIDUAL EMPLOYEE (ON APPROVAL / DENIAL)
// // -------------------------------------------------------------
// export async function sendPushNotificationToUser({
//   targetUserId,
//   title,
//   body,
//   url = "/attendance",
// }: SendApprovalPushInput) {
//   try {
//     let fcmTokens: string[] = [];
//     let matchedDocId = targetUserId;

//     // Try finding doc by ID directly
//     const userDoc = await adminDb.collection("users").doc(targetUserId).get();
//     if (userDoc.exists) {
//       fcmTokens = userDoc.data()?.fcmTokens || [];
//     } else {
//       // Fallback: Search where userId field matches
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

//     // Save in-app notification
//     try {
//       await adminDb.collection("notifications").add({
//         userId: matchedDocId,
//         targetUserId: targetUserId,
//         title,
//         body,
//         url,
//         read: false,
//         createdAt: new Date().toISOString(),
//       });
//     } catch (dbErr) {
//       console.error("⚠️ Failed to store in-app notification:", dbErr);
//     }

//     if (fcmTokens.length === 0) {
//       return { success: true, message: "Saved in-app notification only." };
//     }

//     // Dispatch Web Push
//     const response = await adminMessaging.sendEachForMulticast({
//       tokens: fcmTokens,
//       notification: { title, body },
//       data: { title, body, url },
//       webpush: { fcmOptions: { link: url } },
//       android: {
//         priority: "high",
//         notification: { sound: "default", channelId: "default" },
//       },
//     });

//     return { success: response.successCount > 0 };
//   } catch (err) {
//     console.error("❌ Failed to send push notification:", err);
//     return { success: false, error: "Push dispatch failed" };
//   }
// }

// // -------------------------------------------------------------
// // 2. NOTIFY ALL ADMINS (ON NEW REQUEST SUBMISSION)
// // -------------------------------------------------------------
// interface NewRequestNotificationInput {
//   employeeName: string;
//   requestType:
//     | "Leave"
//     | "Late Arrival"
//     | "Attendance Correction"
//     | "Leave Cancellation";
//   details: string; // e.g. "Casual Leave (12 Sep - 14 Sep)" or "15 Sep at 10:00 AM"
//   url?: string;
// }

// export async function notifyAdminsOfNewRequest({
//   employeeName,
//   requestType,
//   details,
//   url = "/requests",
// }: NewRequestNotificationInput) {
//   try {
//     const title = `New ${requestType} Request`;
//     const body = `${employeeName} submitted a ${requestType.toLowerCase()} request: ${details}`;

//     // 1. Fetch all admin profiles from Firestore
//     const adminSnaps = await adminDb
//       .collection("users")
//       .where("role", "==", "admin")
//       .get();

//     if (adminSnaps.empty) {
//       console.warn("⚠️ No admin users found to notify.");
//       return { success: false, message: "No admins found." };
//     }

//     const allTokens: string[] = [];

//     // 2. Create in-app notification for each admin and collect device tokens
//     for (const docSnap of adminSnaps.docs) {
//       const adminId = docSnap.id;
//       const adminData = docSnap.data();

//       // Save to in-app `notifications` collection (for NotificationMenu)
//       try {
//         await adminDb.collection("notifications").add({
//           userId: adminId,
//           targetUserId: adminId,
//           title,
//           body,
//           url,
//           read: false,
//           createdAt: new Date().toISOString(),
//         });
//       } catch (err) {
//         console.error(
//           "Failed to add in-app notification for admin:",
//           adminId,
//           err,
//         );
//       }

//       // Collect FCM tokens
//       const tokens: string[] = adminData?.fcmTokens || [];
//       allTokens.push(...tokens);
//     }

//     // Deduplicate tokens
//     const uniqueTokens = Array.from(new Set(allTokens)).filter(Boolean);

//     if (uniqueTokens.length === 0) {
//       console.log(
//         "ℹ️ In-app notifications created, but no admin devices have push tokens registered.",
//       );
//       return { success: true, message: "In-app notifications saved." };
//     }

//     // 3. Dispatch Web Push to all admin devices
//     const response = await adminMessaging.sendEachForMulticast({
//       tokens: uniqueTokens,
//       notification: { title, body },
//       data: { title, body, url },
//       webpush: { fcmOptions: { link: url } },
//       android: {
//         priority: "high",
//         notification: { sound: "default", channelId: "default" },
//       },
//     });

//     console.log(
//       `🔔 Admin Push Sent: ${response.successCount} succeeded, ${response.failureCount} failed.`,
//     );

//     return { success: response.successCount > 0 };
//   } catch (err) {
//     console.error("❌ Failed to notify admins:", err);
//     return { success: false, error: "Failed to notify admins." };
//   }
// }

//---------------------------------- fix: depricated method

"use server";

import { adminDb, adminMessaging } from "@/lib/firebase-admin-file";

interface SendApprovalPushInput {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
}

// -------------------------------------------------------------
// 1. NOTIFY INDIVIDUAL EMPLOYEE (ON APPROVAL / DENIAL)
// -------------------------------------------------------------
export async function sendPushNotificationToUser({
  targetUserId,
  title,
  body,
  url = "/attendance",
}: SendApprovalPushInput) {
  try {
    let fcmTokens: string[] = [];
    let matchedDocId = targetUserId;

    const userDoc = await adminDb.collection("users").doc(targetUserId).get();
    if (userDoc.exists) {
      fcmTokens = userDoc.data()?.fcmTokens || [];
    } else {
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

    // Save in-app notification
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

    if (fcmTokens.length === 0) {
      return { success: true, message: "Saved in-app notification only." };
    }

    // ✅ Migrated: sendEach instead of sendEachForMulticast
    const messages = fcmTokens.map((token) => ({
      token,
      notification: { title, body },
      data: { title, body, url },
      webpush: { fcmOptions: { link: url } },
      android: {
        priority: "high" as const,
        notification: { sound: "default", channelId: "default" },
      },
    }));

    const response = await adminMessaging.sendEach(messages);

    return { success: response.successCount > 0 };
  } catch (err) {
    console.error("❌ Failed to send push notification:", err);
    return { success: false, error: "Push dispatch failed" };
  }
}

// -------------------------------------------------------------
// 2. NOTIFY ALL ADMINS (ON NEW REQUEST SUBMISSION)
// -------------------------------------------------------------
interface NewRequestNotificationInput {
  employeeName: string;
  requestType:
    | "Leave"
    | "Late Arrival"
    | "Attendance Correction"
    | "Leave Cancellation";
  details: string;
  url?: string;
}

export async function notifyAdminsOfNewRequest({
  employeeName,
  requestType,
  details,
  url = "/requests",
}: NewRequestNotificationInput) {
  try {
    const title = `New ${requestType} Request`;
    const body = `${employeeName} submitted a ${requestType.toLowerCase()} request: ${details}`;

    const adminSnaps = await adminDb
      .collection("users")
      .where("role", "==", "admin")
      .get();

    if (adminSnaps.empty) {
      console.warn("⚠️ No admin users found to notify.");
      return { success: false, message: "No admins found." };
    }

    const allTokens: string[] = [];

    for (const docSnap of adminSnaps.docs) {
      const adminId = docSnap.id;
      const adminData = docSnap.data();

      try {
        await adminDb.collection("notifications").add({
          userId: adminId,
          targetUserId: adminId,
          title,
          body,
          url,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(
          "Failed to add in-app notification for admin:",
          adminId,
          err,
        );
      }

      const tokens: string[] = adminData?.fcmTokens || [];
      allTokens.push(...tokens);
    }

    const uniqueTokens = Array.from(new Set(allTokens)).filter(Boolean);

    if (uniqueTokens.length === 0) {
      console.log(
        "ℹ️ In-app notifications created, but no admin devices have push tokens registered.",
      );
      return { success: true, message: "In-app notifications saved." };
    }

    // ✅ Migrated: sendEach instead of sendEachForMulticast
    const messages = uniqueTokens.map((token) => ({
      token,
      notification: { title, body },
      data: { title, body, url },
      webpush: { fcmOptions: { link: url } },
      android: {
        priority: "high" as const,
        notification: { sound: "default", channelId: "default" },
      },
    }));

    const response = await adminMessaging.sendEach(messages);

    console.log(
      `🔔 Admin Push Sent: ${response.successCount} succeeded, ${response.failureCount} failed.`,
    );

    return { success: response.successCount > 0 };
  } catch (err) {
    console.error("❌ Failed to notify admins:", err);
    return { success: false, error: "Failed to notify admins." };
  }
}
