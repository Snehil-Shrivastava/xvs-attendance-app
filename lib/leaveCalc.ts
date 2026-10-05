// lib/leaveCalc.ts
//
// Single source of truth for all leave-day calculations.
// Consumed by: DashboardHighlights, LeaveStats, TeamMemberList (and any
// future leave UI).
//
// Rules (locked):
//  - Only `status === "approved"` leaves count.
//  - Only leaves falling in the CURRENT CALENDAR YEAR count.
//  - Weekends (Sat/Sun) are skipped inside a leave span.
//  - Company holidays are skipped inside a leave span.
//  - Half Day = 0.5 days.
//  - Unpaid Leave = separate bucket, does NOT consume the annual quota.
//  - Paid days beyond the (opening-adjusted) quota auto-convert to unpaid.
//  - `openingUsedDays` (per-year map) subtracts pre-app usage from the
//    effective quota WITHOUT lowering the user's `annualQuota`.
//  - Dates are parsed as LOCAL midnight to avoid UTC off-by-one bugs.

export interface LeaveDoc {
  id?: string;
  userId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string; // defaults to startDate
  totalDays?: number;
  leaveType?: string;
  durationType?: string;
  status?: string;
}

export interface LeaveCalcOptions {
  annualQuota?: number; // default 24
  /** Pre-app used days keyed by "YYYY" — e.g. { "2026": 5 } */
  openingUsedDays?: Record<string, number>;
  now?: Date;
  holidayDates?: Set<string>;
}

export interface LeaveSummary {
  // ----- Current month -----
  monthPaidDays: number;
  monthUnpaidDays: number;
  monthTotalDays: number;
  monthFullLeaveDays: number;
  monthHalfDayDates: string[];

  // ----- Current year -----
  yearPaidDays: number;
  yearOpeningUsedDays: number; // NEW: pre-app used days for this year
  yearEffectiveQuota: number; // NEW: annualQuota − yearOpeningUsedDays
  yearExplicitUnpaidDays: number;
  yearQuotaExceededDays: number; // computed against effective quota
  yearTotalUnpaidDays: number;
  yearFullLeaveDays: number;
  yearHalfDayCount: number;

  // ----- Derived -----
  yearRemaining: number; // max(0, effectiveQuota − yearPaidDays)
  annualQuota: number;
}

const DEFAULT_QUOTA = 24;

// ---------- internal helpers ----------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Parse "YYYY-MM-DD" as LOCAL midnight. */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function isHalfDay(doc: LeaveDoc): boolean {
  return (
    doc.leaveType === "Half Day" ||
    doc.durationType === "half" ||
    Number(doc.totalDays) === 0.5
  );
}

function isExplicitUnpaid(doc: LeaveDoc): boolean {
  return doc.leaveType === "Unpaid Leave";
}

// ---------- public API ----------

export function buildHolidayDateSet(
  holidayDocs: Array<{ date?: string }>,
): Set<string> {
  const s = new Set<string>();
  for (const h of holidayDocs) {
    if (h?.date) s.add(h.date);
  }
  return s;
}

export function formatLeaveDays(days: number): string {
  if (Number.isInteger(days)) return String(days).padStart(2, "0");
  return String(days);
}

export function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function computeLeaveSummary(
  leaves: LeaveDoc[],
  opts: LeaveCalcOptions = {},
): LeaveSummary {
  const annualQuota = opts.annualQuota ?? DEFAULT_QUOTA;
  const now = opts.now ?? new Date();
  const holidayDates = opts.holidayDates ?? new Set<string>();
  const openingUsedByYear = opts.openingUsedDays ?? {};

  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = `${currentYearStr}-${pad2(now.getMonth() + 1)}`;

  // Opening balance adjustment for the current year
  const openingUsedThisYear = Number(openingUsedByYear[currentYearStr] ?? 0);
  const effectiveQuota = Math.max(0, annualQuota - openingUsedThisYear);

  let monthPaidDays = 0;
  let monthUnpaidDays = 0;
  let monthFullLeaveDays = 0;
  const monthHalfDayDatesSet = new Set<string>();

  let yearPaidDays = 0;
  let yearExplicitUnpaidDays = 0;
  let yearFullLeaveDays = 0;
  let yearHalfDayCount = 0;

  for (const doc of leaves) {
    if (doc.status !== "approved") continue;
    if (!doc.startDate) continue;

    const start = parseLocalDate(doc.startDate);
    if (!start) continue;

    const end = doc.endDate ? (parseLocalDate(doc.endDate) ?? start) : start;
    if (end < start) continue;

    const unpaid = isExplicitUnpaid(doc);

    // ------- Half Day -------
    if (isHalfDay(doc)) {
      const y = start.getFullYear();
      const m = start.getMonth() + 1;
      const d = start.getDate();
      const dow = start.getDay();
      const key = toDateKey(y, m, d);

      if (dow === 0 || dow === 6) continue;
      if (holidayDates.has(key)) continue;

      const value = 0.5;

      if (key.startsWith(currentYearStr)) {
        if (unpaid) yearExplicitUnpaidDays += value;
        else yearPaidDays += value;
        yearHalfDayCount += 1;
      }
      if (key.startsWith(currentMonthStr)) {
        if (unpaid) monthUnpaidDays += value;
        else monthPaidDays += value;
        monthHalfDayDatesSet.add(key);
      }
      continue;
    }

    // ------- Single-day OR multi-day span -------
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const d = cursor.getDate();
      const dow = cursor.getDay();
      const key = toDateKey(y, m, d);

      if (dow === 0 || dow === 6) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
      if (holidayDates.has(key)) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      if (key.startsWith(currentYearStr)) {
        if (unpaid) yearExplicitUnpaidDays += 1;
        else yearPaidDays += 1;
        yearFullLeaveDays += 1;
      }
      if (key.startsWith(currentMonthStr)) {
        if (unpaid) monthUnpaidDays += 1;
        else monthPaidDays += 1;
        monthFullLeaveDays += 1;
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Quota math uses the OPENING-ADJUSTED effective quota
  const yearQuotaExceededDays = Math.max(0, yearPaidDays - effectiveQuota);
  const yearTotalUnpaidDays = yearExplicitUnpaidDays + yearQuotaExceededDays;
  const yearRemaining = Math.max(0, effectiveQuota - yearPaidDays);

  return {
    monthPaidDays,
    monthUnpaidDays,
    monthTotalDays: monthPaidDays + monthUnpaidDays,
    monthFullLeaveDays,
    monthHalfDayDates: Array.from(monthHalfDayDatesSet),

    yearPaidDays,
    yearOpeningUsedDays: openingUsedThisYear,
    yearEffectiveQuota: effectiveQuota,
    yearExplicitUnpaidDays,
    yearQuotaExceededDays,
    yearTotalUnpaidDays,
    yearFullLeaveDays,
    yearHalfDayCount,

    yearRemaining,
    annualQuota,
  };
}

export function buildLeaveDocId(
  startDate: string,
  endDate: string | undefined,
  userId: string,
): string {
  if (!endDate || endDate === startDate) {
    return `${startDate}_${userId}`;
  }
  return `${startDate}_${endDate}_${userId}`;
}
