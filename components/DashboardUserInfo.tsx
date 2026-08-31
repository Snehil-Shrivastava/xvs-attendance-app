"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import placeholder from "@/public/placeholder.webp";
import { useAuth } from "@/context/AuthContext";
import { uploadProfilePhoto } from "@/lib/uploadPhoto";
import { RefreshCw } from "lucide-react";

const truncateName = (name: string, limit = 11) => {
  if (!name) return "Employee Name";
  return name.length > limit ? `${name.slice(0, limit)}...` : name;
};

const DashboardUserInfo = ({
  datetime,
  nameTruncate = false,
}: {
  datetime?: boolean;
  nameTruncate?: boolean;
}) => {
  const { user, userData, loading } = useAuth();
  const pathname = usePathname();
  const isProfilePage = pathname === "/my-profile";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" }); // e.g. "Monday"
  const day = today.getDate().toString().padStart(2, "0"); // "24"
  const month = today.toLocaleDateString("en-US", { month: "short" }); // "Aug"
  const formattedDate = `${day} ${month}`; // "24 Aug"
  const year = today.getFullYear(); // 2026

  const handleImageClick = () => {
    // Only allow clicking when on the /my-profile page
    if (!isProfilePage || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      await uploadProfilePhoto(user.uid, file);
    } catch (error) {
      console.error("Failed to upload photo:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Skeleton loading state while data is fetching
  if (loading) {
    return (
      <div className="flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-stone-800 rounded-full" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-36 bg-stone-800 rounded" />
            <div className="h-3 w-24 bg-stone-800 rounded" />
            <div className="h-3 w-16 bg-stone-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // @ts-expect-error unknown
  const avatarSrc = userData?.photoUrl || placeholder;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center justify-between gap-4">
        {/* Image Container (Only clickable on /my-profile) */}
        <div
          onClick={handleImageClick}
          className={`${isProfilePage ? "cursor-pointer" : ""} ${
            uploading ? "opacity-50" : ""
          } relative`}
        >
          {isProfilePage && (
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          )}
          <Image
            src={avatarSrc}
            alt={userData?.name || "Employee Avatar"}
            width={80}
            height={80}
            className="w-20 h-20 object-cover"
          />
          {isProfilePage && (
            <div className="absolute rounded-full border-4 border-brand-black bg-brand-orange -top-2 -right-2 p-0.5">
              <RefreshCw size={12} />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {/* Employee Name */}
          <h2
            className="text-xl font-calSans tracking-wider"
            title={userData?.name || "Employee Name"}
          >
            {/* @ts-expect-error unknown */}
            {nameTruncate ? truncateName(userData?.name) : userData?.name}
          </h2>

          {/* Department */}
          <span className="opacity-60 text-[10px] font-light uppercase tracking-wider">
            {userData?.department || "Department"}
          </span>

          {/* User ID (from Dahua / Firestore) */}
          <span className="opacity-60 text-[10px] font-light">
            ID: {userData?.userId || "---"}
          </span>
        </div>
      </div>

      {datetime && (
        <div className="flex flex-col border-l border-l-neutral-500 pl-8">
          <span className="capitalize text-[8px]">{dayName}</span>
          <span className="uppercase font-calSans text-base">
            {formattedDate}
          </span>
          <span className="text-[10px] tracking-[12px]">{year}</span>
        </div>
      )}
    </div>
  );
};

export default DashboardUserInfo;
