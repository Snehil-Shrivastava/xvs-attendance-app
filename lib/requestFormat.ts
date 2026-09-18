// lib/requestFormat.ts
//
// Shared formatting helpers for request/approval UI.
// Extracted from PendingRequests.tsx and MemberPendingRequests.tsx.
//
// NOTE: `formatTimeStr` output was previously inconsistent between the two
// components ("10:00 AM" vs "10:00am"). Unified to "10:00 AM" (uppercase + space).

export function getFirstName(fullName: string): string {
  if (!fullName) return "Employee";
  return fullName.trim().split(" ")[0] || "Employee";
}

export function formatTimeStr(t?: string | null): string {
  if (!t) return "";
  if (t.includes("AM") || t.includes("PM")) return t;
  try {
    const [h, m] = t.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${m} ${ampm}`;
  } catch {
    return t;
  }
}

export function formatDate(dateStr?: string): string {
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
}

export interface AppliedTimestamp {
  date: string; // "dd/mm/yy"
  time: string; // "hh:mmam/pm"
  combined: string; // "dd/mm/yy | hh:mmam/pm"
}

/**
 * Formats a Firestore Timestamp (or ISO string / Date) into display strings.
 * Returns `.date` + `.time` separately, plus a `.combined` convenience string.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatAppliedTime(createdAt?: any): AppliedTimestamp {
  try {
    let date: Date;
    if (createdAt?.toDate) {
      date = createdAt.toDate();
    } else if (createdAt) {
      date = new Date(createdAt);
    } else {
      date = new Date();
    }

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);

    let hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    const hh = String(hours).padStart(2, "0");

    const dateStr = `${dd}/${mm}/${yy}`;
    const timeStr = `${hh}:${mins}${ampm}`;

    return {
      date: dateStr,
      time: timeStr,
      combined: `${dateStr} | ${timeStr}`,
    };
  } catch {
    return {
      date: "--/--/--",
      time: "--:--",
      combined: "--/--/-- | --:--",
    };
  }
}
