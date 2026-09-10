"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

import DashboardHighlights from "@/components/DashboardHighlights";
import DashboardRequests from "@/components/DashboardRequests";
import PendingRequests from "@/components/PendingRequests";
import Link from "next/link";
import BirthdayBanner from "@/components/BirthdayBanner";
import { requestNotificationPermissionAndSaveToken } from "@/lib/fcm";
import EnableNotificationsButton from "@/components/EnableNotificationsButton";

export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1817]">
        <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
      </div>
    );
  }

  const isAdmin = userData?.role === "admin";

  return (
    <div className="py-10 px-5 flex flex-col gap-6">
      {/* <BirthdayBanner /> */}
      {/* <button
        type="button"
        onClick={async () => {
          const res = await requestNotificationPermissionAndSaveToken(user.uid);
          alert(
            res?.success ? "Notifications Enabled!" : `Failed: ${res?.error}`,
          );
        }}
        className="text-xs bg-brand-orange text-white px-2 py-2"
      >
        Enable Notifications
      </button> */}
      <EnableNotificationsButton />

      {isAdmin && <PendingRequests />}

      <DashboardHighlights />

      <DashboardRequests />

      <Link
        href={"/attendance"}
        className="capitalize text-white text-base bg-brand-orange py-3 w-full mt-2 text-center rounded-xs shadow-xs tracking-wider transition hover:bg-brand-orange/90 active:scale-[0.99]"
      >
        view attendance
      </Link>
    </div>
  );
}
