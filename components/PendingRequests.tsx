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

interface PendingItem {
  id: string;
  collectionName: "leaves" | "late_arrivals" | "attendance_corrections";
  userId: string;
  name: string;
  type: string; // "Late Request", "Casual Leave", "Attendance Correction", etc.
  detail: string; // "Arriving at: 10:30 AM" or date range
  appliedAt: string; // "07/09/26 | 09:30am"
  status: "pending" | "approved" | "denied";
}

// Helper: Extract only the first name
const getFirstName = (fullName: string) => {
  if (!fullName) return "Employee";
  return fullName.trim().split(" ")[0] || "Employee";
};

// Helper: Format "09:00" -> "09:00 AM" or "13:30" -> "01:30 PM" (same as RequestsHistory)
const formatTimeStr = (t?: string | null) => {
  if (!t) return "";
  if (t.includes("AM") || t.includes("PM")) return t;
  try {
    const [h, m] = t.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${m} ${ampm}`;
  } catch {
    return t;
  }
};

// Helper: Format "2026-08-11" -> "11 Aug 2026" (same as RequestsHistory)
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "--";
  try {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const dayFormatted = String(date.getDate()).padStart(2, "0");
    const monthFormatted = date.toLocaleDateString("en-GB", {
      month: "short",
    });
    return `${dayFormatted} ${monthFormatted} ${year}`;
  } catch {
    return dateStr;
  }
};

const PendingRequests = () => {
  const { user, userData } = useAuth();
  const [requests, setRequests] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Helper: Format timestamp into "07/09/26 | 09:30am"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatAppliedTime = (createdAt?: any) => {
    try {
      const date = createdAt?.toDate ? createdAt.toDate() : new Date();
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

  useEffect(() => {
    if (!user || userData?.role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    let allLeaves: PendingItem[] = [];
    let allLate: PendingItem[] = [];
    let allCorrections: PendingItem[] = [];

    const updateCombined = () => {
      setRequests([...allLeaves, ...allLate, ...allCorrections]);
      setLoading(false);
    };

    // 1. Listen to pending leaves
    const qLeaves = query(
      collection(db, "leaves"),
      where("status", "==", "pending"),
    );
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      allLeaves = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        const dateDetail =
          data.startDate === data.endDate
            ? `Date: ${formatDate(data.startDate)}`
            : `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`;

        const timeDetail =
          data.fromTime && data.toTime
            ? `${formatDate(data.startDate)} | ${formatTimeStr(data.fromTime)} - ${formatTimeStr(data.toTime)}`
            : null;

        allLeaves.push({
          id: docSnap.id,
          collectionName: "leaves",
          userId: data.userId || "---",
          name: data.name || "Employee",
          type: data.leaveType || "Leave",
          detail: timeDetail ?? dateDetail,
          appliedAt: formatAppliedTime(data.createdAt),
          status: data.status || "pending",
        });
      });
      updateCombined();
    });

    // 2. Listen to pending late arrivals
    const qLate = query(
      collection(db, "late_arrivals"),
      where("status", "==", "pending"),
    );
    const unsubLate = onSnapshot(qLate, (snapshot) => {
      allLate = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allLate.push({
          id: docSnap.id,
          collectionName: "late_arrivals",
          userId: data.userId || "---",
          name: data.name || "Employee",
          type: "Late Request",
          detail: `Arriving at: ${formatTimeStr(data.newArrivalTime || "10:00 AM")}`,
          appliedAt: formatAppliedTime(data.createdAt),
          status: data.status || "pending",
        });
      });
      updateCombined();
    });

    // 3. Listen to pending attendance corrections
    const qCorrections = query(
      collection(db, "attendance_corrections"),
      where("status", "==", "pending"),
    );
    const unsubCorrections = onSnapshot(qCorrections, (snapshot) => {
      allCorrections = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allCorrections.push({
          id: docSnap.id,
          collectionName: "attendance_corrections",
          userId: data.userId || "---",
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
  }, [user, userData]);

  // Handle Admin Status Change (Approved / Denied)
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
    } catch (error) {
      console.error("Error updating request status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (userData?.role !== "admin") return null;

  return (
    <div className="w-full font-poppins text-black mb-6">
      {/* Section Header */}
      <span className="text-[10px] opacity-50 font-normal">
        Pending Requests
      </span>

      {/* Main Container */}
      <div className="border border-[#E5DEC9] bg-transparent p-2 rounded-xs mt-3">
        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            <div className="h-10 bg-[#E5DEC9]/40 rounded-xs" />
            <div className="h-10 bg-[#E5DEC9]/40 rounded-xs" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#8C827A]">
            No pending requests at the moment.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {requests.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center py-2 first:pt-0 last:pb-0 gap-3 text-xs"
              >
                {/* Column 1: Employee First Name & ID */}
                <div className="col-span-2 flex flex-col">
                  <span
                    className="font-semibold text-[8px] text-[#231F20] tracking-wide"
                    title={item.name}
                  >
                    {getFirstName(item.name)}
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light">
                    ID: {item.userId}
                  </span>
                </div>

                {/* Column 2: Request Type & Detail */}
                <div className="col-span-4 flex flex-col">
                  <span className="font-normal text-[8px] text-[#231F20]">
                    {item.type}
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light leading-snug">
                    {item.detail}
                  </span>
                </div>

                {/* Column 3: Date & Time Applied */}
                <div className="col-span-4 flex flex-col">
                  <span className="font-normal text-[8px] text-[#231F20]">
                    Date & Time Applied
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light">
                    {item.appliedAt}
                  </span>
                </div>

                {/* Column 4: Admin Action Dropdown */}
                <div className="col-span-2 flex justify-end">
                  {updatingId === item.id ? (
                    <div className="flex items-center justify-center w-24 py-1.5 border border-[#8C827A]/50 rounded-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                    </div>
                  ) : item.status === "approved" ? (
                    <div className="bg-brand-orange text-white text-[8px] font-medium px-4 py-1.5 rounded-xs text-center w-24">
                      Approved
                    </div>
                  ) : item.status === "denied" ? (
                    <div className="bg-[#D64545] text-white text-[8px] font-medium px-4 py-1.5 rounded-xs text-center w-24">
                      Denied
                    </div>
                  ) : (
                    <div className="relative inline-flex items-center border border-[#231F20] rounded-xs bg-transparent py-1">
                      <select
                        defaultValue="pending"
                        onChange={(e) =>
                          handleStatusChange(item, e.target.value)
                        }
                        className="bg-transparent text-[8px] text-[#231F20] font-medium appearance-none focus:outline-none cursor-pointer px-1.5 pr-5.5 select-none"
                      >
                        <option
                          className="bg-background"
                          value="pending"
                          disabled
                        >
                          Pending
                        </option>
                        <option className="bg-background" value="approved">
                          Approve
                        </option>
                        <option className="bg-background" value="denied">
                          Deny
                        </option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#231F20] pointer-events-none absolute right-1.5" />
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

export default PendingRequests;
