"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCheck, ChevronRight, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  url?: string;
  read: boolean;
  createdAt: string;
}

// Helper: Format ISO string to relative / friendly time
const formatNotificationTime = (isoString?: string) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSecs < 60) return "Just now";
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 172800) return "Yesterday";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
};

const NotificationMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen to real-time notifications for the current logged-in user
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, user.email || ""]),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<AppNotification, "id">),
          });
        });

        // Sort latest first client-side
        fetched.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );

        setNotifications(fetched);
      },
      (err) => {
        console.error("Notifications listener error:", err);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Count of unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark a single notification as read and navigate
  const handleItemClick = async (notif: AppNotification) => {
    try {
      if (!notif.read) {
        await updateDoc(doc(db, "notifications", notif.id), {
          read: true,
        });
      }
    } catch (e) {
      console.error("Failed to mark notification read:", e);
    }

    setIsOpen(false);
    if (notif.url) {
      router.push(notif.url);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((n) => {
          batch.update(doc(db, "notifications", n.id), { read: true });
        });
      await batch.commit();
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const overlay = (
    <div
      className={`fixed inset-0 z-50 h-screen w-full max-w-106.25 mx-auto bg-brand-black transition-all duration-300 ease-in-out select-none ${
        isOpen ? "translate-x-0" : "translate-x-full invisible"
      }`}
      style={{
        backgroundImage: "url(/hamburger-menu-bg.svg)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "bottom right",
        backgroundSize: "contain",
      }}
    >
      <div className="flex flex-col h-full px-5 py-10">
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <h2 className="text-white text-base font-semibold tracking-wider uppercase">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-brand-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close notifications"
            className="text-white hover:opacity-80 transition cursor-pointer p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mark all as read bar */}
        {unreadCount > 0 && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-[11px] text-brand-orange hover:text-brand-orange/80 transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          </div>
        )}

        <hr className="border-neutral-700/50 mb-4" />

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-400 gap-3">
              <Inbox className="w-10 h-10 stroke-1 opacity-50" />
              <span className="text-xs tracking-wider">
                No notifications yet
              </span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 rounded-xs transition-colors cursor-pointer border flex items-start gap-3 relative ${
                  item.read
                    ? "bg-neutral-900/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800/50"
                    : "bg-[#2A2624] border-neutral-700 text-white hover:bg-[#342F2C]"
                }`}
              >
                {/* Unread Indicator Dot */}
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0 mt-1.5" />
                )}

                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold tracking-wide text-brand-cream truncate">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-neutral-400 shrink-0 font-light">
                      {formatNotificationTime(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 font-light leading-relaxed line-clamp-2">
                    {item.body}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0 self-center" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open notifications"
        className="relative z-10 cursor-pointer select-none text-white hover:opacity-80 transition p-1"
      >
        <Bell className="w-5 h-5" />

        {/* Orange Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand-orange rounded-full ring-2 ring-brand-black animate-pulse" />
        )}
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  );
};

export default NotificationMenu;
