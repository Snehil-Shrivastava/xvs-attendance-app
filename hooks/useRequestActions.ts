// hooks/useRequestActions.ts
"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { sendPushNotificationToUser } from "@/app/actions/notifications";
import type { NotificationPayload } from "@/lib/requestNotifications";

export type RequestCollectionName =
  | "leaves"
  | "late_arrivals"
  | "attendance_corrections";

export type RequestStatus = "approved" | "denied";

export interface ReviewableRequest {
  id: string;
  collectionName: RequestCollectionName;
  userId: string;
}

interface UseRequestActionsOptions<T extends ReviewableRequest> {
  buildNotification: (item: T, status: RequestStatus) => NotificationPayload;
  /**
   * Optional side effect fired after the request doc has been updated to
   * "approved". Use this for cross-collection consistency (e.g. recomputing
   * daily_attendance when a late arrival is approved).
   * Errors are logged but do not block the notification.
   */
  onApproved?: (item: T) => Promise<void> | void;
}

export function useRequestActions<T extends ReviewableRequest>({
  buildNotification,
  onApproved,
}: UseRequestActionsOptions<T>) {
  const { user, userData } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const changeStatus = async (item: T, newStatus: string): Promise<void> => {
    if (newStatus === "pending") return;

    try {
      setUpdatingId(item.id);
      const docRef = doc(db, item.collectionName, item.id);
      await updateDoc(docRef, {
        status: newStatus,
        reviewedBy: user?.uid,
        reviewedByName: userData?.name || "Admin",
        reviewedAt: new Date().toISOString(),
      });

      // Side effect on approval (e.g. recompute daily_attendance for late_arrivals)
      if (newStatus === "approved" && onApproved) {
        try {
          await onApproved(item);
        } catch (err) {
          console.error("onApproved side-effect failed:", err);
        }
      }

      // Push notification
      if (newStatus === "approved" || newStatus === "denied") {
        try {
          const notification = buildNotification(item, newStatus);
          await sendPushNotificationToUser({
            targetUserId: item.userId,
            ...notification,
          });
        } catch (err) {
          console.error("Notification failed:", err);
        }
      }
    } catch (error) {
      console.error("Error updating request status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return { updatingId, changeStatus };
}
