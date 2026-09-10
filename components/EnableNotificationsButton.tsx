"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestNotificationPermissionAndSaveToken } from "@/lib/fcm";

interface EnableNotificationsButtonProps {
  className?: string;
}

const EnableNotificationsButton = ({
  className,
}: EnableNotificationsButtonProps) => {
  const { user } = useAuth();
  const [isGranted, setIsGranted] = useState(true); // Start true to prevent flicker on SSR
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check browser notification permission status on client mount
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsGranted(Notification.permission === "granted");
    }
  }, []);

  // If already granted, don't render anything
  if (isGranted || !user) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await requestNotificationPermissionAndSaveToken(user.uid);

      // If user approved or token was saved, hide button immediately
      if (
        res?.success ||
        (typeof window !== "undefined" && Notification.permission === "granted")
      ) {
        setIsGranted(true);
      }
    } catch (err) {
      console.error("Failed to enable notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={loading}
      className={
        className ||
        "bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-medium px-3.5 py-2 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      }
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Enabling...</span>
        </>
      ) : (
        <>
          <Bell className="w-3.5 h-3.5" />
          <span>Enable Notifications</span>
        </>
      )}
    </button>
  );
};

export default EnableNotificationsButton;
