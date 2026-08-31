"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface LeaveItem {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}

const LeaveHistory = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Read directly from the `leaves` collection for this employee
    const q = query(collection(db, "leaves"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: LeaveItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<LeaveItem, "id"> & {
            status?: string;
          };

          if (data.status === "approved") {
            fetched.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<LeaveItem, "id">),
            });
          }
        });

        // Sort newest first
        fetched.sort((a, b) =>
          (b.startDate || "").localeCompare(a.startDate || ""),
        );
        setLeaves(fetched);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching leave history:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  };

  const formatDisplayDate = (start: string, end: string) => {
    const formattedStart = formatDate(start);
    if (!end || start === end) return formattedStart;
    return `${formattedStart} - ${formatDate(end)}`;
  };

  return (
    <div className="w-full font-poppins mt-6 text-black pb-10">
      <span className="text-[10px] text-[#8C827A] font-normal block mb-2">
        Leaves History
      </span>

      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
            <div className="h-12 bg-[#E5DEC9]/40 rounded-xs" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C827A]">
            No leave records found yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {leaves.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center px-5 py-4 gap-2 text-[10px]"
              >
                {/* Column 1: Leave Type */}
                <div className="col-span-4 font-semibold text-[#231F20] tracking-wide">
                  {item.leaveType}
                </div>

                {/* Column 2: Date Range */}
                <div className="col-span-5 text-[#8C827A] font-light text-center md:text-left">
                  <span className="text-[8px]">
                    {formatDisplayDate(item.startDate, item.endDate)}
                  </span>
                </div>

                {/* Column 3: Total Days */}
                <div className="col-span-3 text-right font-semibold text-[#231F20]">
                  {item.totalDays} {item.totalDays === 1 ? "Day" : "Days"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistory;
