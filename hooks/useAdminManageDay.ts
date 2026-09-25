// hooks/useAdminManageDay.ts
"use client";

import { useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  deleteField, // ← NEW
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DayRecord } from "@/lib/calendarStatus";
import type { ShiftConfig } from "@/lib/attendanceStatus";
import { computeAttendanceFromCheckIn } from "@/lib/attendanceStatus";
import { recomputeMonthlyAttendance } from "@/lib/monthlySummary";

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
  deleteDay: () => Promise<void>;
}

const DEFAULT_SHIFT: ShiftConfig = {
  startTime: "09:01:00",
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
  const [checkInTime, setCheckInTime] = useState("09:01:00");
  const [leaveSubType, setLeaveSubType] = useState<LeaveSubType>("normal");
  const [isWorkFromHome, setIsWorkFromHome] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const openModal = (dateStr: string) => {
    const record = monthlyRecords[dateStr];
    setRemarkDate(dateStr);
    setRemarkText(record?.remark || "");

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

    setIsWorkFromHome(
      record?.status === "WFH" || record?.status === "Work from Home",
    );

    setCheckInTime(record?.checkIn ? record.checkIn.slice(0, 8) : "09:01:00");
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

      const userDoc = await getDoc(doc(db, "users", effectiveUid));
      const u = userDoc.data() || {};
      const shift: ShiftConfig = {
        startTime: String(u?.shift?.startTime || DEFAULT_SHIFT.startTime),
        monthlyGraceAllowance: Number(
          u?.shift?.monthlyGraceAllowance ??
            DEFAULT_SHIFT.monthlyGraceAllowance,
        ),
      };

      // Base fields common to every branch — note the legacy-field cleanup.
      const baseFields = {
        userId: effectiveUid,
        date: remarkDate,
        month,
        remark: remarkText.trim(),
        updatedAt: nowIso,
        leaveType: deleteField(),
        // Purge legacy float-valued fields so nothing stale lingers
        minutesDelayed: deleteField(),
        graceDeducted: deleteField(),
      };

      if (selectedStatus === "Present") {
        const normalizedCheckIn =
          checkInTime.split(":").length === 3
            ? checkInTime
            : `${checkInTime}:00`;

        if (isWorkFromHome) {
          await Promise.all([
            setDoc(
              dailyRef,
              {
                ...baseFields,
                status: "WFH",
                checkIn: normalizedCheckIn,
                delaySeconds: 0,
                graceDeductedSeconds: 0,
              },
              { merge: true },
            ),
            deleteDoc(leaveDocRef).catch(() => {}),
          ]);
        } else {
          const computed = computeAttendanceFromCheckIn(checkInTime, shift);
          await Promise.all([
            setDoc(
              dailyRef,
              {
                ...baseFields,
                status: computed.status,
                checkIn: normalizedCheckIn,
                delaySeconds: computed.delaySeconds,
                graceDeductedSeconds: computed.graceDeductedSeconds,
              },
              { merge: true },
            ),
            deleteDoc(leaveDocRef).catch(() => {}),
          ]);
        }
      } else if (selectedStatus === "Absent") {
        await Promise.all([
          setDoc(
            dailyRef,
            {
              ...baseFields,
              status: "Absent",
              checkIn: null,
              checkOut: null,
              delaySeconds: 0,
              graceDeductedSeconds: 0,
            },
            { merge: true },
          ),
          deleteDoc(leaveDocRef).catch(() => {}),
        ]);
      } else if (selectedStatus === "Half Day") {
        await Promise.all([
          setDoc(
            dailyRef,
            {
              ...baseFields,
              status: "Half Day",
              delaySeconds: 0,
              graceDeductedSeconds: 0,
            },
            { merge: true },
          ),
          setDoc(
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
          ),
        ]);
      } else if (selectedStatus === "Leave") {
        const finalLeaveType =
          leaveSubType === "unpaid" ? "Unpaid Leave" : "Casual Leave";

        await Promise.all([
          setDoc(
            dailyRef,
            {
              ...baseFields,
              status: "On Leave",
              leaveType: finalLeaveType,
              checkIn: null,
              checkOut: null,
              delaySeconds: 0,
              graceDeductedSeconds: 0,
            },
            { merge: true },
          ),
          setDoc(
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
          ),
        ]);
      }

      await recomputeMonthlyAttendance(
        effectiveUid,
        month,
        shift,
        userData?.name,
      );

      setIsOpen(false);
    } catch (err) {
      console.error("Failed to save day settings:", err);
    } finally {
      setSavingRemark(false);
    }
  };

  const deleteDay = async () => {
    if (!effectiveUid || !remarkDate) return;

    setSavingRemark(true);
    try {
      const month = remarkDate.slice(0, 7);
      const dailyRef = doc(
        db,
        "daily_attendance",
        `${remarkDate}_${effectiveUid}`,
      );
      const leaveDocRef = doc(db, "leaves", `${remarkDate}_${effectiveUid}`);

      await Promise.all([
        deleteDoc(dailyRef).catch(() => {}),
        deleteDoc(leaveDocRef).catch(() => {}),
      ]);

      const userDoc = await getDoc(doc(db, "users", effectiveUid));
      const u = userDoc.data() || {};
      const shift: ShiftConfig = {
        startTime: String(u?.shift?.startTime || DEFAULT_SHIFT.startTime),
        monthlyGraceAllowance: Number(
          u?.shift?.monthlyGraceAllowance ??
            DEFAULT_SHIFT.monthlyGraceAllowance,
        ),
      };

      await recomputeMonthlyAttendance(
        effectiveUid,
        month,
        shift,
        userData?.name,
      );

      setIsOpen(false);
    } catch (err) {
      console.error("Failed to delete day record:", err);
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
    deleteDay,
  };
}
