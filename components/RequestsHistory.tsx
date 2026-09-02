"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ChevronsUpDown } from "lucide-react";

interface RequestItem {
  id: string;
  type: string; // "Leave", "Half Day", "Late Request", "Attendance Correction"
  subType?: string; // "Sick Leave", "Casual Leave", etc.
  date: string; // "2026-08-11"
  endDate?: string; // "2026-08-13"
  timeInfo?: string; // "10:30 AM" or "09:00 AM - 01:00 PM"
  status: "approved" | "denied" | "pending";
  createdAt?: unknown;
}

type SortField = "type" | "date" | "status";
type SortOrder = "asc" | "desc";

const RequestsHistory = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<RequestItem[]>([]);
  const [lateRequests, setLateRequests] = useState<RequestItem[]>([]);
  const [corrections, setCorrections] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting states
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Helper: Format "09:00" -> "09:00 AM" or "13:30" -> "01:30 PM"
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

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // 1. Listen to `leaves` collection
    const qLeaves = query(
      collection(db, "leaves"),
      where("userId", "==", user.uid),
    );
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      const items: RequestItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isHalfDay =
          data.leaveType === "Half Day" ||
          data.durationType === "half" ||
          data.totalDays === 0.5;

        let timeDetails = "";
        if (isHalfDay && (data.fromTime || data.toTime)) {
          const from = formatTimeStr(data.fromTime);
          const to = formatTimeStr(data.toTime);
          timeDetails = `${from} - ${to}`;
        }

        items.push({
          id: `leave_${docSnap.id}`,
          type: isHalfDay ? "Half Day" : "Leave",
          subType: isHalfDay ? undefined : data.leaveType || "Leave",
          date: data.startDate || "",
          endDate: data.endDate || "",
          timeInfo: timeDetails,
          status: data.status || "pending",
          createdAt: data.createdAt,
        });
      });
      setLeaves(items);
    });

    // 2. Listen to `late_arrivals` collection
    const qLate = query(
      collection(db, "late_arrivals"),
      where("userId", "==", user.uid),
    );
    const unsubLate = onSnapshot(qLate, (snapshot) => {
      const items: RequestItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: `late_${docSnap.id}`,
          type: "Late Request",
          date: data.date || "",
          timeInfo: formatTimeStr(data.newArrivalTime || "10:00 AM"),
          status: data.status || "pending",
          createdAt: data.createdAt,
        });
      });
      setLateRequests(items);
    });

    // 3. Listen to `attendance_corrections` collection
    const qCorrections = query(
      collection(db, "attendance_corrections"),
      where("userId", "==", user.uid),
    );
    const unsubCorrections = onSnapshot(qCorrections, (snapshot) => {
      const items: RequestItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: `corr_${docSnap.id}`,
          type: "Attendance Correction",
          date: data.date || "",
          status: data.status || "pending",
          createdAt: data.createdAt,
        });
      });
      setCorrections(items);
      setLoading(false);
    });

    return () => {
      unsubLeaves();
      unsubLate();
      unsubCorrections();
    };
  }, [user]);

  // Handle column header clicks
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "date" ? "desc" : "asc");
    }
  };

  // Combine and Sort all request types
  const combinedRequests = useMemo(() => {
    const all = [...leaves, ...lateRequests, ...corrections];

    return all.sort((a, b) => {
      let comparison = 0;

      if (sortField === "date") {
        const dateA = a.date || "";
        const dateB = b.date || "";
        comparison = dateA.localeCompare(dateB);
      } else if (sortField === "type") {
        const typeA = a.subType ? `${a.type} ${a.subType}` : a.type;
        const typeB = b.subType ? `${b.type} ${b.subType}` : b.type;
        comparison = typeA.localeCompare(typeB);
      } else if (sortField === "status") {
        const statusA = a.status || "";
        const statusB = b.status || "";
        comparison = statusA.localeCompare(statusB);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [leaves, lateRequests, corrections, sortField, sortOrder]);

  // Helper: Format "2026-08-11" -> "11. Aug. 2026"
  const formatDate = (dateStr: string) => {
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

  return (
    <div className="w-full font-poppins text-black">
      {/* Outer Table Container */}
      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden rounded-xs">
        {/* =========================================
            TABLE HEADER (SORTABLE)
        ========================================= */}
        <div className="grid grid-cols-12 items-center px-5 py-4 border-b border-[#E5DEC9] text-[#8C827A] text-xs font-normal select-none">
          {/* Column 1: Request Type (Alphabetical Sort) */}
          <button
            type="button"
            onClick={() => handleSort("type")}
            className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-[#231F20] transition text-left"
            title="Sort alphabetically by request type"
          >
            <span>Request Type</span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
          </button>

          {/* Column 2: Date (Chronological Sort) */}
          <button
            type="button"
            onClick={() => handleSort("date")}
            className="col-span-5 flex items-center justify-center gap-1 cursor-pointer hover:text-[#231F20] transition text-center"
            title="Sort by date"
          >
            <span>Date</span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
          </button>

          {/* Column 3: Status (Alphabetical Sort) */}
          <button
            type="button"
            onClick={() => handleSort("status")}
            className="col-span-3 flex items-center justify-end gap-1 cursor-pointer hover:text-[#231F20] transition text-right"
            title="Sort by status"
          >
            <span>Status</span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
          </button>
        </div>

        {/* =========================================
            TABLE BODY
        ========================================= */}
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
          </div>
        ) : combinedRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C827A]">
            No submitted requests found.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {combinedRequests.map((item) => {
              const isApproved = item.status === "approved";
              const isDenied = item.status === "denied";
              const isMultiDay =
                item.endDate &&
                item.endDate !== item.date &&
                item.type === "Leave";

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center px-5 py-4 gap-2 text-[10px]"
                >
                  {/* Column 1: Request Type + Subtype */}
                  <div className="col-span-4 flex flex-col justify-center max-w-27 gap-1.5">
                    <span className="font-semibold text-[#231F20] tracking-wide leading-snug">
                      {item.type}
                    </span>
                    {item.subType && (
                      <span className="text-[10px] opacity-60 font-normal leading-tight">
                        {item.subType}
                      </span>
                    )}
                  </div>

                  {/* Column 2: Date / Date Range (Multi-line) + Time Details */}
                  <div className="col-span-5 flex flex-col items-center justify-center text-center gap-1.5">
                    {isMultiDay ? (
                      <div className="flex flex-col items-center leading-tight">
                        <span className="font-normal text-[10px]">
                          {formatDate(item.date)} -
                        </span>
                        <span className="font-normal text-[10px]">
                          {formatDate(item.endDate as string)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-normal text-[10px] leading-tight">
                        {formatDate(item.date)}
                      </span>
                    )}

                    {item.timeInfo && (
                      <span className="text-[10px] opacity-60 font-normal leading-tight whitespace-nowrap mt-0.5">
                        {item.timeInfo}
                      </span>
                    )}
                  </div>

                  {/* Column 3: Status Badge */}
                  <div className="col-span-3 flex justify-end">
                    {isApproved ? (
                      <div className="bg-[#F28B31] text-white text-[8px] font-medium px-1.5 py-1.5 flex items-center justify-center gap-1.5 w-15">
                        <span>Approved</span>
                      </div>
                    ) : isDenied ? (
                      <div className="bg-[#D64545] text-white text-[8px] font-medium px-1.5 py-1.5 flex items-center justify-center gap-1.5 w-15">
                        <span>Denied</span>
                      </div>
                    ) : (
                      <div className="bg-[#8C827A] text-white text-[8px] font-medium px-1.5 py-1.5 flex items-center justify-center gap-1.5 w-15">
                        <span>Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsHistory;
