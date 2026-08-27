"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Power } from "lucide-react";
import hamburger from "@/public/hamburger.svg";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardUserInfo from "./DashboardUserInfo";

import homeSVG from "@/public/homeSVG.svg";
import attendanceSVG from "@/public/attendance.svg";
import leavesSVG from "@/public/apply-for-leave.svg";
import laterArrivalSVG from "@/public/late-arrival.svg";
import requestsSVG from "@/public/requests.svg";
import profileSVG from "@/public/profile.svg";

// Nav items (excluding Logout)
const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: homeSVG },
  { label: "Attendance", href: "/attendance", icon: attendanceSVG },
  { label: "Leaves", href: "#", icon: leavesSVG },
  { label: "Late Arrivals", href: "#", icon: laterArrivalSVG },
  { label: "Requests", href: "#", icon: requestsSVG },
  { label: "Profile", href: "#", icon: profileSVG },
];

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  // Handle SSR portal mounting
  useEffect(() => {
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

  // Logout Handler
  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const overlay = (
    <div
      className={`fixed inset-0 z-50 h-screen w-screen bg-brand-black transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full px-5 py-10">
        {/* Close Button */}
        <div className="flex justify-end items-center">
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="cursor-pointer"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* User Info Header */}
        <div className="mt-4">
          <DashboardUserInfo />
        </div>

        <hr className="my-8 border-neutral-600/50 border" />

        {/* Navigation Links */}
        <nav className="flex flex-col gap-7">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="text-brand-cream text-lg capitalize tracking-wider flex items-center gap-5 hover:opacity-80 transition-opacity"
            >
              <Image src={item.icon} alt="" className="w-6 h-6" />
              <span>{item.label}</span>
            </Link>
          ))}

          {/* =========================================
              LOGOUT BUTTON
          ========================================= */}
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-400 text-lg capitalize tracking-wider flex items-center gap-5 hover:opacity-80 transition-opacity cursor-pointer text-left w-full"
          >
            {/* <LogOut className="w-6 h-6 text-red-400 shrink-0" /> */}
            <Power className="w-6 h-6 text-red-400 shrink-0" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="relative z-10 cursor-pointer"
      >
        <Image src={hamburger} alt="Open Menu" priority />
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  );
};

export default HamburgerMenu;
