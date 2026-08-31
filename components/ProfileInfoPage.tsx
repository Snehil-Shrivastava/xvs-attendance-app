"use client";

import { useEffect, useState } from "react";
import {
  User,
  MapPin,
  PhoneCall,
  ChevronDown,
  Loader2,
  Check,
  CalendarDays,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const ProfileInfoForm = () => {
  const { user, userData } = useAuth();

  // Form States
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Emergency Contact States
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Pre-fill form with existing user data
  useEffect(() => {
    if (userData) {
      setName(userData?.name || "");
      // @ts-expect-error custom fields
      setDob(userData?.dob || "");
      // @ts-expect-error custom fields
      setPhone(userData?.phone || "");
      // @ts-expect-error custom fields
      setAddress(userData?.address || "");
      // @ts-expect-error custom fields
      setEmergencyName(userData?.emergencyContact?.name || "");
      // @ts-expect-error custom fields
      setEmergencyContact(userData?.emergencyContact?.contact || "");
      // @ts-expect-error custom fields
      setEmergencyRelationship(userData?.emergencyContact?.relationship || "");
    }
  }, [userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setErrorMsg("");
    setSaved(false);

    try {
      const userDocRef = doc(db, "users", user.uid);

      await updateDoc(userDocRef, {
        name,
        dob,
        phone,
        address,
        emergencyContact: {
          name: emergencyName,
          contact: emergencyContact,
          relationship: emergencyRelationship,
        },
        updatedAt: new Date().toISOString(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: unknown) {
      console.error("Error saving profile info:", error);
      // @ts-expect-error unknown
      setErrorMsg(error?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full font-poppins text-black">
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-4 py-2.5 rounded text-center">
            {errorMsg}
          </div>
        )}

        {/* =========================================
            1. FULL NAME
        ========================================= */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[#8C827A] font-normal">
            Full Name
          </label>
          <div className="border border-[#E5DEC9] px-4 py-3.5 flex items-center gap-3">
            <User className="w-5 h-5 text-[#E78B38] shrink-0 stroke-[1.8]" />
            <input
              type="text"
              placeholder="e.g. Mehul Kumar Chaudhary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-transparent text-xs md:text-sm text-[#231F20] font-medium focus:outline-none placeholder-[#C4BCB1]"
            />
          </div>
        </div>

        {/* =========================================
            2. DATE OF BIRTH
        ========================================= */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[#8C827A] font-normal">
            Date of Birth
          </label>
          <div className="border border-[#E5DEC9] px-4 py-3.5 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-[#E78B38] shrink-0 stroke-[1.8]" />
            <input
              type="date"
              placeholder="e.g. 02 September 1996"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-transparent text-xs md:text-sm text-[#231F20] font-medium focus:outline-none placeholder-[#C4BCB1]"
            />
          </div>
        </div>

        {/* =========================================
            3. CONTACT NUMBER
        ========================================= */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[#8C827A] font-normal">
            Contact Number
          </label>
          <div className="border border-[#E5DEC9] px-4 py-3.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-[#231F20] border-r border-[#E5DEC9] pr-3 select-none">
              <span>+91</span>
              <ChevronDown className="w-4 h-4 text-[#E78B38]" />
            </div>
            <input
              type="tel"
              placeholder="70548 79254"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-transparent text-xs md:text-sm text-[#231F20] font-medium focus:outline-none placeholder-[#C4BCB1]"
            />
          </div>
        </div>

        {/* =========================================
            4. ADDRESS
        ========================================= */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[#8C827A] font-normal">
            Address
          </label>
          <div className="border border-[#E5DEC9] px-3 py-2 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#E78B38] shrink-0 stroke-[1.8] mt-0.5" />
            <textarea
              rows={2}
              placeholder="Enter your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-transparent text-xs md:text-sm text-[#231F20] font-medium focus:outline-none placeholder-[#C4BCB1] resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* =========================================
            5. EMERGENCY CONTACT SECTION
        ========================================= */}
        <div className="bg-[#F79839]/20 p-5 rounded-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[#231F20]">
            <PhoneCall className="w-4 h-4 text-[#231F20]" />
            <span className="text-xs font-medium">Emergency Contact</span>
          </div>

          <div className="flex flex-col gap-3 text-xs md:text-sm text-[#231F20]">
            {/* Name */}
            <div className="flex items-center gap-2">
              <span className="font-semibold w-22 shrink-0">Name:</span>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full bg-transparent border-b border-black/10 focus:outline-none pb-0.5 text-xs md:text-sm"
              />
            </div>

            {/* Contact */}
            <div className="flex items-center gap-2">
              <span className="font-semibold w-22 shrink-0">Contact:</span>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full bg-transparent border-b border-black/10 focus:outline-none pb-0.5 text-xs md:text-sm"
              />
            </div>

            {/* Relationship */}
            <div className="flex items-center gap-2">
              <span className="font-semibold w-22 shrink-0">Relationship:</span>
              <input
                type="text"
                value={emergencyRelationship}
                onChange={(e) => setEmergencyRelationship(e.target.value)}
                className="w-full bg-transparent border-b border-black/10 focus:outline-none pb-0.5 text-xs md:text-sm"
              />
            </div>
          </div>
        </div>

        {/* =========================================
            6. SAVE BUTTON
        ========================================= */}
        <div className="flex justify-center mt-2 pb-8">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-orange text-white text-xs md:text-sm font-medium py-3 px-14 rounded-xs shadow-xs transition hover:bg-brand-orange/90 active:scale-[0.99] cursor-pointer tracking-wider flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4 stroke-3" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileInfoForm;
