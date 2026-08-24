// seed-admin.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// 1. Read service account key
const serviceAccountPath = path.resolve(
  process.cwd(),
  "./serviceAccountKey.json",
);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// 2. Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

async function createInitialAdmin() {
  const userId = "1001";
  const email = "snehil.shrivastava@xvscreations.com"; // Your real admin email
  const password = "xvscreations@2016"; // Set your initial password

  try {
    // 1. Create or check Auth user
    try {
      const userRecord = await auth.getUserByEmail(email);
      console.log(`ℹ️ User already exists in Auth: ${userRecord.uid}`);
    } catch {
      const userRecord = await auth.createUser({
        uid: userId,
        email: email,
        password: password,
        displayName: "System Admin",
      });
      console.log(`✅ Created Auth user: ${userRecord.uid} (${email})`);
    }

    // 2. Create Firestore Profile (Document ID = "1001")
    await db.collection("users").doc(userId).set({
      userId: userId,
      email: email,
      name: "System Admin",
      department: "Web Development",
      role: "admin",
      mustChangePassword: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    console.log(`✅ Created Firestore record: users/${userId}`);
    console.log("\n==========================================");
    console.log("🚀 READY TO LOG IN!");
    console.log(`   User ID  : ${userId}`);
    console.log(`   Email    : ${email}`);
    console.log(`   Password : ${password}`);
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
}

createInitialAdmin();
