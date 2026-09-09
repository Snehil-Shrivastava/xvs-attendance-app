"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, ChevronDown, MapPin } from "lucide-react";

interface UserProfileDetails {
  dob?: string;
  phone?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  adhaarNumber?: string;
  email?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    relation?: string;
    phone?: string;
  };
  address?: string;
}

const inputCardCls =
  "border border-[#E5DEC9] px-3 py-2.5 text-[10px] text-[#231F20] font-medium";
const labelCls = "block text-[10px] text-[#8C827A] font-normal mb-1";

export const MemberPersonalDetails = ({ userId }: { userId: string }) => {
  const [profile, setProfile] = useState<UserProfileDetails | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsub = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfileDetails);
      }
    });

    return () => unsub();
  }, [userId]);

  const aadhaar = profile?.aadhaarNumber || profile?.adhaarNumber || "--";
  const pan = profile?.panNumber || "--";
  const emergency = profile?.emergencyContact;

  return (
    <div className="flex flex-col gap-3.5 font-poppins text-black mt-2">
      {/* Date of Birth */}
      <div>
        <label className={labelCls}>Date of Birth</label>
        <div className={`flex items-center gap-2.5 ${inputCardCls}`}>
          <Calendar className="w-4 h-4 text-[#D97736] shrink-0" />
          <span>{profile?.dob || "02 September 1996"}</span>
        </div>
      </div>

      {/* Contact Number */}
      <div>
        <label className={labelCls}>Contact Number</label>
        <div className={`flex items-center gap-3 ${inputCardCls}`}>
          <div className="flex items-center gap-1 text-[#231F20]">
            <span>+91</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#D97736]" />
          </div>
          <span>{profile?.phone || "70548 79254"}</span>
        </div>
      </div>

      {/* PAN & Aadhaar */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>PAN Number</label>
          <div className={inputCardCls}>
            {pan !== "--" ? pan : "FOKPS6791M"}
          </div>
        </div>
        <div>
          <label className={labelCls}>Adhaar Number</label>
          <div className={inputCardCls}>
            {aadhaar !== "--" ? aadhaar : "8484 8948 9858"}
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <label className={labelCls}>Email</label>
        <div className={inputCardCls}>
          {profile?.email || "employee@company.com"}
        </div>
      </div>

      {/* Emergency Contact */}
      <div>
        <label className={labelCls}>Emergency Contact</label>
        <div className="grid grid-cols-3 gap-2">
          <div className={`${inputCardCls} text-center truncate`}>
            {emergency?.name || "Dinesh Kumar"}
          </div>
          <div className={`${inputCardCls} text-center truncate`}>
            {emergency?.relation || emergency?.relationship || "Father"}
          </div>
          <div className={`${inputCardCls} text-center truncate`}>
            {emergency?.phone || "70548 79254"}
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className={labelCls}>Address</label>
        <div
          className={`flex items-start gap-2.5 ${inputCardCls} leading-relaxed`}
        >
          <MapPin className="w-4 h-4 text-[#D97736] shrink-0 mt-0.5" />
          <span className="text-[11px] text-[#231F20]">
            {profile?.address || (
              <>
                82, Kherwadi Road, Nr Railway Station, Bandra (e)
                <br />
                Mumbai,
                <br />
                Maharashtra, 400051
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
