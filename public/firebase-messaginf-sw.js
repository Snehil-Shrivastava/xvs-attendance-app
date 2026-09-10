// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// Replace with your Firebase config values from your .env.local
firebase.initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

// Handles notifications when website is closed/in background
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || "Attendance Update";
    const notificationOptions = {
        body: payload.notification?.body || "Your request status has been updated.",
        icon: "/app-logo.svg",
        badge: "/app-logo.svg",
        data: {
            url: payload.data?.url || "/",
        },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Open website when user taps the notification banner
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(targetUrl) && "focus" in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});