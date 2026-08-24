// // src/lib/firebase-admin.ts
// import admin from "firebase-admin";
// import path from "path";
// import fs from "fs";

// // @ts-expect-error unknown
// if (!admin.apps.length) {
//   const serviceAccountPath = path.resolve(
//     process.cwd(),
//     process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json",
//   );

//   if (fs.existsSync(serviceAccountPath)) {
//     const serviceAccount = JSON.parse(
//       fs.readFileSync(serviceAccountPath, "utf8"),
//     );
//     admin.initializeApp({
//       // @ts-expect-error unknown
//       credential: admin.credential.cert(serviceAccount),
//     });
//   } else {
//     admin.initializeApp();
//   }
// }

// // @ts-expect-error unknown
// export const adminAuth = admin.auth();
// // @ts-expect-error unknown
// export const adminDb = admin.firestore();

// ------------------------------------------------

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

if (getApps().length === 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let serviceAccount: any = null;

  // 1. Try reading from Vercel Environment Variable (Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.error(
        "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable:",
        e,
      );
    }
  }

  // 2. Fallback to local file (Local Development)
  if (!serviceAccount) {
    const localPath = path.resolve(process.cwd(), "./serviceAccountKey.json");
    if (fs.existsSync(localPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(localPath, "utf8"));
    }
  }

  // 3. Initialize Firebase Admin
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Default initialization (fallback)
    initializeApp();
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
