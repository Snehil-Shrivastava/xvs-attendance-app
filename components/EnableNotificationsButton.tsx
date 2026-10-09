// "use client";

// import { useEffect, useState } from "react";
// import { Bell, Loader2 } from "lucide-react";
// import { useAuth } from "@/context/AuthContext";
// import { requestNotificationPermissionAndSaveToken } from "@/lib/fcm";

// interface EnableNotificationsButtonProps {
//   className?: string;
// }

// const EnableNotificationsButton = ({
//   className,
// }: EnableNotificationsButtonProps) => {
//   const { user } = useAuth();
//   const [isGranted, setIsGranted] = useState(true); // Start true to prevent flicker on SSR
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     // Check browser notification permission status on client mount
//     if (typeof window !== "undefined" && "Notification" in window) {
//       setIsGranted(Notification.permission === "granted");
//     }
//   }, []);

//   // If already granted, don't render anything
//   if (isGranted || !user) {
//     return null;
//   }

//   const handleEnable = async () => {
//     setLoading(true);
//     try {
//       const res = await requestNotificationPermissionAndSaveToken(user.uid);

//       // If user approved or token was saved, hide button immediately
//       if (
//         res?.success ||
//         (typeof window !== "undefined" && Notification.permission === "granted")
//       ) {
//         setIsGranted(true);
//       }
//     } catch (err) {
//       console.error("Failed to enable notifications:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <button
//       type="button"
//       onClick={handleEnable}
//       disabled={loading}
//       className={
//         className ||
//         "bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-medium px-3.5 py-2 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
//       }
//     >
//       {loading ? (
//         <>
//           <Loader2 className="w-3.5 h-3.5 animate-spin" />
//           <span>Enabling...</span>
//         </>
//       ) : (
//         <>
//           <Bell className="w-3.5 h-3.5" />
//           <span>Enable Notifications</span>
//         </>
//       )}
//     </button>
//   );
// };

// export default EnableNotificationsButton;

// ------------------------ better enable notification button

"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestNotificationPermissionAndSaveToken } from "@/lib/fcm";

interface EnableNotificationsButtonProps {
  className?: string;
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

const EnableNotificationsButton = ({
  className,
}: EnableNotificationsButtonProps) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermissionState>("granted");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Read initial state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  // Nothing to show if unsupported, or if user already has both permission + saved token
  if (!user) return null;
  if (permission === "unsupported") return null;
  if (permission === "granted" && saved) return null;

  const handleEnable = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await requestNotificationPermissionAndSaveToken(user.uid);

      // Re-read the permission after the call — may have changed
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission as PermissionState);
      }

      if (res?.success) {
        setSaved(true);
      } else {
        setErrorMsg(
          res?.error ||
            "Couldn't enable notifications. Please try again in a moment.",
        );
      }
    } catch (err) {
      console.error("Failed to enable notifications:", err);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Case: permission denied ---
  if (permission === "denied") {
    return (
      <div
        className={
          className ||
          "border border-amber-500/30 bg-amber-500/10 text-amber-800 text-xs px-3.5 py-2.5 flex items-start gap-2"
        }
      >
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">Notifications are blocked</span>
          <span className="opacity-80">
            To receive alerts, unblock notifications for this site in your
            browser settings, then refresh.
          </span>
        </div>
      </div>
    );
  }

  // --- Case: permission already granted but token save previously failed ---
  const isGrantedButNoToken = permission === "granted" && !saved;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className={
          className ||
          "bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-medium px-3.5 py-2 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 self-start w-full"
        }
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Enabling...</span>
          </>
        ) : isGrantedButNoToken ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Retry Saving Token</span>
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" />
            <span>Enable Notifications</span>
          </>
        )}
      </button>

      {errorMsg && (
        <span className="text-[10px] text-red-600 font-light">{errorMsg}</span>
      )}
    </div>
  );
};

export default EnableNotificationsButton;
