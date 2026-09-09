// "use client";

// import Image from "next/image";
// // import placeholder from "@/public/placeholder.webp";
// import { Plus } from "lucide-react";

// import editIcon from "@/public/edit-icon.svg";

// interface TeamMemberCardProps {
//   name: string;
//   department: string;
//   userId: string;
//   photoUrl?: string;
//   pendingRequests: number;
//   remainingLeaves: number;
//   graceRemainingMinutes: number;
// }

// const TeamMemberCard = ({
//   name,
//   department,
//   userId,
//   photoUrl,
//   pendingRequests,
//   remainingLeaves,
//   graceRemainingMinutes,
// }: TeamMemberCardProps) => {
//   // Same math as DashboardHighlights: whole minutes + leftover seconds
//   let graceMins = Math.floor(graceRemainingMinutes);
//   let graceSecs = Math.round((graceRemainingMinutes - graceMins) * 60);
//   if (graceSecs === 60) {
//     graceMins += 1;
//     graceSecs = 0;
//   }
//   const formattedMins = String(graceMins).padStart(2, "0");
//   const formattedSecs = String(graceSecs).padStart(2, "0");

//   // Half-day approvals can leave fractions like 23.5 — don't pad those
//   const formattedLeaves = Number.isInteger(remainingLeaves)
//     ? String(remainingLeaves).padStart(2, "0")
//     : String(remainingLeaves);

//   const formattedPending = String(pendingRequests).padStart(2, "0");

//   return (
//     <div className="border border-[#E5DEC9] bg-transparent p-3">
//       {/* ============ TOP ROW: identity + actions ============ */}
//       <div className="flex items-start justify-between gap-4">
//         {/* Identity — static avatar, FULL name (no truncation) */}
//         <div className="flex items-center gap-3">
//           <Image
//             src={photoUrl as string}
//             alt={name}
//             width={60}
//             height={60}
//             className="w-15 h-15 object-cover select-none"
//           />
//           <div className="flex flex-col gap-0.5">
//             <h2
//               className="text-[14px] font-calSans tracking-wider text-[#231F20]"
//               title={name}
//             >
//               {name}
//             </h2>
//             <span className="text-[8px] text-[#8C827A] font-light">
//               {department}
//             </span>
//             <span className="text-[8px] text-[#8C827A] font-light">
//               ID: {userId}
//             </span>
//           </div>
//         </div>

//         {/* Actions */}
//         <div className="flex flex-col items-end justify-between h-full gap-4">
//           {/* Edit — wiring comes later */}
//           <button
//             type="button"
//             title="Edit member (coming soon)"
//             className="text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
//           >
//             <Image src={editIcon} alt="" className="w-3 h-3" />
//           </button>

//           {/* Add Overtime — wiring comes later */}
//           <button
//             type="button"
//             title="Add overtime (coming soon)"
//             className="bg-[#56C1E7] hover:bg-[#56C1E7]/90 active:scale-[0.99] transition text-white flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
//           >
//             <Plus className="w-3 h-3" strokeWidth={2.5} />
//             <span className="text-[8px] font-medium whitespace-nowrap">
//               Add Overtime
//             </span>
//           </button>
//         </div>
//       </div>

//       {/* ============ STAT TILES ============ */}
//       <div className="flex gap-2 mt-5 text-white">
//         {/* Pending Requests */}
//         <div className="bg-brand-orange px-2.5 pt-0 pb-2 flex-1">
//           <span className="text-[9px] font-medium">Pending Requests</span>
//           <div className="font-calSans text-xl leading-none tracking-wider mt-1">
//             {formattedPending}
//           </div>
//         </div>

//         {/* Remaining Leaves */}
//         <div className="bg-[#9AB0AA] px-2.5 pt-0 pb-2 flex-1">
//           <span className="text-[9px] font-medium">Remaining Leaves</span>
//           <div className="font-calSans text-xl leading-none tracking-wider mt-1">
//             {formattedLeaves}
//           </div>
//         </div>

