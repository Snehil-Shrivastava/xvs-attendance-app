"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

/* =========================================
   TYPES
========================================= */
type RequestCollection = "leaves" | "late_arrivals" | "attendance_corrections";

interface RequestItem {
  id: string;
  collectionName: RequestCollection;
  userId: string;
  name: string;
  type: string; // "Late Request", "Casual Leave", "Attendance Correction"...
  detail: string; // "Arriving at: 10:30 AM" or date range
  appliedAt: string; // "07/09/26 | 09:30am"
  appliedTs: number; // epoch ms — used for sorting only
  status: "approved" | "denied";
}

type SortField = "date" | "name" | "type" | "status";

/* =========================================
   HELPERS
========================================= */
const getFirstName = (fullName: string) =>
  fullName.trim().split(" ")[0] || "Employee";

/** Normalizes Firestore Timestamp / ISO string / epoch into ms */
const toEpoch = (createdAt: unknown): number => {
  if (!createdAt) return 0;
  if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "toDate" in createdAt &&
    typeof (createdAt as { toDate: unknown }).toDate === "function"
  ) {
    return (createdAt as { toDate: () => Date }).toDate().getTime();
  }
  if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "seconds" in createdAt
  ) {
    return (createdAt as { seconds: number }).seconds * 1000;
  }
  if (typeof createdAt === "number") return createdAt;
  if (typeof createdAt === "string") {
    const t = new Date(createdAt).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
};

