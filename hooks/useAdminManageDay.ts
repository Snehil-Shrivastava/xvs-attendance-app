// hooks/useAdminManageDay.ts
"use client";

import { useState } from "react";
import { doc, setDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DayRecord } from "@/lib/calendarStatus";

type ManageStatus = "Present" | "Absent" | "Half Day" | "Leave";
type LeaveSubType = "normal" | "unpaid";

interface UseAdminManageDayInput {
  effectiveUid: string | undefined;
  userData: { name?: string } | null;
  monthlyRecords: Record<string, DayRecord>;
  approvedLeavesMap: Record<string, string>;
}

export interface UseAdminManageDayReturn {
  isOpen: boolean;
  remarkDate: string;
  selectedStatus: ManageStatus;
  setSelectedStatus: (s: ManageStatus) => void;
  checkInTime: string;
  setCheckInTime: (t: string) => void;
  leaveSubType: LeaveSubType;
  setLeaveSubType: (t: LeaveSubType) => void;
  remarkText: string;
  setRemarkText: (t: string) => void;
  savingRemark: boolean;
  openModal: (dateStr: string) => void;
  closeModal: () => void;
  save: (e: React.FormEvent) => Promise<void>;
}

export function useAdminManageDay({
  effectiveUid,
  userData,
  monthlyRecords,
  approvedLeavesMap,
}: UseAdminManageDayInput): UseAdminManageDayReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [remarkDate, setRemarkDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ManageStatus>("Present");
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [leaveSubType, setLeaveSubType] = useState<LeaveSubType>("normal");
  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const openModal = (dateStr: string) => {
    const record = monthlyRecords[dateStr];
    setRemarkDate(dateStr);
    setRemarkText(record?.remark || "");

    // Pre-populate status from existing data
    if (record?.status === "On Leave" || approvedLeavesMap[dateStr]) {
      setSelectedStatus("Leave");
      setLeaveSubType(
        record?.leaveType === "Unpaid Leave" ? "unpaid" : "normal",
      );
    } else if (record?.status === "Half Day") {
      setSelectedStatus("Half Day");
    } else if (record?.status === "Absent") {
      setSelectedStatus("Absent");
    } else {
      setSelectedStatus("Present");
    }

    setCheckInTime(record?.checkIn ? record.checkIn.slice(0, 5) : "09:00");
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUid || !remarkDate) return;

    setSavingRemark(true);
    try {
      const month = remarkDate.slice(0, 7);
      const nowIso = new Date().toISOString();
      const dailyRef = doc(
        db,
        "daily_attendance",
        `${remarkDate}_${effectiveUid}`,
      );
      const leaveDocRef = doc(db, "leaves", `${remarkDate}_${effectiveUid}`);
      const monthlySummaryRef = doc(
        db,
        "monthly_summaries",
        `${month}_${effectiveUid}`,
      );

      const existingRecord = monthlyRecords[remarkDate];
      const wasPreviouslyLate = existingRecord?.status === "Late";

      const decrementLateIfNeeded = async () => {
        if (!wasPreviouslyLate) return;
        await setDoc(
          monthlySummaryRef,
          { lateDays: increment(-1) },
          { merge: true },
        );
      };

      // 1. PRESENT
      if (selectedStatus === "Present") {
        await setDoc(
          dailyRef,
          {
            userId: effectiveUid,
            date: remarkDate,
            month,
            status: "On Time",
            checkIn: `${checkInTime}:00`,
            remark: remarkText.trim(),
            updatedAt: nowIso,
          },
          { merge: true },
        );
        await deleteDoc(leaveDocRef).catch(() => {});
        await decrementLateIfNeeded();
      }
      // 2. ABSENT
      else if (selectedStatus === "Absent") {
        await setDoc(
          dailyRef,
          {
            userId: effectiveUid,
            date: remarkDate,
            month,
            status: "Absent",
            checkIn: null,
            checkOut: null,
            remark: remarkText.trim(),
            updatedAt: nowIso,
          },
          { merge: true },
        );
        await deleteDoc(leaveDocRef).catch(() => {});
        await decrementLateIfNeeded();
      }
      // 3. HALF DAY
      else if (selectedStatus === "Half Day") {
        await setDoc(
          dailyRef,
          {
            userId: effectiveUid,
            date: remarkDate,
            month,
            status: "Half Day",
            remark: remarkText.trim(),
            updatedAt: nowIso,
          },
          { merge: true },
        );
        await setDoc(
          leaveDocRef,
          {
            userId: effectiveUid,
            name: userData?.name || "Employee",
            startDate: remarkDate,
            endDate: remarkDate,
            totalDays: 0.5,
            durationType: "half",
            leaveType: "Half Day",
            status: "approved",
            remarks: remarkText.trim() || "Marked by Admin",
            source: "admin",
            createdAt: nowIso,
          },
          { merge: true },
        );
        await decrementLateIfNeeded();
      }
      // 4. LEAVE
      else if (selectedStatus === "Leave") {
        const finalLeaveType =
          leaveSubType === "unpaid" ? "Unpaid Leave" : "Casual Leave";

        await setDoc(
          dailyRef,
          {
            userId: effectiveUid,
            date: remarkDate,
            month,
            status: "On Leave",
            leaveType: finalLeaveType,
            checkIn: null,
            checkOut: null,
            remark: remarkText.trim(),
            updatedAt: nowIso,
          },
          { merge: true },
        );
        await setDoc(
          leaveDocRef,
          {
            userId: effectiveUid,
            name: userData?.name || "Employee",
            startDate: remarkDate,
            endDate: remarkDate,
            totalDays: 1,
            durationType: "single",
            leaveType: finalLeaveType,
            status: "approved",
            remarks: remarkText.trim() || "Marked by Admin",
            source: "admin",
            createdAt: nowIso,
          },
          { merge: true },
        );
        await decrementLateIfNeeded();
      }

      setIsOpen(false);
    } catch (err) {
      console.error("Failed to save day settings:", err);
    } finally {
      setSavingRemark(false);
    }
  };

  return {
    isOpen,
    remarkDate,
    selectedStatus,
    setSelectedStatus,
    checkInTime,
    setCheckInTime,
    leaveSubType,
    setLeaveSubType,
    remarkText,
    setRemarkText,
    savingRemark,
    openModal,
    closeModal,
    save,
  };
}
