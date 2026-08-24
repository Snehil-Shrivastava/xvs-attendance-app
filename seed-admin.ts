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

async function seedAdmin() {
  const userId = "1001";
  const email = "snehil.shrivastava@xvscreations.com";
  const name = "Snehil Shrivastava";
  const password = "xvscreations@2016";

  const currentYear = new Date().getFullYear(); // 2026
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-08"

  try {
    // 1. Create / Update Firebase Auth User
    try {
      await auth.getUser(userId);
      await auth.updateUser(userId, {
        email: email,
        password: password,
        displayName: name,
      });
      console.log(`🔄 Updated Firebase Auth user: ${userId} (${email})`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        await auth.createUser({
          uid: userId,
          email: email,
          password: password,
          displayName: name,
        });
        console.log(`✅ Created Firebase Auth user: ${userId} (${email})`);
      } else {
        throw err;
      }
    }

    // 2. Write Profile to `users/1001` with 24 Days Annual Paid Leave
    await db
      .collection("users")
      .doc(userId)
      .set(
        {
          userId: userId,
          name: name,
          email: email,
          department: "Web Development",
          role: "admin",
          mustChangePassword: false,
          isActive: true,
          // Shift & 30-min Monthly Grace
          shift: {
            startTime: "09:00:00",
            endTime: "18:00:00",
            monthlyGraceAllowance: 30,
          },
          // 24 Days Annual Paid Leave
          leaves: {
            annualQuota: 24,
            used: 0,
            remaining: 24,
            year: currentYear,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    console.log(`✅ Synced Firestore profile: users/${userId}`);

    // 3. Initialize Current Month's Grace Summary
    const monthlyDocRef = db
      .collection("monthly_summaries")
      .doc(`${currentMonth}_${userId}`);

    const existingMonthly = await monthlyDocRef.get();
    if (!existingMonthly.exists) {
      await monthlyDocRef.set({
        month: currentMonth,
        userId: userId,
        name: name,
        graceTotalAllowed: 30,
        graceUsed: 0,
        graceRemaining: 30,
        totalLateMinutes: 0,
        presentDays: 0,
        lateDays: 0,
        halfDays: 0,
        absentDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        totalHoursWorked: 0,
        updatedAt: new Date().toISOString(),
      });
      console.log(
        `✅ Initialized grace summary: monthly_summaries/${currentMonth}_${userId}`,
      );
    }

    console.log("\n==========================================");
    console.log("🚀 ADMIN ACCOUNT UPDATED!");
    console.log(`   User ID     : ${userId}`);
    console.log(`   Email       : ${email}`);
    console.log(`   Annual Leave: 24 Paid Days (${currentYear})`);
    console.log(`   Grace Pool  : 30 mins (${currentMonth})`);
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();
