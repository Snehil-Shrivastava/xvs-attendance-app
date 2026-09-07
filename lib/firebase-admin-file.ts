import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
// import fs from "fs";
// import path from "path";

if (getApps().length === 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let serviceAccount: any = null;

  // 1. Try reading from Vercel Environment Variable (Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    } catch (e) {
      console.error(
        "Failed to parse FIREBASE_SERVICE_ACCOUNT_PATH environment variable:",
        e,
      );
    }
  }

  // 2. Fallback to local file (Local Development)
  //   if (!serviceAccount) {
  //     const localPath = path.resolve(process.cwd(), "./serviceAccountKey.json");
  //     if (fs.existsSync(localPath)) {
  //       serviceAccount = JSON.parse(fs.readFileSync(localPath, "utf8"));
  //     }
  //   }

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
