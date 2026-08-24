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

// src/lib/firebase-admin.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(
    process.cwd(),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json",
  );

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8"),
    );
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    initializeApp();
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
