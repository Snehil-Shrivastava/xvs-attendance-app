"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import TeamMemberCard from "./TeamMemberCard";
import { useSearchParams } from "next/navigation";
import {
  computeLeaveSummary,
  buildHolidayDateSet,
  type LeaveDoc,
} from "@/lib/leaveCalc";

interface UserRaw {
  userId: string;
  name: string;
  department: string;
  photoUrl?: string;
  annualQuota: number;
  openingUsedDays?: Record<string, number>; // NEW
}

interface MemberRow extends UserRaw {
  pendingRequests: number;
  remainingLeaves: number;
  graceRemainingSeconds: number;
}

const TeamMemberList = () => {
  const { user, userData } = useAuth();
  const searchParams = useSearchParams();
  const expandUid = searchParams.get("expand");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYearStr = currentMonth.slice(0, 4);

  useEffect(() => {
    if (!user || userData?.role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    let usersRaw: UserRaw[] = [];
    let graceByUser = new Map<string, number>();
    let leavesByUser = new Map<string, LeaveDoc[]>(); // NEW: raw docs
    let holidaysRaw: Array<{ date?: string }> = []; // NEW
    let pendingLeavesByUser = new Map<string, number>();
    let pendingLateByUser = new Map<string, number>();
    let pendingCorrByUser = new Map<string, number>();

    const recombine = () => {
      const holidaySet = buildHolidayDateSet(holidaysRaw);

      const rows: MemberRow[] = usersRaw
        .slice()
        .sort((a, b) => Number(a.userId) - Number(b.userId))
        .map((u) => {
          const userLeaves = leavesByUser.get(u.userId) || [];
          const summary = computeLeaveSummary(userLeaves, {
            annualQuota: u.annualQuota,
            openingUsedDays: u.openingUsedDays,
            holidayDates: holidaySet,
          });

          const pending =
            (pendingLeavesByUser.get(u.userId) || 0) +
            (pendingLateByUser.get(u.userId) || 0) +
            (pendingCorrByUser.get(u.userId) || 0);

          return {
            ...u,
            pendingRequests: pending,
            remainingLeaves: summary.yearRemaining, // now util-derived
            graceRemainingSeconds: graceByUser.get(u.userId) ?? 1800,
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
          openingUsedDays: data.leaves?.openingUsedDays, // NEW
        });
      });
      recombine();
    });

    // 2. This month's grace bank
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
          const secs =
            typeof data.graceRemainingSeconds === "number"
              ? data.graceRemainingSeconds
              : typeof data.graceRemaining === "number"
                ? Math.round(data.graceRemaining * 60)
                : 1800;
          graceByUser.set(uid, secs);
        });
        recombine();
      },
    );

    // 3. All approved leaves — grouped by user (util does the day math)
    const unsubApproved = onSnapshot(
      query(collection(db, "leaves"), where("status", "==", "approved")),
      (snap) => {
        const next = new Map<string, LeaveDoc[]>();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = String(data.userId || "");
          if (!uid) return;
          const arr = next.get(uid) || [];
          arr.push({ id: docSnap.id, ...(data as LeaveDoc) });
          next.set(uid, arr);
        });
        leavesByUser = next;
        recombine();
      },
    );

    // 4. Holidays for the current year (needed by computeLeaveSummary)
    const unsubHolidays = onSnapshot(
      query(
        collection(db, "holidays"),
        where("month", ">=", `${currentYearStr}-01`),
        where("month", "<=", `${currentYearStr}-12`),
      ),
      (snap) => {
        const arr: Array<{ date?: string }> = [];
        snap.forEach((d) => arr.push(d.data() as { date?: string }));
        holidaysRaw = arr;
        recombine();
      },
    );

    // 5–7. Pending counts
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
      unsubHolidays();
      unsubPendingLeaves();
      unsubPendingLate();
      unsubPendingCorr();
    };
  }, [user, userData, currentMonth, currentYearStr]);

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
            graceRemainingSeconds={m.graceRemainingSeconds}
            defaultExpanded={expandUid === m.userId}
          />
        ))
      )}
    </div>
  );
};

export default TeamMemberList;
