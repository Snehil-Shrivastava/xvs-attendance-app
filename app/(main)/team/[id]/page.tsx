"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  ChevronDown,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { updateTeamMemberProfile } from "@/app/actions/users";

interface UserProfileData {
  name: string;
  photoUrl?: string;
  department?: string;
  userId?: string;
  dob?: string;
  phone?: string;
  panNumber?: string;
  adhaarNumber?: string;
  aadhaarNumber?: string;
  email?: string;
  emergencyContact?: {
    name?: string;
    relation?: string;
    relationship?: string;
    phone?: string;
  };
  address?: string;
}

const inputCardCls =
  "w-full bg-background border border-[#E5DEC9] px-3.5 py-3 text-[10px] text-[#231F20] font-medium placeholder-[#8C827A] focus:outline-none focus:border-[#D97736] transition";
const labelCls = "block text-[10px] text-[#8C827A] font-normal mb-1.5";

export default function EditTeamMemberPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const memberId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Static (read-only)
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("/placeholder-avatar.png");

  // Editable Form State
  const [department, setDepartment] = useState("");
  const [userIdVal, setUserIdVal] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [adhaarNumber, setAdhaarNumber] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!memberId) return;

    const userDocRef = doc(db, "users", memberId);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfileData;
        setName(data.name || "Employee");
        setPhotoURL(data.photoUrl || "/placeholder-avatar.png");
        setDepartment(data.department || "");
        setUserIdVal(data.userId || memberId);
        setDob(data.dob || "02 September 1996");
        setPhone(data.phone || "70548 79254");
        setPanNumber(data.panNumber || "FOKPS6791M");
        setAdhaarNumber(
          data.adhaarNumber || data.aadhaarNumber || "8484 8948 9858",
        );
        setEmail(data.email || "");
        setEmergencyName(data.emergencyContact?.name || "Dinesh Kumar");
        setEmergencyRelation(
          data.emergencyContact?.relation ||
            data.emergencyContact?.relationship ||
            "Father",
        );
        setEmergencyPhone(data.emergencyContact?.phone || "70548 79254");
        setAddress(
          data.address ||
            "82, Kherwadi Road, Nr Railway Station, Bandra (e)\nMumbai,\nMaharashtra, 400051",
        );
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [memberId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const idToken = await user.getIdToken(true);
      const res = await updateTeamMemberProfile(
        {
          targetDocId: memberId,
          department,
          userId: userIdVal,
          dob,
          phone,
          panNumber,
          adhaarNumber,
          email,
          emergencyContact: {
            name: emergencyName,
            relation: emergencyRelation,
            phone: emergencyPhone,
          },
          address,
        },
        idToken,
      );

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update member.");
        setSaving(false);
        return;
      }

      setSuccessMessage("Member details saved successfully!");
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-5 flex justify-center bg-background font-poppins">
      <div className="w-full max-w-md border border-[#E5DEC9] bg-background p-3 shadow-xs">
        {/* Navigation & Cancel */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[#8C827A] hover:text-[#231F20] transition mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-600 text-xs px-3 py-2">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-700 text-xs px-3 py-2">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* ============ TOP ROW: IDENTITY ============ */}
          <div className="flex items-start gap-3.5">
            {/* Read-Only Avatar */}
            <Image
              src={photoURL}
              alt={name}
              width={70}
              height={70}
              className="w-18 h-18 object-cover rounded-xs border border-[#E5DEC9] shrink-0 select-none"
            />

            <div className="flex flex-col gap-2 w-full">
              {/* Read-Only Name */}
              <h2 className="text-xl font-calSans tracking-wide text-[#231F20] leading-tight select-none">
                {name}
              </h2>

              {/* Editable Department & User ID */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Designation"
                  required
                  disabled={saving}
                  className="bg-background border border-[#E5DEC9] px-3 py-1.5 text-[10px] text-[#231F20] font-normal focus:outline-none focus:border-[#D97736]"
                />
                <input
                  type="text"
                  value={userIdVal}
                  onChange={(e) => setUserIdVal(e.target.value)}
                  placeholder="User ID"
                  required
                  disabled={saving}
                  className="bg-background border border-[#E5DEC9] px-3 py-1.5 text-[10px] text-[#231F20] font-normal focus:outline-none focus:border-[#D97736]"
                />
              </div>
            </div>
          </div>

          {/* ============ DATE OF BIRTH ============ */}
          <div>
            <label className={labelCls}>Date of Birth</label>
            <div className="relative flex items-center bg-background border border-[#E5DEC9]">
              <Calendar className="w-4 h-4 text-[#D97736] absolute left-3.5 shrink-0 pointer-events-none" />
              <input
                type="text"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="e.g. 02 September 1996"
                disabled={saving}
                className="w-full bg-transparent pl-10 pr-3.5 py-3 text-[10px] text-[#231F20] font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* ============ CONTACT NUMBER ============ */}
          <div>
            <label className={labelCls}>Contact Number</label>
            <div className="flex items-center bg-background border border-[#E5DEC9]">
              <div className="flex items-center gap-1 px-2.5 py-3 border-r border-[#E5DEC9] text-[10px] text-[#231F20] font-medium shrink-0">
                <span>+91</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#D97736]" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                disabled={saving}
                className="w-full bg-transparent px-3 py-3 text-[10px] text-[#231F20] font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* ============ PAN & ADHAAR ============ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>PAN Number</label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="PAN Number"
                disabled={saving}
                className={inputCardCls}
              />
            </div>
            <div>
              <label className={labelCls}>Adhaar Number</label>
              <input
                type="text"
                value={adhaarNumber}
                onChange={(e) => setAdhaarNumber(e.target.value)}
                placeholder="Adhaar Number"
                disabled={saving}
                className={inputCardCls}
              />
            </div>
          </div>

          {/* ============ EMAIL ============ */}
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              disabled={saving}
              className={inputCardCls}
            />
          </div>

          {/* ============ EMERGENCY CONTACT ============ */}
          <div>
            <label className={labelCls}>Emergency Contact</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Name"
                disabled={saving}
                className={`${inputCardCls} text-center`}
              />
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="Relation"
                disabled={saving}
                className={`${inputCardCls} text-center`}
              />
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Phone"
                disabled={saving}
                className={`${inputCardCls} text-center`}
              />
            </div>
          </div>

          {/* ============ ADDRESS ============ */}
          <div>
            <label className={labelCls}>Address</label>
            <div className="relative flex items-start bg-background border border-[#E5DEC9] p-3">
              <CheckCircle2 className="w-4 h-4 text-[#D97736] shrink-0 mt-0.5 mr-2 pointer-events-none" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                disabled={saving}
                placeholder="Street address, City, State, Pincode"
                className="w-full bg-transparent text-[10px] text-[#231F20] font-medium leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* ============ SAVE BUTTON ============ */}
          <button
            type="submit"
            disabled={saving}
            className="w-full mt-2 bg-brand-orange hover:bg-brand-orange/90 active:scale-[0.99] text-white py-3.5 text-sm font-semibold tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              "Save"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
