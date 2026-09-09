"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createTeamMember } from "@/app/actions/users";

interface AddTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  name: string;
  email: string;
  userId: string;
  password: string;
  department: string;
  role: "employee" | "admin";
  annualQuota: string;
  grace: string;
  shiftStart: string;
  shiftEnd: string;
}

const defaultForm: FormState = {
  name: "",
  email: "",
  userId: "",
  password: "",
  department: "",
  role: "employee",
  annualQuota: "24",
  grace: "30",
  shiftStart: "09:00",
  shiftEnd: "17:00",
};

const inputCls =
  "w-full bg-[#FBF3E3] border border-[#E5DEC9] px-3 py-2.5 text-xs text-[#231F20] placeholder-[#8C827A] focus:outline-none focus:border-brand-orange transition";
const labelCls = "block text-[10px] text-[#8C827A] mb-1";

const AddTeamMemberModal = ({ open, onClose }: AddTeamMemberModalProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Reset every time the modal opens
  useEffect(() => {
    if (open) {
      setForm(defaultForm);
      setSuccess(false);
      setErrorMessage("");
      setSubmitting(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  //   const handleSubmit = async (e: React.FormEvent) => {
  //     e.preventDefault();
  //     if (!user || submitting) return;
  //     setErrorMessage("");
  //     setSubmitting(true);

  //     try {
  //       const idToken = await user.getIdToken();
  //       const result = await createTeamMember(
  //         {
  //           userId: form.userId,
  //           name: form.name,
  //           email: form.email,
  //           password: form.password,
  //           department: form.department,
  //           role: form.role,
  //           annualQuota: Number(form.annualQuota),
  //           monthlyGraceMinutes: Number(form.grace),
  //           shiftStart: form.shiftStart,
  //           shiftEnd: form.shiftEnd,
  //           mustChangePassword: false, // checkbox removed — same default as seed-admin.ts
  //         },
  //         idToken,
  //       );

  //       if (!result.success) {
  //         setErrorMessage(result.error);
  //         setSubmitting(false);
  //         return;
  //       }

  //       setSuccess(true);
  //       setTimeout(onClose, 1200);
  //     } catch {
  //       setErrorMessage("Something went wrong. Please try again.");
  //       setSubmitting(false);
  //     }
  //   };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setErrorMessage("");
    setSubmitting(true);

    try {
      // Force refresh token so stale sessions don't fail verification
      const idToken = await user.getIdToken(true);

      const result = await createTeamMember(
        {
          userId: form.userId,
          name: form.name,
          email: form.email,
          password: form.password,
          department: form.department,
          role: form.role,
          annualQuota: Number(form.annualQuota),
          monthlyGraceMinutes: Number(form.grace),
          shiftStart: form.shiftStart,
          shiftEnd: form.shiftEnd,
          mustChangePassword: false,
        },
        idToken,
      );

      if (!result.success) {
        setErrorMessage(result.error || "Failed to create team member.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      console.error("Modal submission error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={submitting ? undefined : onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-background rounded-xs shadow-xl p-6 max-h-[90vh] overflow-y-auto font-poppins">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCircle2 className="w-10 h-10 text-brand-orange" />
            <span className="text-sm font-semibold text-[#231F20]">
              Member added to the team!
            </span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-[#231F20]">
                Add Team Member
              </span>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs px-4 py-2.5 rounded-xs mb-4">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="col-span-2">
                <label className={labelCls}>Full Name *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Email */}
              <div className="col-span-2">
                <label className={labelCls}>Email *</label>
                <input
                  className={inputCls}
                  type="email"
                  placeholder="e.g. johndoe@abc.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {/* User ID */}
              <div>
                <label className={labelCls}>User ID *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. 1006"
                  value={form.userId}
                  onChange={(e) => set("userId", e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Department */}
              <div>
                <label className={labelCls}>Department *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Video Editor"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Password */}
              <div className="col-span-2">
                <label className={labelCls}>Password *</label>
                <input
                  className={inputCls}
                  type="text"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Role */}
              <div>
                <label className={labelCls}>Role</label>
                <select
                  className={inputCls}
                  value={form.role}
                  onChange={(e) =>
                    set("role", e.target.value as FormState["role"])
                  }
                  disabled={submitting}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Annual Leave Quota */}
              <div>
                <label className={labelCls}>Annual Leave (days)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={form.annualQuota}
                  onChange={(e) => set("annualQuota", e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Shift */}
              <div>
                <label className={labelCls}>Shift Start</label>
                <input
                  className={inputCls}
                  type="time"
                  value={form.shiftStart}
                  onChange={(e) => set("shiftStart", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelCls}>Shift End</label>
                <input
                  className={inputCls}
                  type="time"
                  value={form.shiftEnd}
                  onChange={(e) => set("shiftEnd", e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Grace */}
              <div>
                <label className={labelCls}>Monthly Grace (mins)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={form.grace}
                  onChange={(e) => set("grace", e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="col-span-2 mt-2 w-full bg-brand-orange py-3 text-white text-xs tracking-widest uppercase hover:bg-brand-orange/90 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding member...
                  </>
                ) : (
                  "Add Member"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AddTeamMemberModal;
