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
