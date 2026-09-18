// lib/leaveCalc.ts
//
// Single source of truth for all leave-day calculations.
// Consumed by: DashboardHighlights, LeaveStats (and any future leave UI).
//
// Rules (locked):
//  - Only `status === "approved"` leaves count.
//  - Only leaves falling in the CURRENT CALENDAR YEAR count.
//  - Weekends (Sat/Sun) are skipped inside a leave span.
//  - Company holidays are skipped inside a leave span.
//  - Half Day = 0.5 days.
//  - Unpaid Leave = separate bucket, does NOT consume the annual quota.
//  - Paid days beyond the quota auto-convert to "quota exceeded" unpaid days.
//  - Dates are parsed as LOCAL midnight to avoid UTC off-by-one bugs.

export interface LeaveDoc {
  id?: string;
  userId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD" — defaults to startDate
  totalDays?: number;
  leaveType?: string; // "Casual Leave" | "Unpaid Leave" | "Half Day" | ...
  durationType?: string; // "half" | "single" | "multi"
  status?: string; // "approved" | "pending" | "rejected"
}

export interface LeaveCalcOptions {
  annualQuota?: number; // default 24
  now?: Date; // default new Date() — injectable for tests
  holidayDates?: Set<string>; // "YYYY-MM-DD" keys to skip
}

export interface LeaveSummary {
  // ----- Current month -----
  monthPaidDays: number; // paid leave days consumed this month
  monthUnpaidDays: number; // explicit unpaid days this month
  monthTotalDays: number; // = monthPaidDays + monthUnpaidDays
  monthFullLeaveDays: number; // NEW: full leaves only, no half-days
  monthHalfDayDates: string[]; // NEW: deduped dates of half-days this month

  // ----- Current year -----
  yearPaidDays: number; // paid leave days this year (quota-consuming)
  yearExplicitUnpaidDays: number; // days explicitly marked "Unpaid Leave"
  yearQuotaExceededDays: number; // paid days over quota (auto-unpaid)
  yearTotalUnpaidDays: number; // explicit + quotaExceeded
  yearFullLeaveDays: number; // NEW
  yearHalfDayCount: number; // NEW

  // ----- Derived -----
  yearRemaining: number; // max(0, quota - yearPaidDays)
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

/** Parse "YYYY-MM-DD" as LOCAL midnight (avoids UTC shift bugs). */
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

/**
 * Build a Set<string> of holiday date keys ("YYYY-MM-DD") from raw
 * `holidays` collection docs, for use in `computeLeaveSummary`.
 */
export function buildHolidayDateSet(
  holidayDocs: Array<{ date?: string }>,
): Set<string> {
  const s = new Set<string>();
  for (const h of holidayDocs) {
    if (h?.date) s.add(h.date);
  }
  return s;
}

/**
 * Format a day count for display:
 *   2   -> "02"
 *   1.5 -> "1.5"
 *   0   -> "00"
 */
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

  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = `${currentYearStr}-${pad2(now.getMonth() + 1)}`;

  let monthPaidDays = 0;
  let monthUnpaidDays = 0;
  let monthFullLeaveDays = 0; // NEW
  const monthHalfDayDatesSet = new Set<string>(); // NEW

  let yearPaidDays = 0;
  let yearExplicitUnpaidDays = 0;
  let yearFullLeaveDays = 0; // NEW
  let yearHalfDayCount = 0; // NEW

  for (const doc of leaves) {
    if (doc.status !== "approved") continue;
    if (!doc.startDate) continue;

    const start = parseLocalDate(doc.startDate);
    if (!start) continue;

    const end = doc.endDate ? (parseLocalDate(doc.endDate) ?? start) : start;
    if (end < start) continue;

    const unpaid = isExplicitUnpaid(doc);

    // ------- Half Day: single date, fixed 0.5 -------
    if (isHalfDay(doc)) {
      const y = start.getFullYear();
      const m = start.getMonth() + 1;
      const d = start.getDate();
      const dow = start.getDay();
      const key = toDateKey(y, m, d);

      // Skip if the half-day lands on a weekend or a company holiday
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

      // Skip weekends
      if (dow === 0 || dow === 6) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
      // Skip company holidays
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

  // Quota math — Model B
  const yearQuotaExceededDays = Math.max(0, yearPaidDays - annualQuota);
  const yearTotalUnpaidDays = yearExplicitUnpaidDays + yearQuotaExceededDays;
  const yearRemaining = Math.max(0, annualQuota - yearPaidDays);

  return {
    monthPaidDays,
    monthUnpaidDays,
    monthTotalDays: monthPaidDays + monthUnpaidDays,
    monthFullLeaveDays,
    monthHalfDayDates: Array.from(monthHalfDayDatesSet),
    yearPaidDays,
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
