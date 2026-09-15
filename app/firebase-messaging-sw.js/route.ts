// import { NextResponse } from "next/server";

// export async function GET() {
//   const swCode = `
// importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
// importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// firebase.initializeApp({
//   apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
//   authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
//   projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
//   storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
//   messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
//   appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}",
// });

// const messaging = firebase.messaging();

// messaging.onBackgroundMessage((payload) => {
//   const notificationTitle = payload.notification?.title || payload.data?.title || "Attendance Update";
//   const notificationOptions = {
//     body: payload.notification?.body || payload.data?.body || "Your request status has been updated.",
//     icon: "/app-logo.svg",
//     badge: "/app-logo.svg",
//     data: {
//       url: payload.data?.url || "/",
//     },
//   };

//   self.registration.showNotification(notificationTitle, notificationOptions);
// });

// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();
//   const targetUrl = event.notification.data?.url || "/";

//   event.waitUntil(
//     clients
//       .matchAll({ type: "window", includeUncontrolled: true })
//       .then((clientList) => {
//         for (const client of clientList) {
//           if (client.url.includes(targetUrl) && "focus" in client) {
//             return client.focus();
//           }
//         }
//         if (clients.openWindow) {
//           return clients.openWindow(targetUrl);
//         }
//       })
//   );
// });
// `;

//   return new NextResponse(swCode, {
//     headers: {
//       "Content-Type": "application/javascript",
//       "Service-Worker-Allowed": "/",
//     },
//   });
// }

// ------------------------------------------------------------------

import { NextResponse } from "next/server";

export async function GET() {
  const swCode = `
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}",
});

const messaging = firebase.messaging();

// 1. Background Push Received
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "New Update";
  const targetUrl = payload.data?.url || payload.fcmOptions?.link || "/requests";

  const options = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: "/app-logo.svg",
    badge: "/app-logo.svg",
    data: {
      url: targetUrl,
    },
  };

  self.registration.showNotification(title, options);
});

// 2. Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Extract destination URL (defaults to /requests)
  const relativeUrl =
    event.notification.data?.url ||
    event.notification.data?.FCM_MSG?.data?.url ||
    "/requests";

  // Build full absolute URL: e.g. https://xvs-attendance-app.vercel.app/requests
  const fullTargetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, navigate that window to /requests and focus it
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(fullTargetUrl);
          }
          return client.focus();
        }
      }

      // If the app is closed, open a new window directly at /requests
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
`;

  return new NextResponse(swCode, {
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
    },
  });
}
