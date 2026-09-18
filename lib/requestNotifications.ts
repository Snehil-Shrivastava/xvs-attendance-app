// lib/requestNotifications.ts
import type { RequestStatus } from "@/hooks/useRequestActions";

export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
}

export interface BuildNotificationInput {
  collectionName: "leaves" | "late_arrivals" | "attendance_corrections";
  type: string; // "Casual Leave" | "Late Request" | "Attendance Correction" | ...
  detail: string; // fully-formatted summary e.g. "11 Aug 2026 (10:00 AM)"
}

export function buildRequestNotification(
  payload: BuildNotificationInput,
  newStatus: RequestStatus,
): NotificationPayload {
  const actionText = newStatus === "approved" ? "Approved" : "Denied";
  const actionLower = newStatus === "approved" ? "approved" : "denied";

  if (payload.collectionName === "leaves") {
    return {
      title: `Leave Request ${actionText}`,
      body: `Your ${payload.type} for ${payload.detail} has been ${actionLower}.`,
      url: "/leaves",
    };
  }

  if (payload.collectionName === "late_arrivals") {
    return {
      title: `Late Arrival Request ${actionText}`,
      body: `Your late arrival request (${payload.detail}) has been ${actionLower}.`,
      url: "/attendance",
    };
  }

  // attendance_corrections
  return {
    title: `Attendance Correction ${actionText}`,
    body: `Your attendance correction request for ${payload.detail} has been ${actionLower}.`,
    url: "/attendance",
  };
}
