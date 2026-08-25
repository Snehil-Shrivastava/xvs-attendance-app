/* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import Image from "next/image";
// import bgImg from "@/public/bg-vector.svg";
// import appLogo from "@/public/app-logo.svg";
// import xvsLogo from "@/public/xvs-logo.svg";
// import Link from "next/link";
// import { useState } from "react";
// import { Eye, EyeClosed, Lock, User } from "lucide-react";

// const LoginPage = () => {
//   const [showPassword, setShowPassword] = useState(false);
//   const [userId, setUserId] = useState("");
//   const [password, setPassword] = useState("");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     // Handle login logic here
//     console.log({ userId, password });
//   };
//   return (
//     <div className="h-screen relative font-poppins px-8">
//       {/* login page background */}
//       <Image
//         src={bgImg}
//         alt=""
//         priority
//         className="absolute inset-x-0 bottom-0 select-none pointer-events-none -z-1"
//       />

//       <div className="flex flex-col items-center justify-center h-full gap-15">
//         {/* login page logo */}
//         <header className="flex flex-col items-center gap-5">
//           <Image src={appLogo} alt="" />
//           <span className="uppercase tracking-[9px] text-lg">presence</span>
//         </header>
//         {/* <div>login form goes here</div> */}
//         <form
//           onSubmit={handleSubmit}
//           className="flex w-full flex-col gap-5"
//           autoComplete="off"
//         >
//           {/* User ID Field */}
//           <div className="flex items-center gap-3 bg-[#f4eee5] px-4 py-3.5 shadow-sm">
//             <User
//               className="h-5 w-5 text-[#7A5C52] shrink-0"
//               strokeWidth={1.8}
//             />
//             <input
//               type="text"
//               placeholder="User ID or Email"
//               value={userId}
//               onChange={(e) => setUserId(e.target.value)}
//               required
//               className="w-full bg-transparent text-sm text-[#7A5C52] placeholder-[#7A5C52] focus:outline-none"
//               autoComplete="false"
//             />
//           </div>

//           {/* Password Field */}
//           <div className="flex items-center gap-3 bg-[#f4eee5] px-4 py-3.5 shadow-sm">
//             <Lock
//               className="h-5 w-5 text-[#7A5C52] shrink-0"
//               strokeWidth={1.8}
//             />
//             <input
//               type={showPassword ? "text" : "password"}
//               placeholder="Password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               className="w-full bg-transparent text-sm text-[#7A5C52] placeholder-[#7A5C52] focus:outline-none"
//               autoComplete="false"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="text-[#7A5C52] hover:text-[#554e46] transition-colors focus:outline-none"
//               aria-label={showPassword ? "Hide password" : "Show password"}
//             >
//               {showPassword ? (
//                 <Eye className="h-5 w-5" strokeWidth={1.8} />
//               ) : (
//                 <EyeClosed className="h-5 w-5" strokeWidth={1.8} />
//               )}
//             </button>
//           </div>

//           {/* Submit Button */}
//           <button
//             type="submit"
//             className="mt-5 w-full bg-brand-orange py-3.5 text-white transition hover:bg-brand-orange/90 active:scale-[0.99] tracking-widest"
//           >
//             Login
//           </button>

//           {/* Forgot Password Link */}
//           <div className="text-center">
//             <Link
//               href="#"
//               className="text-sm font-light text-stone-300 hover:text-white hover:underline transition-colors"
//             >
//               Forgot Password?
//             </Link>
//           </div>
//         </form>
//         <div>
//           <span className="capitalize text-[10px]">powered by</span>
//           <Image src={xvsLogo} alt="xvs creations" className="mx-auto mt-3" />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;

// -------------------------------------------------------------------------------

// src/app/login/page.tsx
"use client";

import Image from "next/image";
import bgImg from "@/public/bg-vector.svg";
import appLogo from "@/public/app-logo.svg";
import xvsLogo from "@/public/xvs-logo.svg";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Eye, EyeClosed, Lock, User, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
// import { auth } from "@/lib/firebase";
import { auth, resolveEmailFromId } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // If already logged in, redirect straight to Home (/)
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      // 1. Resolve User ID (e.g. "1001") -> Real Email (e.g. "admin@xvscreations.com")
      const result = await resolveEmailFromId(userId);

      if (!result.success || !result.email) {
        setErrorMessage(result.error || "Invalid User ID or Email.");
        setLoading(false);
        return;
      }

      // 2. Sign in via Firebase
      await signInWithEmailAndPassword(auth, result.email, password);

      // 3. Send to Home (/)
      router.replace("/");
    } catch (err: any) {
      console.error("Login Error:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setErrorMessage("Invalid credentials. Please check your password.");
      } else if (err.code === "auth/too-many-requests") {
        setErrorMessage("Too many failed attempts. Please try again later.");
      } else {
        setErrorMessage(err.message || "Failed to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show a blank loading screen while checking existing auth state
  if (authLoading || user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1817]">
        <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen relative font-poppins px-8 bg-brand-black">
      {/* Background vector */}
      <Image
        src={bgImg}
        alt=""
        priority
        className="absolute inset-x-0 bottom-0 select-none pointer-events-none z-0"
      />

      <div className="flex flex-col items-center justify-center h-full gap-15 relative z-1">
        {/* Logo */}
        <header className="flex flex-col items-center gap-5">
          <Image src={appLogo} alt="Presence Logo" />
          <span className="uppercase tracking-[9px] text-lg">presence</span>
        </header>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-5 max-w-sm"
          autoComplete="off"
        >
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs px-4 py-2.5 rounded text-center">
              {errorMessage}
            </div>
          )}

          {/* User ID Field */}
          <div className="flex items-center gap-3 bg-brand-cream px-4 py-3.5 shadow-sm">
            <User
              className="h-5 w-5 text-[#7A5C52] shrink-0"
              strokeWidth={1.8}
            />
            <input
              type="text"
              placeholder="User ID or Email"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-transparent text-sm text-[#7A5C52] placeholder-[#7A5C52] focus:outline-none disabled:opacity-50"
              autoComplete="off"
            />
          </div>

          {/* Password Field */}
          <div className="flex items-center gap-3 bg-brand-cream px-4 py-3.5 shadow-sm">
            <Lock
              className="h-5 w-5 text-[#7A5C52] shrink-0"
              strokeWidth={1.8}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-transparent text-sm text-[#7A5C52] placeholder-[#7A5C52] focus:outline-none disabled:opacity-50"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#7A5C52] hover:text-[#554e46] transition-colors focus:outline-none cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <Eye className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <EyeClosed className="h-5 w-5" strokeWidth={1.8} />
              )}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-brand-orange py-3.5 text-white transition hover:bg-brand-orange/90 active:scale-[0.99] tracking-widest flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <span>Log in</span>
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm font-light text-stone-300 hover:text-white hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        </form>

        {/* Footer */}
        <div>
          <span className="capitalize text-[10px]">powered by</span>
          <Image src={xvsLogo} alt="xvs creations" className="mx-auto mt-3" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
