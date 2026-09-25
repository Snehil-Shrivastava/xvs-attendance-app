"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface DailyRecord {
  id: string;
  userId: string;
  name: string;
  date: string;
  status?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  leaveType?: string;
  remark?: string;
  // NEW
  delaySeconds?: number;
  graceDeductedSeconds?: number;
  // Legacy (read-only fallback for pre-migration docs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graceDeducted?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  minutesDelayed?: any;
}

type CategoryKey = "present" | "late" | "lateAllowed" | "leave" | "halfDay";

const CATEGORIES: Array<{ key: CategoryKey; label: string; color: string }> = [
  { key: "present", label: "Present", color: "bg-brand-orange" },
  { key: "late", label: "Late", color: "bg-brand-red" },
  { key: "lateAllowed", label: "Late/Allowed", color: "bg-[#91C95A]" },
  { key: "leave", label: "Leave", color: "bg-[#4E7B80]" },
  { key: "halfDay", label: "Half Day", color: "bg-[#74C0B5]" },
];

const SHOW_HOUR = 11;

function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWeekday(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function formatTime(t?: string | null): string {
  if (!t) return "--:--";
  return t.slice(0, 5);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

interface AdminDailySummaryProps {
  onClose: () => void; // ← required now (parent controls visibility)
  onViewAttendance?: (userId: string) => void;
}

const AdminDailySummary = ({
  onClose,
  onViewAttendance,
}: AdminDailySummaryProps) => {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const isAdmin = userData?.role === "admin";
  const uid = user?.uid;

  const [today, setToday] = useState("");
  const [pastShowHour, setPastShowHour] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayCheckDone, setHolidayCheckDone] = useState(false);

  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<CategoryKey | null>(null);

  // ---------- 1. Today + midnight rollover ----------
  useEffect(() => {
    setToday(getLocalDateString());
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const ms = nextMidnight.getTime() - now.getTime();
    const t = setTimeout(() => setToday(getLocalDateString()), ms);
    return () => clearTimeout(t);
  }, [today]);

  // ---------- 2. 11 AM gate ----------
  useEffect(() => {
    const check = () => setPastShowHour(new Date().getHours() >= SHOW_HOUR);
    check();
    const now = new Date();
    if (now.getHours() < SHOW_HOUR) {
      const target = new Date(now);
      target.setHours(SHOW_HOUR, 0, 0, 0);
      const ms = target.getTime() - now.getTime();
      const t = setTimeout(check, ms);
      return () => clearTimeout(t);
    }
  }, [today]);

  // ---------- 3. Holiday check ----------
  useEffect(() => {
    if (!isAdmin || !today) {
      setHolidayCheckDone(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "holidays"), where("date", "==", today)),
        );
        if (!cancelled) setIsHoliday(!snap.empty);
      } catch (err) {
        console.error("Holiday lookup failed:", err);
        if (!cancelled) setIsHoliday(false);
      } finally {
        if (!cancelled) setHolidayCheckDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, today]);

  // ---------- 4. Dismissal state from Firestore ----------
  const dismissedOn = userData?.uiPrefs?.dailySummaryDismissedOn ?? "";
  const isDismissedToday = dismissedOn === today;

  // ---------- 5. Visibility ----------
  const isWorkdayToday = useMemo(
    () => (today ? isWeekday(new Date(`${today}T12:00:00`)) : false),
    [today],
  );

  // IMPORTANT: if auth is still loading, do NOT render. This prevents a
  // brief flash of the summary on mount before userData has streamed in.
  const shouldShow =
    !authLoading &&
    isAdmin &&
    !!today &&
    !!uid &&
    holidayCheckDone &&
    !isDismissedToday &&
    pastShowHour &&
    isWorkdayToday &&
    !isHoliday;

  // ---------- 6. Fetch today's records ----------
  useEffect(() => {
    if (!shouldShow || !today) return;
    setLoading(true);
    const q = query(
      collection(db, "daily_attendance"),
      where("date", "==", today),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: DailyRecord[] = [];
        snap.forEach((d) => {
          arr.push({
            id: d.id,
            ...(d.data() as Omit<DailyRecord, "id">),
          });
        });
        setRecords(arr);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching daily summary:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [shouldShow, today]);

  // ---------- 7. Categorize ----------
  const categorized = useMemo(() => {
    const cats: Record<CategoryKey, DailyRecord[]> = {
      present: [],
      late: [],
      lateAllowed: [],
      leave: [],
      halfDay: [],
    };

    for (const rec of records) {
      const status = String(rec.status || "");
      // Prefer new field; fall back to legacy so pre-migration docs still classify
      const grace = Number(rec.graceDeductedSeconds ?? rec.graceDeducted ?? 0);

      if (status === "Late") {
        cats.late.push(rec);
      } else if (status === "Late/Allowed" || status === "Grace Used") {
        // New canonical value + legacy alias
        cats.lateAllowed.push(rec);
      } else if (status === "On Time") {
        // Legacy docs only: pre-migration "On Time" could carry grace
        if (grace > 0) cats.lateAllowed.push(rec);
        else cats.present.push(rec);
      } else if (status === "On Leave") {
        cats.leave.push(rec);
      } else if (status === "Half Day") {
        cats.halfDay.push(rec);
      }
    }

    for (const key of Object.keys(cats) as CategoryKey[]) {
      cats[key].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return cats;
  }, [records]);

  // ---------- 8. Handlers ----------
  const handleClose = async () => {
    // 1. Tell parent to unmount us immediately (no wait for Firestore).
    onClose();

    // 2. Persist to Firestore so a fresh mount stays hidden for the day.
    if (uid && today) {
      try {
        await updateDoc(doc(db, "users", uid), {
          "uiPrefs.dailySummaryDismissedOn": today,
        });
      } catch (err) {
        console.error("Failed to persist dismissal:", err);
        // Best-effort — the parent has already hidden us for this session.
      }
    }
  };

  const toggle = (key: CategoryKey) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const handleViewAttendance = (userId: string) => {
    if (onViewAttendance) onViewAttendance(userId);
    else router.push(`/team?expand=${userId}`);
  };

  // ---------- 9. Render ----------
  if (!shouldShow) return null;

  const expandedRecords = expanded ? categorized[expanded] : [];
  const expandedLabel = expanded
    ? (CATEGORIES.find((c) => c.key === expanded)?.label ?? "")
    : "";

  return (
    <div className="w-full font-poppins text-black mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] opacity-50 font-normal">
          Daily Summary
        </span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close daily summary"
          className="text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="border border-[#E5DEC9] px-1 py-1">
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => {
            const isExpanded = expanded === cat.key;
            const isDimmed = expanded !== null && !isExpanded;
            const count = categorized[cat.key].length;

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggle(cat.key)}
                title={isDimmed ? cat.label : undefined}
                className={`${cat.color} aspect-square flex flex-col items-center justify-center text-white transition-all cursor-pointer`}
              >
                {!isDimmed && (
                  <>
                    <span className="text-[8px] font-normal tracking-wide mb-1">
                      {cat.label}
                    </span>
                    <span className="font-calSans text-3xl md:text-4xl leading-none tracking-wider">
                      {loading ? "--" : pad2(count)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {expanded && (
          <div className="mt-3 bg-background">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                <div className="h-10 bg-[#E5DEC9]/40 rounded" />
                <div className="h-10 bg-[#E5DEC9]/40 rounded" />
              </div>
            ) : expandedRecords.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8C827A]">
                No {expandedLabel.toLowerCase()} records today.
              </div>
            ) : (
              <div className="divide-y divide-[#E5DEC9]">
                {expandedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between py-3 px-4 gap-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-[#231F20] truncate">
                        {rec.name || "Employee"}
                      </span>
                      <span className="text-xs text-[#8C827A]">
                        ID: {rec.userId}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#231F20]">
                          Check in
                        </span>
                        <span className="text-[8px] font-medium text-[#8C827A]">
                          {formatTime(rec.checkIn)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewAttendance(rec.userId)}
                        className="bg-brand-orange text-white text-[10px] font-medium px-2.5 py-1 transition hover:bg-brand-orange/90 cursor-pointer"
                      >
                        View Attendance
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDailySummary;
