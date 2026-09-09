// import { initializeApp, cert, getApps } from "firebase-admin/app";
// import { getAuth } from "firebase-admin/auth";
// import { getFirestore } from "firebase-admin/firestore";
// // import fs from "fs";
// // import path from "path";

// if (getApps().length === 0) {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   let serviceAccount: any = null;

//   // 1. Try reading from Vercel Environment Variable (Production)
//   if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
//     try {
//       serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
//     } catch (e) {
//       console.error(
//         "Failed to parse FIREBASE_SERVICE_ACCOUNT_PATH environment variable:",
//         e,
//       );
//     }
//   }

//   // 2. Initialize Firebase Admin
//   if (serviceAccount) {
//     initializeApp({
//       credential: cert(serviceAccount),
//     });
//   } else {
//     // Default initialization (fallback)
//     initializeApp();
//   }
// }

// export const adminAuth = getAuth();
// export const adminDb = getFirestore();

// --------------------------------------------------------------

import {
  initializeApp,
  cert,
  getApps,
  getApp,
  ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function loadServiceAccount(): ServiceAccount | null {
  const envVal =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!envVal) return null;

  // Case 1: Environment variable is a JSON string
  if (envVal.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(envVal);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return parsed;
    } catch (err) {
      console.error("❌ Failed to parse Service Account JSON string:", err);
      return null;
    }
  }

  // Case 2: Environment variable is a file path
  try {
    const resolvedPath = path.isAbsolute(envVal)
      ? envVal
      : path.resolve(process.cwd(), envVal);

    if (fs.existsSync(resolvedPath)) {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return parsed;
    } else {
      console.error(
        `❌ Service account file not found at path: ${resolvedPath}`,
      );
    }
  } catch (err) {
    console.error("❌ Failed to read Service Account file:", err);
  }

  return null;
}

if (getApps().length === 0) {
  const serviceAccount = loadServiceAccount();

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId:
        serviceAccount.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    console.warn(
      "⚠️ Initializing Firebase Admin without service account credentials.",
    );
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

const adminApp = getApps()[0] || getApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
