"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, Loader2 } from "lucide-react";
import { sendPushNotificationToUser } from "@/app/actions/notifications";

interface PendingItem {
  id: string;
  collectionName: "leaves" | "late_arrivals" | "attendance_corrections";
  userId: string;
  name: string;
  type: string;
  detail: string;
  appliedAt: string;
  status: "pending" | "approved" | "denied";
}

const getFirstName = (fullName: string) => {
  if (!fullName) return "Employee";
  return fullName.trim().split(" ")[0] || "Employee";
};

const formatTimeStr = (t?: string | null) => {
  if (!t) return "";
  if (t.includes("AM") || t.includes("PM")) return t;
  try {
    const [h, m] = t.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${m}${ampm}`;
  } catch {
    return t;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "--";
  try {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const dayFormatted = String(date.getDate()).padStart(2, "0");
    const monthFormatted = date.toLocaleDateString("en-GB", { month: "short" });
    return `${dayFormatted} ${monthFormatted} ${year}`;
  } catch {
    return dateStr;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatAppliedTime = (createdAt?: any) => {
  try {
    const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);

    let hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    const hh = String(hours).padStart(2, "0");

    return `${dd}/${mm}/${yy} | ${hh}:${mins}${ampm}`;
  } catch {
    return "--/--/-- | --:--";
  }
};

export const MemberPendingRequests = ({ userId }: { userId: string }) => {
  const { user, userData } = useAuth();
  const [requests, setRequests] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || userData?.role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    let allLeaves: PendingItem[] = [];
    let allLate: PendingItem[] = [];
    let allCorrections: PendingItem[] = [];

    const updateCombined = () => {
      setRequests([...allLeaves, ...allLate, ...allCorrections]);
      setLoading(false);
    };

    // 1. Pending Leaves for this employee
    const qLeaves = query(
      collection(db, "leaves"),
      where("userId", "==", userId),
      where("status", "==", "pending"),
    );
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      allLeaves = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allLeaves.push({
          id: docSnap.id,
          collectionName: "leaves",
          userId: data.userId || userId,
          name: data.name || "Employee",
          type: data.leaveType || "Leave Request",
          detail:
            data.startDate === data.endDate
              ? formatDate(data.startDate)
              : `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`,
          appliedAt: formatAppliedTime(data.createdAt),
          status: data.status || "pending",
        });
      });
      updateCombined();
    });

    // 2. Pending Late Arrivals for this employee
    const qLate = query(
      collection(db, "late_arrivals"),
      where("userId", "==", userId),
      where("status", "==", "pending"),
    );
    const unsubLate = onSnapshot(qLate, (snapshot) => {
      allLate = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allLate.push({
          id: docSnap.id,
          collectionName: "late_arrivals",
          userId: data.userId || userId,
          name: data.name || "Employee",
          type: "Late Request",
          detail: `Arriving at: ${formatTimeStr(data.newArrivalTime || "10:00")}`,
          appliedAt: formatAppliedTime(data.createdAt),
          status: data.status || "pending",
        });
      });
      updateCombined();
    });

    // 3. Pending Attendance Corrections for this employee
    const qCorrections = query(
      collection(db, "attendance_corrections"),
      where("userId", "==", userId),
      where("status", "==", "pending"),
    );
    const unsubCorrections = onSnapshot(qCorrections, (snapshot) => {
      allCorrections = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allCorrections.push({
          id: docSnap.id,
          collectionName: "attendance_corrections",
          userId: data.userId || userId,
          name: data.name || "Employee",
          type: "Attendance Correction",
          detail: `Date: ${formatDate(data.date || "")}`,
          appliedAt: formatAppliedTime(data.createdAt),
          status: data.status || "pending",
        });
      });
      updateCombined();
    });

    return () => {
      unsubLeaves();
      unsubLate();
      unsubCorrections();
    };
  }, [userId, userData]);

  const handleStatusChange = async (item: PendingItem, newStatus: string) => {
    if (newStatus === "pending") return;

    try {
      setUpdatingId(item.id);
      const docRef = doc(db, item.collectionName, item.id);
      await updateDoc(docRef, {
        status: newStatus,
        reviewedBy: user?.uid,
        reviewedAt: new Date().toISOString(),
      });
      if (newStatus === "approved") {
        await sendPushNotificationToUser({
          targetUserId: item.userId,
          title: "Attendance Correction Approved",
          body: `Your attendance correction request for ${item.detail} has been approved.`,
          url: "/attendance",
        });
      }
    } catch (error) {
      console.error("Error updating request status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="w-full font-poppins text-black">
      <span className="text-[10px] text-[#8C827A] font-normal block mb-1.5">
        Pending Requests
      </span>

      <div className="border border-[#E5DEC9] bg-background p-2.5 rounded-xs">
        {loading ? (
          <div className="p-3 space-y-2 animate-pulse">
            <div className="h-8 bg-[#E5DEC9]/40 rounded-xs" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#8C827A]">
            No pending requests for this employee.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {requests.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center py-2.5 first:pt-0 last:pb-0 gap-2 text-xs"
              >
                {/* Name & ID */}
                <div className="col-span-2 flex flex-col">
                  <span className="font-semibold text-[9px] text-[#231F20] tracking-wide">
                    {getFirstName(item.name)}
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light">
                    ID: {item.userId}
                  </span>
                </div>

                {/* Type & Detail */}
                <div className="col-span-4 flex flex-col">
                  <span className="font-normal text-[8px] text-[#231F20]">
                    {item.type}
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light leading-snug">
                    {item.detail}
                  </span>
                </div>

                {/* Applied Date */}
                <div className="col-span-4 flex flex-col">
                  <span className="font-normal text-[8px] text-[#231F20]">
                    Date & Time Applied
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light">
                    {item.appliedAt}
                  </span>
                </div>

                {/* Dropdown / Status */}
                <div className="col-span-2 flex justify-end">
                  {updatingId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-orange" />
                  ) : (
                    <div className="relative inline-flex items-center border border-[#231F20] rounded-xs py-0.5">
                      <select
                        defaultValue="pending"
                        onChange={(e) =>
                          handleStatusChange(item, e.target.value)
                        }
                        className="bg-transparent text-[8px] text-[#231F20] font-medium appearance-none focus:outline-none cursor-pointer pl-1.5 pr-4 select-none"
                      >
                        <option value="pending" disabled>
                          Pending
                        </option>
                        <option value="approved">Approve</option>
                        <option value="denied">Deny</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-[#231F20] pointer-events-none absolute right-1" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
