// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/context/AuthContext";
// import { Loader2 } from "lucide-react";

// import DashboardHighlights from "@/components/DashboardHighlights";
// import DashboardRequests from "@/components/DashboardRequests";
// import Link from "next/link";

// export default function DashboardPage() {
//   const { user, loading } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading && !user) {
//       router.replace("/login");
//     }
//   }, [user, loading, router]);

//   if (loading || !user) {
//     return (
//       <div className="h-screen flex items-center justify-center bg-[#1a1817]">
//         <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
//       </div>
//     );
//   }
//   return (
//     <div className="py-10 px-5 flex flex-col">
//       <DashboardHighlights />
//       <DashboardRequests />
//       <Link
//         href={"/attendance"}
//         className="capitalize text-white text-base bg-brand-orange py-3 w-full mt-4 text-center"
//       >
//         view attendance
//       </Link>
//     </div>
//   );
// }

// ----------------------------------------------------------------------------

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

import DashboardHighlights from "@/components/DashboardHighlights";
import DashboardRequests from "@/components/DashboardRequests";
import PendingRequests from "@/components/PendingRequests"; // 👈 Import Admin component
import Link from "next/link";

export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1817]">
        <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
      </div>
    );
  }

  const isAdmin = userData?.role === "admin";

  return (
    <div className="py-10 px-5 flex flex-col gap-6">
      {/* 1. Admin-Only Pending Requests Section at the very top */}
      {isAdmin && <PendingRequests />}

      {/* 2. Employee & General Highlights */}
      <DashboardHighlights />

      {/* 3. Requests Summary */}
      <DashboardRequests />

      {/* 4. Action Link */}
      <Link
        href={"/attendance"}
        className="capitalize text-white text-base bg-brand-orange py-3 w-full mt-2 text-center rounded-xs shadow-xs tracking-wider transition hover:bg-brand-orange/90 active:scale-[0.99]"
      >
        view attendance
      </Link>
    </div>
  );
}
