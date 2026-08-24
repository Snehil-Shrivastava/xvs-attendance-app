"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Bell, Loader2, LogOut, ShieldCheck, UserCheck } from "lucide-react";

import Image from "next/image";
import bgImg from "@/public/bg-vector-2.svg";
import hamburger from "@/public/hamburger.svg";
import DashboardUserInfo from "@/components/DashboardUserInfo";
import DashboardHighlights from "@/components/DashboardHighlights";
import DashboardRequests from "@/components/DashboardRequests";

export default function DashboardPage() {
  const { user, userData, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Loading state while checking Firebase authentication
  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1817]">
        <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
      </div>
    );
  }
  return (
    <div className="min-h-screen font-poppins bg-brand-cream">
      <div className="bg-background px-5 py-10 relative overflow-hidden dashboard-clip flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <Image
            src={bgImg}
            alt=""
            className="absolute inset-0 select-none pointer-events-none -z-1"
          />
          <Image src={hamburger} alt="" />
          <span className="tracking-[16px] -mr-4 text-xs uppercase">
            dashboard
          </span>
          <Bell className="w-5 h-5" />
        </div>
        <DashboardUserInfo />
      </div>
      <div className="py-10 px-5">
        <DashboardHighlights />
        <DashboardRequests />
        <button className="capitalize text-white text-base bg-brand-orange py-3 w-full mt-4">
          view attendance
        </button>
      </div>
    </div>
  );
}
