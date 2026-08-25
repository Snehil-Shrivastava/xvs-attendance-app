"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import hamburger from "@/public/hamburger.svg";
import Link from "next/link";

const MENU_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Attendance", href: "/attendance" },
  { label: "Requests", href: "/requests" },
  { label: "Profile", href: "/profile" },
  { label: "Logout", href: "/logout" },
];

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portals need a client-side mount check (no document during SSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    // @ts-expect-error unknown
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const overlay = (
    <div
      className={`fixed inset-0 z-[100] h-screen w-screen bg-brand-black transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full px-5 py-10">
        <div className="flex justify-between items-center">
          <span className="tracking-[16px] -mr-4 text-xs uppercase text-white">
            menu
          </span>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="cursor-pointer"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <nav className="flex flex-col gap-6 mt-16">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="text-white text-2xl font-calSans uppercase tracking-wider"
            >
              {item.label}
            </Link>
          ))}
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
        <Image src={hamburger} alt="" />
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  );
};

export default HamburgerMenu;
