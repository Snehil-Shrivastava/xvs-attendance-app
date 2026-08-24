"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Bell, Loader2, LogOut, ShieldCheck, UserCheck } from "lucide-react";

import Image from "next/image";
import bgImg from "@/public/bg-vector.svg";
import hamburger from "@/public/hamburger.svg";

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
    <div className="h-screen relative font-poppins">
      <div className="py-10">
        <div className="flex justify-between items-center px-5">
          <Image src={hamburger} alt="" />
          <span className="tracking-[16px] mr-[-16px] text-xs uppercase font-light">
            dashboard
          </span>
          <Bell className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
