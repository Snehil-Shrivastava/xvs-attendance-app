"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Check,
  XCircle,
  Clock,
  Home,
  Palmtree,
  Star,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

type AttendanceStatus =
  | "On Time"
  | "Grace Used"
  | "Late/Allowed"
  | "Late"
  | "Half Day"
  | "Absent"
  | "On Leave"
  | "WFH"
  | "Work from Home"
  | "Holiday";

interface DailyRecord {
  id: string;
  date: string; // "2026-08-24"
  checkIn?: string | null; // "08:49:00"
  checkOut?: string | null;
  status: AttendanceStatus;
}

interface AttendanceHistoryProps {
  targetUserId?: string;
}

// ---------------------------------------------------------------------------
// Status -> badge metadata
// Colors intentionally match the calendar legend in `AttendanceCalendarView`
// so the same status reads the same across the app.
// ---------------------------------------------------------------------------
interface BadgeStyle {
  label: string;
  bgClass: string;
  Icon: LucideIcon;
}

const STATUS_BADGE_MAP: Record<string, BadgeStyle> = {
  "On Time": {
    label: "On Time",
    bgClass: "bg-[#F28B31]",
    Icon: Check,
  },
  "Late/Allowed": {
    label: "Late / Allowed",
    bgClass: "bg-[#91C95A]",
    Icon: Check,
  },
  "Grace Used": {
    label: "Late / Allowed",
    bgClass: "bg-[#91C95A]",
    Icon: Check,
  },
  Late: {
    label: "Late",
    bgClass: "bg-[#C23C3C]",
    Icon: XCircle,
  },
  "Half Day": {
    label: "Half Day",
    bgClass: "bg-[#74C0B5]",
    Icon: Clock,
  },
  Absent: {
    label: "Absent",
    bgClass: "bg-[#7A7269]",
    Icon: XCircle,
  },
  "On Leave": {
    label: "Leave",
    bgClass: "bg-[#4E7B80]",
    Icon: Palmtree,
  },
  WFH: {
    label: "WFH",
    bgClass: "bg-[#577A64]",
    Icon: Home,
  },
  "Work from Home": {
    label: "WFH",
    bgClass: "bg-[#577A64]",
    Icon: Home,
  },
  Holiday: {
    label: "Holiday",
    bgClass: "bg-[#BA255F]",
    Icon: Star,
  },
};

const FALLBACK_BADGE: BadgeStyle = {
  label: "Unknown",
  bgClass: "bg-[#8C827A]",
  Icon: HelpCircle,
};

function getStatusBadge(status?: string): BadgeStyle {
  if (!status) return FALLBACK_BADGE;
  return STATUS_BADGE_MAP[status] ?? { ...FALLBACK_BADGE, label: status };
}

const AttendanceHistory = ({ targetUserId }: AttendanceHistoryProps) => {
  const { user } = useAuth();
  const effectiveUid = targetUserId || user?.uid;
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !effectiveUid) return;

    const q = query(
      collection(db, "daily_attendance"),
      where("userId", "==", effectiveUid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedRecords: DailyRecord[] = [];
        snapshot.forEach((docSnap) => {
          fetchedRecords.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<DailyRecord, "id">),
          });
        });

        fetchedRecords.sort((a, b) => b.date.localeCompare(a.date));
        setRecords(fetchedRecords);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching attendance history:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, effectiveUid]);

  // "2026-08-24" -> "24 Aug 2026"
  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // "08:49:15" -> "08:49"
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "--:--:--";
    return timeStr.length >= 8 ? timeStr.slice(0, 8) : `${timeStr}:00`;
  };

  return (
    <div className="w-full font-poppins mt-4 text-black">
      <span className="text-[10px] opacity-50 font-normal block mb-2">
        Attendance History
      </span>

      <div className="border border-[#E5DEC9] bg-transparent overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 items-center px-3 py-4 border-b border-[#E5DEC9] text-[#231F20] text-[12px] font-semibold">
          <div>Date</div>
          <div className="text-center">Check-in</div>
          <div className="text-right">Status</div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-[#E5DEC9]/40 rounded" />
            <div className="h-10 bg-[#E5DEC9]/40 rounded" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8C827A]">
            No attendance records found yet.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {records.map((record) => {
              const badge = getStatusBadge(record.status);
              const { Icon } = badge;

              const isLate = record.status === "Late";
              const hasNoCheckIn =
                record.status === "Absent" || record.status === "On Leave";

              const timeColorClass = isLate
                ? "text-[#DE4949]"
                : hasNoCheckIn
                  ? "text-[#B8B1A8]"
                  : "text-[#7A8B99]";

              return (
                <div
                  key={record.id}
                  className="grid grid-cols-3 items-center px-3 py-4"
                >
                  {/* Date */}
                  <div className="font-semibold text-xs tracking-wide">
                    {formatDate(record.date)}
                  </div>

                  {/* Check-in */}
                  <div
                    className={`text-center text-xs font-normal ${timeColorClass}`}
                  >
                    {formatTime(record.checkIn)}
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-end">
                    <div
                      className={`${badge.bgClass} text-white text-[10px] font-medium px-2 py-1 flex items-center justify-center gap-1.5 min-w-18`}
                    >
                      <Icon className="w-3 h-3 shrink-0 stroke-3" />
                      <span className="whitespace-nowrap">{badge.label}</span>
                    </div>
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

export default AttendanceHistory;