//         {/* Remaining Time */}
//         <div className="bg-[#D64545] px-2.5 pt-0 pb-2 flex-1">
//           <span className="text-[9px] font-medium">Remaining Time</span>
//           <div className="flex items-baseline gap-1.5 mt-1">
//             <span className="font-calSans text-xl leading-none tracking-wider">
//               {formattedMins}:{formattedSecs}
//             </span>
//             <span className="text-[8px] font-light">secs</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TeamMemberCard;

// ---------------------------------------------------------------

"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import editIcon from "@/public/edit-icon.svg";
import AddOvertimeModal from "./AddOvertimeModal";

interface TeamMemberCardProps {
  name: string;
  department: string;
  userId: string;
  photoUrl?: string;
  pendingRequests: number;
  remainingLeaves: number;
  graceRemainingMinutes: number;
}

const TeamMemberCard = ({
  name,
  department,
  userId,
  photoUrl,
  pendingRequests,
  remainingLeaves,
  graceRemainingMinutes,
}: TeamMemberCardProps) => {
  const [isOvertimeOpen, setIsOvertimeOpen] = useState(false);

  // Math for minutes & seconds
  let graceMins = Math.floor(graceRemainingMinutes);
  let graceSecs = Math.round((graceRemainingMinutes - graceMins) * 60);
  if (graceSecs === 60) {
    graceMins += 1;
    graceSecs = 0;
  }
  const formattedMins = String(graceMins).padStart(2, "0");
  const formattedSecs = String(graceSecs).padStart(2, "0");

  const formattedLeaves = Number.isInteger(remainingLeaves)
    ? String(remainingLeaves).padStart(2, "0")
    : String(remainingLeaves);

  const formattedPending = String(pendingRequests).padStart(2, "0");

  return (
    <>
      <div className="border border-[#E5DEC9] bg-transparent p-3">
        {/* ============ TOP ROW: identity + actions ============ */}
        <div className="flex items-start justify-between gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <Image
              src={photoUrl || "/placeholder-avatar.png"}
              alt={name}
              width={60}
              height={60}
              className="w-15 h-15 object-cover select-none"
            />
            <div className="flex flex-col gap-0.5">
              <h2
                className="text-[14px] font-calSans tracking-wider text-[#231F20]"
                title={name}
              >
                {name}
              </h2>
              <span className="text-[8px] text-[#8C827A] font-light">
                {department}
              </span>
              <span className="text-[8px] text-[#8C827A] font-light">
                ID: {userId}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end justify-between h-full gap-4">
            {/* Edit */}
            <button
              type="button"
              title="Edit member"
              className="text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
            >
              <Image src={editIcon} alt="" className="w-3 h-3" />
            </button>

            {/* Add Overtime Button */}
            <button
              type="button"
              onClick={() => setIsOvertimeOpen(true)}
              title="Add overtime"
              className="bg-[#55B5E5] hover:bg-[#55B5E5]/90 active:scale-[0.99] transition text-white flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" strokeWidth={2.5} />
              <span className="text-[8px] font-medium whitespace-nowrap">
                Add Overtime
              </span>
            </button>
          </div>
        </div>

        {/* ============ STAT TILES ============ */}
        <div className="flex gap-2 mt-5 text-white">
          <div className="bg-brand-orange px-2.5 pt-0 pb-2 flex-1">
            <span className="text-[9px] font-medium">Pending Requests</span>
            <div className="font-calSans text-xl leading-none tracking-wider mt-1">
              {formattedPending}
            </div>
          </div>

          <div className="bg-[#9AB0AA] px-2.5 pt-0 pb-2 flex-1">
            <span className="text-[9px] font-medium">Remaining Leaves</span>
            <div className="font-calSans text-xl leading-none tracking-wider mt-1">
              {formattedLeaves}
            </div>
          </div>

          <div className="bg-[#D64545] px-2.5 pt-0 pb-2 flex-1">
            <span className="text-[9px] font-medium">Remaining Time</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-calSans text-xl leading-none tracking-wider">
                {formattedMins}:{formattedSecs}
              </span>
              <span className="text-[8px] font-light">secs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overtime Modal */}
      <AddOvertimeModal
        open={isOvertimeOpen}
        onClose={() => setIsOvertimeOpen(false)}
        userId={userId}
        userName={name}
      />
    </>
  );
};

export default TeamMemberCard;