/** "07/09/26 | 09:30am" */
const formatAppliedTime = (createdAt: unknown): string => {
  const ts = toEpoch(createdAt);
  if (!ts) return "---";
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const ampm = d.getHours() >= 12 ? "pm" : "am";
  const hh = String(d.getHours() % 12 || 12).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yy} | ${hh}:${min}${ampm}`;
};

/** Format "09:00" -> "09:00 AM" or "13:30" -> "01:30 PM" (same as RequestsHistory) */
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

/** Format "2026-08-11" -> "11 Aug 2026" (same as RequestsHistory) */
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

/* =========================================
   COMPONENT
========================================= */
const AdminProcessedRequests = () => {
  const { user, userData } = useAuth();
  const isAdmin = userData?.role === "admin";

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");

  useEffect(() => {
    // Admin-only: never subscribe for non-admin users
    if (!user || !isAdmin) return;
    setLoading(true);

    let allLeaves: RequestItem[] = [];
    let allLate: RequestItem[] = [];
    let allCorrections: RequestItem[] = [];

    const updateCombined = () => {
      setRequests([...allLeaves, ...allLate, ...allCorrections]);
      setLoading(false);
    };

    // ✅ ONLY resolved requests — "pending" is never fetched here
    const resolvedOnly = where("status", "in", ["approved", "denied"]);

    // 1. Listen to resolved leaves
    // const unsubLeaves = onSnapshot(
    //   query(collection(db, "leaves"), resolvedOnly),
    //   (snapshot) => {
    //     allLeaves = [];
    //     snapshot.forEach((docSnap) => {
    //       const data = docSnap.data();
    //       const dateDetail =
    //         data.startDate === data.endDate
    //           ? `Date: ${data.startDate}`
    //           : `${data.startDate || ""} - ${data.endDate || ""}`;

    //       allLeaves.push({
    //         id: docSnap.id,
    //         collectionName: "leaves",
    //         userId: data.userId || "---",
    //         name: data.name || "Employee",
    //         type: data.leaveType || "Leave",
    //         detail:
    //           data.fromTime && data.toTime
    //             ? `${data.fromTime} - ${data.toTime}`
    //             : dateDetail,
    //         appliedAt: formatAppliedTime(data.createdAt),
    //         appliedTs: toEpoch(data.createdAt),
    //         status: data.status,
    //       });
    //     });
    //     updateCombined();
    //   },
    // );

    // 1. Listen to resolved leaves
    const unsubLeaves = onSnapshot(
      query(collection(db, "leaves"), resolvedOnly),
      (snapshot) => {
        allLeaves = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          const dateDetail =
            data.startDate === data.endDate
              ? `Date: ${formatDate(data.startDate)}`
              : `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`;

          // ✅ FIX: when a time range exists (half day), keep the DATE too
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
            appliedTs: toEpoch(data.createdAt),
            status: data.status,
          });
        });
        updateCombined();
      },
    );

    // 2. Listen to resolved late arrivals
    const unsubLate = onSnapshot(
      query(collection(db, "late_arrivals"), resolvedOnly),
      (snapshot) => {
        allLate = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allLate.push({
            id: docSnap.id,
            collectionName: "late_arrivals",
            userId: data.userId || "---",
            name: data.name || "Employee",
            type: "Late Request",
            detail: `Arriving at: ${formatTimeStr(data.newArrivalTime || "--:--")}`,
            appliedAt: formatAppliedTime(data.createdAt),
            appliedTs: toEpoch(data.createdAt),
            status: data.status,
          });
        });
        updateCombined();
      },
    );

    // 3. Listen to resolved attendance corrections
    const unsubCorrections = onSnapshot(
      query(collection(db, "attendance_corrections"), resolvedOnly),
      (snapshot) => {
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
            appliedTs: toEpoch(data.createdAt),
            status: data.status,
          });
        });
        updateCombined();
      },
    );

    return () => {
      unsubLeaves();
      unsubLate();
      unsubCorrections();
    };
  }, [user, isAdmin]);

  /* ---------- Sorting ---------- */
  const sortedRequests = useMemo(() => {
    const arr = [...requests];
    arr.sort((a, b) => {
      switch (sortField) {
        case "name":
          return a.name.localeCompare(b.name);
        case "type":
          return a.type.localeCompare(b.type);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return b.appliedTs - a.appliedTs; // Date → newest first
      }
    });
    return arr;
  }, [requests, sortField]);

  /* ---------- Render ---------- */
  return (
    <div className="w-full font-poppins text-black pt-5">
      {/* ============ HEADER ROW ============ */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] opacity-50">All Requests</span>

        <div className="flex items-center gap-2">
          <span className="text-[10px] opacity-50">Sort by:</span>
          <div className="relative flex items-center">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="appearance-none bg-transparent text-[10px] font-semibold text-[#231F20] focus:outline-none cursor-pointer pr-2 select-none"
            >
              <option className="bg-background" value="date">
                Date
              </option>
              <option className="bg-background" value="name">
                Name
              </option>
              <option className="bg-background" value="type">
                Type
              </option>
              <option className="bg-background" value="status">
                Status
              </option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#231F20] pointer-events-none absolute right-0" />
          </div>
        </div>
      </div>

      {/* ============ REQUESTS CARD ============ */}
      <div className="bg-[#F4E5CE] mt-3">
        {loading ? (
          <div className="py-4 space-y-6 animate-pulse">
            <div className="h-10 bg-[#E5D5BC]/50 rounded-xs" />
            <div className="h-10 bg-[#E5D5BC]/50 rounded-xs" />
            <div className="h-10 bg-[#E5D5BC]/50 rounded-xs" />
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#8C827A]">
            No approved or rejected requests yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E5D5BC] px-2.5">
            {sortedRequests.map((item) => (
              <div
                key={`${item.collectionName}-${item.id}`}
                className="grid grid-cols-16 items-center gap-4 py-2.5 text-xs"
              >
                {/* Column 1: Employee Name & ID */}
                <div className="col-span-3 flex flex-col gap-1">
                  <span
                    className="font-semibold text-[10px] text-[#231F20] tracking-wide"
                    title={item.name}
                  >
                    {getFirstName(item.name)}
                  </span>
                  <span className="text-[10px] text-[#8C827A] font-light">
                    ID: {item.userId}
                  </span>
                </div>

                {/* Column 2: Request Type & Detail */}
                <div className="col-span-5 flex flex-col gap-1">
                  <span className="text-[10px] text-[#231F20]">
                    {item.type}
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light">
                    {item.detail}
                  </span>
                </div>

                {/* Column 3: Date & Time Applied */}
                <div className="col-span-4 flex flex-col gap-1">
                  <span className="text-[8px] text-[#231F20]">
                    Date & Time Applied
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light">
                    {item.appliedAt}
                  </span>
                </div>

                {/* Column 4: Status Badge */}
                <div className="col-span-4 flex justify-end">
                  {item.status === "approved" ? (
                    <div className="bg-brand-orange text-white text-[8px] font-medium px-1.5 py-1.5 text-center w-14">
                      Approved
                    </div>
                  ) : (
                    <div className="bg-[#7A5C52] text-white text-[8px] font-medium px-1.5 py-1.5 text-center w-14">
                      Rejected
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

export default AdminProcessedRequests;
