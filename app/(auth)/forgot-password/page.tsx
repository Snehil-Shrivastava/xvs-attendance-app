"use client";

import Image from "next/image";
import bgImg from "@/public/bg-vector.svg";
import appLogo from "@/public/app-logo.svg";
import xvsLogo from "@/public/xvs-logo.svg";
import Link from "next/link";
import { useState } from "react";
import { User, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { resolveEmail } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState(""); // Can be "1003" or "snehil@xvscreations.com"
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      // 1. Resolve User ID -> Real Email
      const result = await resolveEmail(identifier);

      if (!result.success || !result.email) {
        setErrorMessage(result.error || "User ID or Email not found.");
        setLoading(false);
        return;
      }

      // 2. Trigger Firebase Password Reset Email
      await sendPasswordResetEmail(auth, result.email);

      setSentEmail(result.email);
      setIsSuccess(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === "auth/user-not-found") {
        setErrorMessage("No user found with this email address.");
      } else if (err.code === "auth/too-many-requests") {
        setErrorMessage("Too many requests. Please try again later.");
      } else {
        setErrorMessage(err.message || "Failed to send reset email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen relative font-poppins px-8">
      {/* Background vector */}
      <Image
        src={bgImg}
        alt=""
        priority
        className="absolute inset-x-0 bottom-0 select-none pointer-events-none -z-1"
      />

      <div className="flex flex-col items-center justify-center h-full gap-15">
        {/* Header */}
        <header className="flex flex-col items-center gap-5">
          <Image src={appLogo} alt="Presence Logo" />
          <span className="uppercase tracking-[9px] text-lg">presence</span>
        </header>

        {/* Content Box */}
        <div className="flex w-full flex-col gap-5 max-w-sm">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center gap-4 bg-green-500/10 border border-green-500/30 p-6 rounded text-[#7A5C52]">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <h2 className="text-base font-semibold">Password Reset Sent</h2>
              <p className="text-xs text-stone-300 font-light leading-relaxed">
                We sent a password reset link to:
                <br />
                <span className="font-medium text-white">{sentEmail}</span>
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex items-center gap-2 text-sm text-brand-orange hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleReset}
              className="flex flex-col gap-5"
              autoComplete="off"
            >
              <div className="text-center">
                <h2 className="text-base font-medium text-stone-200">
                  Reset Password
                </h2>
                <p className="text-xs text-stone-400 font-light mt-1">
                  Enter your User ID or work email to receive a reset link.
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs px-4 py-2.5 rounded text-center">
                  {errorMessage}
                </div>
              )}

              {/* Identifier Input */}
              <div className="flex items-center gap-3 bg-[#f4eee5] px-4 py-3.5 shadow-sm">
                <User
                  className="h-5 w-5 text-[#7A5C52] shrink-0"
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  placeholder="User ID or Work Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-transparent text-sm text-[#7A5C52] placeholder-[#7A5C52] focus:outline-none disabled:opacity-50"
                  autoComplete="off"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-brand-orange py-3.5 text-white transition hover:bg-brand-orange/90 active:scale-[0.99] tracking-widest flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-light text-stone-300 hover:text-white hover:underline transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div>
          <span className="capitalize text-[10px]">powered by</span>
          <Image src={xvsLogo} alt="xvs creations" className="mx-auto mt-3" />
        </div>
      </div>
    </div>
  );
}
