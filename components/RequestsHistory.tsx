"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Check, Ban, Clock, ChevronsUpDown } from "lucide-react";

interface RequestItem {
  id: string;
  type: string; // "Sick Leave", "Late Request", "Attendance Correction", etc.
  date: string; // "2026-08-11"
  status: "approved" | "denied" | "pending";
  createdAt?: unknown;
}

const RequestsHistory = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<RequestItem[]>([]);
  const [lateRequests, setLateRequests] = useState<RequestItem[]>([]);
  const [corrections, setCorrections] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting state for Date header: "desc" (newest first) or "asc" (oldest first)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

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
        items.push({
          id: `leave_${docSnap.id}`,
          type: data.leaveType || "Leave",
          date: data.startDate || "",
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

  // Combine and Sort all request types
  const combinedRequests = useMemo(() => {
    const all = [...leaves, ...lateRequests, ...corrections];

    return all.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (sortOrder === "asc") {
        return dateA.localeCompare(dateB);
      }
      return dateB.localeCompare(dateA);
    });
  }, [leaves, lateRequests, corrections, sortOrder]);

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
  // const formatDate = (dateStr: string) => {
  //   if (!dateStr) return "--";
  //   try {
  //     const [year, month, day] = dateStr.split("-");
  //     return `${day}/${month}/${year}`;
  //   } catch {
  //     return dateStr;
  //   }
  // };

  // Toggle Sorting
  const toggleDateSort = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  return (
    <div className="w-full font-poppins text-black">
      {/* Outer Table Container */}
      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden rounded-xs">
        {/* =========================================
            TABLE HEADER
        ========================================= */}
        <div className="grid grid-cols-12 items-center px-5 py-4 border-b border-[#E5DEC9] text-[#8C827A] text-xs font-normal">
          {/* Column 1: Request Type */}
          <div className="col-span-5 flex items-center gap-1">
            <span>Request Type</span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
          </div>

          {/* Column 2: Date (Clickable to Sort) */}
          <button
            type="button"
            onClick={toggleDateSort}
            className="col-span-3 flex items-center justify-center gap-1 cursor-pointer hover:text-[#231F20] transition select-none text-center"
            title="Click to sort by date"
          >
            <span>Date</span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {/* Column 3: Status */}
          <div className="col-span-4 flex items-center justify-end gap-1 text-right">
            <span>Status</span>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
          </div>
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

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center px-5 py-4.5 gap-2 text-[10px]"
                >
                  {/* Column 1: Request Type */}
                  <div className="col-span-5 font-semibold text-[#231F20] tracking-wide leading-snug max-w-27">
                    {item.type}
                  </div>

                  {/* Column 2: Date (e.g. 31. Dec. 2022) */}
                  <div className="col-span-3 text-[#7A8B99] font-normal text-center text-[10px]">
                    {formatDate(item.date)}
                  </div>

                  {/* Column 3: Status Badge */}
                  <div className="col-span-4 flex justify-end">
                    {isApproved ? (
                      <div className="bg-[#F28B31] text-white text-[8px] font-medium px-1.5 py-1.5 flex items-center justify-center gap-1.5 w-15">
                        {/* <Check className="w-2.5 h-2.5 stroke-3 shrink-0" /> */}
                        <span>Approved</span>
                      </div>
                    ) : isDenied ? (
                      <div className="bg-[#D64545] text-white text-[8px] font-medium px-1.5 py-1.5 flex items-center justify-center gap-1.5 w-15">
                        {/* <Ban className="w-2.5 h-2.5 shrink-0" /> */}
                        <span>Denied</span>
                      </div>
                    ) : (
                      <div className="bg-[#8C827A] text-white text-[8px] font-medium px-1.5 py-1.5 flex items-center justify-center gap-1.5 w-15">
                        {/* <Clock className="w-2.5 h-2.5 shrink-0" /> */}
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
