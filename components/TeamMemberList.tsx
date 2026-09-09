"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import TeamMemberCard from "./TeamMemberCard";

interface UserRaw {
  userId: string;
  name: string;
  department: string;
  photoUrl?: string;
  annualQuota: number;
}

interface MemberRow extends UserRaw {
  pendingRequests: number;
  remainingLeaves: number;
  graceRemaining: number;
}

const TeamMemberList = () => {
  const { user, userData } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Current month string (e.g. "2026-09") — same as DashboardHighlights
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!user || userData?.role !== "admin") return;
    setLoading(true);

    // One raw store per listener, recombined on every update
    let usersRaw: UserRaw[] = [];
    let graceByUser = new Map<string, number>();
    let approvedDaysByUser = new Map<string, number>();
    let pendingLeavesByUser = new Map<string, number>();
    let pendingLateByUser = new Map<string, number>();
    let pendingCorrByUser = new Map<string, number>();

    const recombine = () => {
      const rows: MemberRow[] = usersRaw
        .slice()
        .sort((a, b) => Number(a.userId) - Number(b.userId))
        .map((u) => {
          const usedDays = approvedDaysByUser.get(u.userId) || 0;
          const pending =
            (pendingLeavesByUser.get(u.userId) || 0) +
            (pendingLateByUser.get(u.userId) || 0) +
            (pendingCorrByUser.get(u.userId) || 0);

          return {
            ...u,
            pendingRequests: pending,
            // Same calc as DashboardHighlights: quota − approved days
            remainingLeaves: Math.max(0, u.annualQuota - usedDays),
            // Fallback 30 mins if this month's summary doc doesn't exist yet
            graceRemaining: graceByUser.get(u.userId) ?? 30,
          };
        });
      setMembers(rows);
      setLoading(false);
    };

    // 1. All active team members
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      usersRaw = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isActive === false) return;
        usersRaw.push({
          userId: data.userId || docSnap.id,
          name: data.name || "Employee",
          department: data.department || "Department",
          photoUrl: data.photoUrl,
          annualQuota: Number(data.leaves?.annualQuota ?? 24),
        });
      });
      recombine();
    });

    // 2. This month's grace bank for everyone (Remaining Time)
    const unsubSummaries = onSnapshot(
      query(
        collection(db, "monthly_summaries"),
        where("month", "==", currentMonth),
      ),
      (snap) => {
        graceByUser = new Map();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = data.userId || docSnap.id.split("_")[1];
          graceByUser.set(uid, Number(data.graceRemaining ?? 30));
        });
        recombine();
      },
    );

    // 3. Approved leaves → used days per member (Remaining Leaves)
    const unsubApproved = onSnapshot(
      query(collection(db, "leaves"), where("status", "==", "approved")),
      (snap) => {
        approvedDaysByUser = new Map();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = data.userId || "";
          approvedDaysByUser.set(
            uid,
            (approvedDaysByUser.get(uid) || 0) + Number(data.totalDays || 0),
          );
        });
        recombine();
      },
    );

    // 4–6. Pending requests per member, across all three collections
    const unsubPendingLeaves = onSnapshot(
      query(collection(db, "leaves"), where("status", "==", "pending")),
      (snap) => {
        pendingLeavesByUser = new Map();
        snap.forEach((docSnap) => {
          const uid = docSnap.data().userId || "";
          pendingLeavesByUser.set(uid, (pendingLeavesByUser.get(uid) || 0) + 1);
        });
        recombine();
      },
    );

    const unsubPendingLate = onSnapshot(
      query(collection(db, "late_arrivals"), where("status", "==", "pending")),
      (snap) => {
        pendingLateByUser = new Map();
        snap.forEach((docSnap) => {
          const uid = docSnap.data().userId || "";
          pendingLateByUser.set(uid, (pendingLateByUser.get(uid) || 0) + 1);
        });
        recombine();
      },
    );

    const unsubPendingCorr = onSnapshot(
      query(
        collection(db, "attendance_corrections"),
        where("status", "==", "pending"),
      ),
      (snap) => {
        pendingCorrByUser = new Map();
        snap.forEach((docSnap) => {
          const uid = docSnap.data().userId || "";
          pendingCorrByUser.set(uid, (pendingCorrByUser.get(uid) || 0) + 1);
        });
        recombine();
      },
    );

    return () => {
      unsubUsers();
      unsubSummaries();
      unsubApproved();
      unsubPendingLeaves();
      unsubPendingLate();
      unsubPendingCorr();
    };
  }, [user, userData, currentMonth]);

  if (userData?.role !== "admin") return null;

  return (
    <div className="flex flex-col gap-6 mt-10">
      {loading ? (
        [0, 1, 2].map((i) => (
          <div key={i} className="border border-[#E5DEC9] p-5 animate-pulse">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-[#E5DEC9]/50" />
              <div className="flex flex-col gap-2">
                <div className="h-5 w-40 bg-[#E5DEC9]/50" />
                <div className="h-3 w-24 bg-[#E5DEC9]/50" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5">
              <div className="h-20 bg-[#E5DEC9]/50" />
              <div className="h-20 bg-[#E5DEC9]/50" />
              <div className="h-20 bg-[#E5DEC9]/50" />
            </div>
          </div>
        ))
      ) : members.length === 0 ? (
        <div className="border border-[#E5DEC9] py-10 text-center text-xs text-[#8C827A]">
          No team members yet. Use the Add button above to create the first one.
        </div>
      ) : (
        members.map((m) => (
          <TeamMemberCard
            key={m.userId}
            name={m.name}
            department={m.department}
            userId={m.userId}
            photoUrl={m.photoUrl}
            pendingRequests={m.pendingRequests}
            remainingLeaves={m.remainingLeaves}
            graceRemainingMinutes={m.graceRemaining}
          />
        ))
      )}
    </div>
  );
};

export default TeamMemberList;
