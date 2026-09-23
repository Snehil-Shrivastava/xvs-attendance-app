"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRequestActions } from "@/hooks/useRequestActions";
import {
  getFirstName,
  formatDate,
  formatTimeStr,
  formatAppliedTime,
} from "@/lib/requestFormat";
import { buildRequestNotification } from "@/lib/requestNotifications";
import { applyLateArrivalApproval } from "@/lib/lateArrival";

interface PendingItem {
  id: string;
  collectionName: "leaves" | "late_arrivals" | "attendance_corrections";
  userId: string;
  name: string;
  type: string;
  dateDetail: string;
  timeDetail?: string;
  appliedDate: string;
  appliedTime: string;
  status: "pending" | "approved" | "denied";
}

const PendingRequests = () => {
  const { user, userData } = useAuth();
  const [requests, setRequests] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { updatingId, changeStatus } = useRequestActions<PendingItem>({
    buildNotification: (item, status) => {
      const detailSummary = item.timeDetail
        ? `${item.dateDetail} (${item.timeDetail})`
        : item.dateDetail;
      return buildRequestNotification(
        {
          collectionName: item.collectionName,
          type: item.type,
          detail: detailSummary,
        },
        status,
      );
    },
    onApproved: async (item) => {
      if (item.collectionName === "late_arrivals") {
        await applyLateArrivalApproval(item.id);
      }
    },
  });

  useEffect(() => {
    if (!user || userData?.role !== "admin") return;
    setLoading(true);

    let allLeaves: PendingItem[] = [];
    let allLate: PendingItem[] = [];
    let allCorrections: PendingItem[] = [];

    const updateCombined = () => {
      setRequests([...allLeaves, ...allLate, ...allCorrections]);
      setLoading(false);
    };

    // 1. Pending leaves
    const qLeaves = query(
      collection(db, "leaves"),
      where("status", "==", "pending"),
    );
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      allLeaves = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        const isHalfDay =
          data.leaveType === "Half Day" ||
          data.durationType === "half" ||
          (data.fromTime && data.toTime);

        let dateLine = "";
        let timeLine = "";

        if (isHalfDay && data.fromTime && data.toTime) {
          dateLine = formatDate(data.startDate);
          timeLine = `${formatTimeStr(data.fromTime)} - ${formatTimeStr(data.toTime)}`;
        } else if (data.startDate === data.endDate || !data.endDate) {
          dateLine = formatDate(data.startDate);
        } else {
          dateLine = `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`;
        }

        const applied = formatAppliedTime(data.createdAt);

        allLeaves.push({
          id: docSnap.id,
          collectionName: "leaves",
          userId: data.userId || "---",
          name: data.name || "Employee",
          type: data.leaveType || "Leave",
          dateDetail: dateLine,
          timeDetail: timeLine,
          appliedDate: applied.date,
          appliedTime: applied.time,
          status: data.status || "pending",
        });
      });
      updateCombined();
    });

    // 2. Pending late arrivals
    const qLate = query(
      collection(db, "late_arrivals"),
      where("status", "==", "pending"),
    );
    const unsubLate = onSnapshot(qLate, (snapshot) => {
      allLate = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const applied = formatAppliedTime(data.createdAt);

        allLate.push({
          id: docSnap.id,
          collectionName: "late_arrivals",
          userId: data.userId || "---",
          name: data.name || "Employee",
          type: "Late Request",
          dateDetail: formatDate(data.date),
          timeDetail: `Arriving at: ${formatTimeStr(data.newArrivalTime || "10:00 AM")}`,
          appliedDate: applied.date,
          appliedTime: applied.time,
          status: data.status || "pending",
        });
      });
      updateCombined();
    });

    // 3. Pending attendance corrections
    const qCorrections = query(
      collection(db, "attendance_corrections"),
      where("status", "==", "pending"),
    );
    const unsubCorrections = onSnapshot(qCorrections, (snapshot) => {
      allCorrections = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const applied = formatAppliedTime(data.createdAt);

        allCorrections.push({
          id: docSnap.id,
          collectionName: "attendance_corrections",
          userId: data.userId || "---",
          name: data.name || "Employee",
          type: "Attendance Correction",
          dateDetail: formatDate(data.date),
          timeDetail: data.remarks ? `"${data.remarks}"` : "",
          appliedDate: applied.date,
          appliedTime: applied.time,
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

  if (userData?.role !== "admin") return null;

  return (
    <div className="w-full font-poppins text-black mb-6">
      <span className="text-[10px] opacity-50 font-normal">
        Pending Requests
      </span>

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
                className="grid grid-cols-12 items-center py-2.5 first:pt-0 last:pb-0 gap-3 text-xs"
              >
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

                <div className="col-span-4 flex flex-col">
                  <span className="font-semibold text-[8px] text-[#231F20]">
                    {item.type}
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light leading-tight mt-0.5">
                    {item.dateDetail}
                  </span>
                  {item.timeDetail && (
                    <span className="text-[8px] text-[#8C827A] font-light leading-tight">
                      {item.timeDetail}
                    </span>
                  )}
                </div>

                <div className="col-span-4 flex flex-col">
                  <span className="font-normal text-[8px] text-[#231F20]">
                    Date & Time Applied
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light leading-tight mt-0.5">
                    {item.appliedDate}
                  </span>
                  <span className="text-[8px] text-[#8C827A] font-light leading-tight">
                    {item.appliedTime}
                  </span>
                </div>

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
                        onChange={(e) => changeStatus(item, e.target.value)}
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
