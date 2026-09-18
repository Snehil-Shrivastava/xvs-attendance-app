// hooks/useAdminManageDay.ts
"use client";

import { useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  increment,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DayRecord } from "@/lib/calendarStatus";
import {
  computeAttendanceFromCheckIn,
  type ShiftConfig,
} from "@/lib/attendanceStatus";

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
  isWorkFromHome: boolean;
  setIsWorkFromHome: (v: boolean) => void;
  remarkText: string;
  setRemarkText: (t: string) => void;
  savingRemark: boolean;
  openModal: (dateStr: string) => void;
  closeModal: () => void;
  save: (e: React.FormEvent) => Promise<void>;
}

const DEFAULT_SHIFT: ShiftConfig = {
  startTime: "09:00:00",
  monthlyGraceAllowance: 30,
};

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
  const [isWorkFromHome, setIsWorkFromHome] = useState(false);
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

    // Pre-populate WFH flag (accept legacy alias too)
    setIsWorkFromHome(
      record?.status === "WFH" || record?.status === "Work from Home",
    );

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

      // Fetch target user's shift config for Present classification.
      const userDoc = await getDoc(doc(db, "users", effectiveUid));
      const u = userDoc.data() || {};
      const shift: ShiftConfig = {
        startTime: String(u?.shift?.startTime || DEFAULT_SHIFT.startTime),
        monthlyGraceAllowance: Number(
          u?.shift?.monthlyGraceAllowance ??
            DEFAULT_SHIFT.monthlyGraceAllowance,
        ),
      };

      // Commit helper — runs all writes in parallel and reconciles
      // the `lateDays` counter in both directions.
      const commitDay = async (
        payload: Record<string, unknown>,
        willBeLate: boolean,
      ) => {
        const ops: Promise<unknown>[] = [
          setDoc(dailyRef, payload, { merge: true }),
          deleteDoc(leaveDocRef).catch(() => {}),
        ];

        if (wasPreviouslyLate && !willBeLate) {
          ops.push(
            setDoc(
              monthlySummaryRef,
              { lateDays: increment(-1) },
              { merge: true },
            ),
          );
        } else if (!wasPreviouslyLate && willBeLate) {
          ops.push(
            setDoc(
              monthlySummaryRef,
              { lateDays: increment(1) },
              { merge: true },
            ),
          );
        }

        await Promise.all(ops);
      };

      const baseFields = {
        userId: effectiveUid,
        date: remarkDate,
        month,
        remark: remarkText.trim(),
        updatedAt: nowIso,
        leaveType: deleteField(),
      };

      // 1. PRESENT (on-site or WFH)
      if (selectedStatus === "Present") {
        if (isWorkFromHome) {
          // WFH overrides late/grace classification.
          await commitDay(
            {
              ...baseFields,
              status: "WFH",
              checkIn: `${checkInTime}:00`,
              minutesDelayed: 0,
              graceDeducted: 0,
            },
            false,
          );
        } else {
          const computed = computeAttendanceFromCheckIn(checkInTime, shift);

          await commitDay(
            {
              ...baseFields,
              status: computed.status,
              checkIn: `${checkInTime}:00`,
              minutesDelayed: computed.minutesDelayed,
              graceDeducted: computed.graceDeducted,
            },
            computed.status === "Late",
          );
        }
      }
      // 2. ABSENT
      else if (selectedStatus === "Absent") {
        await commitDay(
          {
            ...baseFields,
            status: "Absent",
            checkIn: null,
            checkOut: null,
            minutesDelayed: 0,
            graceDeducted: 0,
          },
          false,
        );
      }
      // 3. HALF DAY
      else if (selectedStatus === "Half Day") {
        await commitDay(
          {
            ...baseFields,
            status: "Half Day",
            minutesDelayed: 0,
            graceDeducted: 0,
          },
          false,
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
      }
      // 4. LEAVE
      else if (selectedStatus === "Leave") {
        const finalLeaveType =
          leaveSubType === "unpaid" ? "Unpaid Leave" : "Casual Leave";

        await commitDay(
          {
            ...baseFields,
            status: "On Leave",
            leaveType: finalLeaveType,
            checkIn: null,
            checkOut: null,
            minutesDelayed: 0,
            graceDeducted: 0,
          },
          false,
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
    isWorkFromHome,
    setIsWorkFromHome,
    remarkText,
    setRemarkText,
    savingRemark,
    openModal,
    closeModal,
    save,
  };
}
