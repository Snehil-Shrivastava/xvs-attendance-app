"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import editIcon from "@/public/edit-icon.svg";
import AddOvertimeModal from "./AddOvertimeModal";
import AttendanceStats from "@/components/AttendanceStats";
import AttendanceCalendarView from "@/components/AttendanceCalendarView";
import AttendanceHistory from "@/components/AttendanceHistory";
import { MemberPendingRequests } from "./MemberPendingRequests";
import { MemberPersonalDetails } from "./MemberPersonalDetails";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOvertimeOpen, setIsOvertimeOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Month navigation for the embedded attendance view
  const currentMonthStr = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, [currentDate]);

  const formattedMonthTitle = useMemo(() => {
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  // Math for grace time
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
      <div className="border border-[#E5DEC9] bg-background p-2 transition-all duration-300 font-poppins text-black">
        {/* ============ TOP ROW: IDENTITY & CONTROLS ============ */}
        <div
          className="flex items-start justify-between gap-4 cursor-pointer select-none"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {/* Identity */}
          <div className="flex items-center gap-3">
            <Image
              src={photoUrl || "/placeholder-avatar.png"}
              alt={name}
              width={60}
              height={60}
              className="w-15 h-15 object-cover rounded-xs select-none shrink-0"
            />
            <div className="flex flex-col gap-0.5">
              <h2
                className="text-[15px] font-calSans tracking-wider text-[#231F20]"
                title={name}
              >
                {name}
              </h2>
              <span className="text-[9px] text-[#8C827A] font-light">
                {department}
              </span>
              <span className="text-[9px] text-[#8C827A] font-light">
                ID: {userId}
              </span>
            </div>
          </div>

          {/* Action buttons (Collapsed mode) OR Expand/Collapse Toggle */}
          <div
            className="flex flex-col items-end justify-between h-full gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Edit Button */}
            <button
              type="button"
              onClick={() => router.push(`/team/${userId}`)}
              title="Edit member details"
              className="text-[#8C827A] hover:text-[#231F20] transition cursor-pointer p-1"
            >
              <Image src={editIcon} alt="Edit" className="w-3.5 h-3.5" />
            </button>

            {/* Add Overtime Button */}
            {!isExpanded && (
              <button
                type="button"
                onClick={() => setIsOvertimeOpen(true)}
                title="Add overtime"
                className="bg-[#56C1E7] hover:bg-[#56C1E7]/90 active:scale-[0.99] transition text-white flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" strokeWidth={2.5} />
                <span className="text-[8px] font-medium whitespace-nowrap">
                  Add Overtime
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ============ COLLAPSED STAT TILES ============ */}
        {!isExpanded && (
          <div className="flex gap-2 mt-5 text-white">
            <div className="bg-brand-orange px-2.5 pt-0 pb-2 flex-1">
              <span className="text-[9px] font-medium">Pending Requests</span>
              <div className="font-calSans text-xl leading-none tracking-wider mt-1">
                {formattedPending}
              </div>
            </div>

            <div className="bg-[#90A9A6] px-2.5 pt-0 pb-2 flex-1">
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
        )}

        {/* ============ UNFOLDED VERTICAL DETAILS ============ */}
        {isExpanded && (
          <div className="flex flex-col gap-6 mt-6 pt-2 animate-in fade-in slide-in-from-top-3 duration-200">
            {/* 1. Pending Requests Section */}
            <MemberPendingRequests userId={userId} />

            {/* 2. Month Navigation Header */}
            <div className="flex items-center justify-between mt-1">
              <h3 className="font-calSans text-xl tracking-wide select-none">
                {formattedMonthTitle}
              </h3>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-[#8C827A] hover:text-black transition cursor-pointer"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-[#8C827A] hover:text-black transition cursor-pointer"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 3. Monthly Attendance Stats */}
            <AttendanceStats
              currentMonth={currentMonthStr}
              targetUserId={userId}
            />

            {/* 4. Calendar Grid & Demarcations */}
            <AttendanceCalendarView
              currentDate={currentDate}
              currentMonthStr={currentMonthStr}
              targetUserId={userId}
            />

            {/* 5. Attendance History Logs */}
            <AttendanceHistory targetUserId={userId} />

            {/* 6. Employee Personal Information Cards */}
            <MemberPersonalDetails userId={userId} />
          </div>
        )}
      </div>

      {/* Add Overtime Modal */}
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
