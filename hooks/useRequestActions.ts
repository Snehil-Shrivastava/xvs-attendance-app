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
  /**
   * Builds the push notification for a given request + final status.
   * Only called for "approved" / "denied" — never "pending".
   */
  buildNotification: (item: T, status: RequestStatus) => NotificationPayload;
}

export function useRequestActions<T extends ReviewableRequest>({
  buildNotification,
}: UseRequestActionsOptions<T>) {
  const { user } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const changeStatus = async (item: T, newStatus: string): Promise<void> => {
    if (newStatus === "pending") return;

    try {
      setUpdatingId(item.id);
      const docRef = doc(db, item.collectionName, item.id);
      await updateDoc(docRef, {
        status: newStatus,
        reviewedBy: user?.uid,
        reviewedAt: new Date().toISOString(),
      });

      if (newStatus === "approved" || newStatus === "denied") {
        const notification = buildNotification(item, newStatus);
        await sendPushNotificationToUser({
          targetUserId: item.userId,
          ...notification,
        });
      }
    } catch (error) {
      console.error("Error updating request status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return { updatingId, changeStatus };
}
