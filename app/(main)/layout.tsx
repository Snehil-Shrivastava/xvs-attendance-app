"use client";

import { Bell } from "lucide-react";

import Image from "next/image";
import bgImg from "@/public/bg-vector-2.svg";
import HamburgerMenu from "@/components/HamburgerMenu";
import DashboardUserInfo from "@/components/DashboardUserInfo";
import { usePathname } from "next/navigation";

const ROUTE_TITLES: Record<string, string> = {
  "/": "dashboard",
  "/attendance": "attendance",
  "/leaves": "leaves",
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const pageTitle =
    ROUTE_TITLES[pathname] ||
    pathname.replace(/^\//, "").split("/")[0].replace(/-/g, " ") ||
    "dashboard";

  return (
    <div className="min-h-screen font-poppins bg-brand-cream">
      <div className="bg-brand-black px-5 py-10 overflow-hidden dashboard-clip flex flex-col gap-8 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <Image
            src={bgImg}
            alt=""
            className="absolute inset-0 select-none pointer-events-none -z-1"
          />
          <HamburgerMenu />
          <span className="tracking-[16px] -mr-4 text-xs uppercase">
            {pageTitle}
          </span>
          <Bell className="w-5 h-5" />
        </div>
        <DashboardUserInfo datetime={true} nameTruncate={true} />
      </div>
      {children}
    </div>
  );
};

export default MainLayout;
