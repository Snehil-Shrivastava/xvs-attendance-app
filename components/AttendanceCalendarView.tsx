// "use client";

// import { useCallback, useMemo } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { Pencil, X, Loader2 } from "lucide-react";
// import { buildCalendarDays, type CalendarDay } from "@/lib/calendarGrid";
// import { getDayDetails, type DayDetails } from "@/lib/calendarStatus";
// import { useAttendanceCalendarData } from "@/hooks/useAttendanceCalendarData";
// import { useExpandedOverlay } from "@/hooks/useExpandedOverlay";
// import { useAdminManageDay } from "@/hooks/useAdminManageDay";

// interface AttendanceCalendarViewProps {
//   currentDate: Date;
//   currentMonthStr: string; // e.g. "2026-08"
//   targetUserId?: string;
// }

// const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// const AttendanceCalendarView = ({
//   currentDate,
//   currentMonthStr,
//   targetUserId,
// }: AttendanceCalendarViewProps) => {
//   const { user, userData } = useAuth();
//   const effectiveUid = targetUserId || user?.uid;
//   const isAdmin = userData?.role === "admin";

//   // ---- Data (listeners) ----
//   const { monthlyRecords, approvedLeavesMap, holidaysMap } =
//     useAttendanceCalendarData(effectiveUid, currentMonthStr);

//   // ---- Grid ----
//   const calendarDays = useMemo(
//     () => buildCalendarDays(currentDate),
//     [currentDate],
//   );

//   // ---- Status resolver ----
//   const detailsFor = useCallback(
//     (day: CalendarDay): DayDetails =>
//       getDayDetails(
//         day,
//         monthlyRecords[day.dateString],
//         holidaysMap[day.dateString],
//         approvedLeavesMap[day.dateString],
//       ),
//     [monthlyRecords, holidaysMap, approvedLeavesMap],
//   );

//   // ---- Expansion ----
//   const { toggleDay, collapse, overlayConfig } = useExpandedOverlay(
//     calendarDays,
//     detailsFor,
//     currentMonthStr,
//   );

//   // ---- Admin modal ----
//   const admin = useAdminManageDay({
//     effectiveUid,
//     userData,
//     monthlyRecords,
//     approvedLeavesMap,
//   });

//   return (
//     <div className="w-full font-poppins text-black select-none">
//       <div className="relative">
//         {/* Weekday headers */}
//         <div className="grid grid-cols-7 text-center py-3 bg-transparent border-b border-[#E5DEC9]">
//           {WEEKDAYS.map((d) => (
//             <span key={d} className="font-semibold text-xs text-[#231F20]">
//               {d}
//             </span>
//           ))}
//         </div>

//         {/* Day grid */}
//         <div className="grid grid-cols-7 relative">
//           {calendarDays.map((day, index) => {
//             const { styleClass, hasOvertime } = detailsFor(day);
//             return (
//               <div
//                 key={index}
//                 onClick={() => toggleDay(day)}
//                 className={`relative aspect-square border-l border-r border-b border-[#E5DEC9] flex items-center justify-center text-xs md:text-sm transition-colors ${
//                   day.isCurrentMonth ? "cursor-pointer" : "pointer-events-none"
//                 } ${styleClass}`}
//               >
//                 {day.dayNumber}
//                 {hasOvertime && (
//                   <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#55B5E5] ring-[0.5px] ring-white" />
//                 )}
//               </div>
//             );
//           })}

//           {/* Expanded 2×2 overlay */}
//           {overlayConfig && (
//             <div
//               onClick={collapse}
//               style={{
//                 top: `${overlayConfig.topPercent}%`,
//                 left: `${overlayConfig.leftPercent}%`,
//                 width: `${overlayConfig.widthPercent}%`,
//                 height: `${overlayConfig.heightPercent}%`,
//               }}
//               className={`absolute z-20 border border-[#E5DEC9] p-1.5 flex flex-col justify-between cursor-pointer transition-all duration-150 shadow-md ${
//                 overlayConfig.details.isNormal
//                   ? "bg-background text-[#231F20]"
//                   : overlayConfig.details.styleClass
//               }`}
//             >
//               <div className="flex items-center justify-between w-full">
//                 {!overlayConfig.isBottom ? (
//                   <span className="text-xs font-medium">
//                     {overlayConfig.day.dayNumber}
//                   </span>
//                 ) : (
//                   <div />
//                 )}

//                 <div className="flex items-center gap-1">
//                   {overlayConfig.details.hasOvertime && (
//                     <span
//                       title={`Overtime: ${overlayConfig.details.overtimeMinutes} mins`}
//                       className="text-[8px] font-semibold bg-[#55B5E5] text-white px-1 py-px leading-none tracking-wide"
//                     >
//                       OT
//                     </span>
//                   )}

//                   {isAdmin && (
//                     <button
//                       type="button"
//                       title="Manage Day Record"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         admin.openModal(overlayConfig.day.dateString);
//                       }}
//                       className="p-1 hover:opacity-75 transition cursor-pointer"
//                     >
//                       <Pencil className="w-3 h-3 stroke-[2.5]" />
//                     </button>
//                   )}
//                 </div>
//               </div>

//               <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
//                 {overlayConfig.details.label && (
//                   <span className="font-calSans text-xs tracking-wide leading-tight drop-shadow-xs">
//                     {overlayConfig.details.label}
//                   </span>
//                 )}
//                 {overlayConfig.details.remark && (
//                   <span className="text-[10px] opacity-90 font-normal italic leading-tight mt-1 line-clamp-2">
//                     &ldquo;{overlayConfig.details.remark}&rdquo;
//                   </span>
//                 )}
//               </div>

//               {overlayConfig.isBottom && (
//                 <div
//                   className={`flex ${overlayConfig.isBottom && overlayConfig.isRight ? "justify-end" : "justify-start"}`}
//                 >
//                   <span className="text-xs font-medium">
//                     {overlayConfig.day.dayNumber}
//                   </span>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Legend */}
//       <div className="mt-6">
//         <span className="text-[10px] text-[#8C827A] font-normal block mb-3">
//           Demarcations
//         </span>
//         <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 text-[8px] text-[#231F20]">
//           {[
//             ["bg-[#4E7B80]", "Leave"],
//             ["bg-[#74C0B5]", "Half Day"],
//             ["bg-[#577A64]", "WFH"],
//             ["bg-[#55B5E5]", "Overtime"],
//             ["bg-[#DE4949]", "Late"],
//             ["bg-brand-orange", "Present"],
//             ["bg-[#91C95A]", "Late/Allowed"],
//             ["bg-[#BA255F]", "Holiday"],
//           ].map(([color, label]) => (
//             <div key={label} className="flex items-center gap-1.5">
//               <span className={`w-3.5 h-3.5 ${color} shrink-0`} />
//               <span>{label}</span>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Admin modal */}
//       {admin.isOpen && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-poppins"
//           onClick={admin.closeModal}
//         >
//           <div
//             className="relative w-full max-w-sm bg-background border border-[#E5DEC9] p-5 shadow-xl text-[#231F20]"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5DEC9]">
//               <h4 className="text-xs font-semibold tracking-wide">
//                 Manage Day ({admin.remarkDate})
//               </h4>
//               <button
//                 type="button"
//                 onClick={admin.closeModal}
//                 className="text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             </div>

//             <form onSubmit={admin.save} className="flex flex-col gap-4">
//               {/* Status selector */}
//               <div className="flex flex-col gap-1.5">
//                 <label className="text-[10px] text-[#8C827A]">
//                   Mark Status
//                 </label>
//                 <div className="grid grid-cols-4 gap-1.5 text-xs font-medium">
//                   {(["Present", "Absent", "Half Day", "Leave"] as const).map(
//                     (st) => (
//                       <button
//                         key={st}
//                         type="button"
//                         onClick={() => admin.setSelectedStatus(st)}
//                         className={`py-2 px-1 text-center rounded-xs border transition cursor-pointer ${
//                           admin.selectedStatus === st
//                             ? "bg-[#231F20] text-white border-[#231F20]"
//                             : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20] hover:bg-[#F3ECE0]"
//                         }`}
//                       >
//                         {st}
//                       </button>
//                     ),
//                   )}
//                 </div>
//               </div>

//               {/* Check-in + WFH toggle (Present only) */}
//               {admin.selectedStatus === "Present" && (
//                 <div className="flex flex-col gap-3 animate-in fade-in duration-150">
//                   <div className="flex flex-col gap-1.5">
//                     <label className="text-[10px] text-[#8C827A]">
//                       Check-in Time
//                     </label>
//                     <input
//                       type="time"
//                       value={admin.checkInTime}
//                       onChange={(e) => admin.setCheckInTime(e.target.value)}
//                       required
//                       className="w-full bg-[#FBF3E3] border border-[#E5DEC9] px-3 py-2 text-xs text-[#231F20] focus:outline-none"
//                     />
//                   </div>

//                   <div className="flex flex-col gap-1.5">
//                     <label className="text-[10px] text-[#8C827A]">
//                       Work Mode
//                     </label>
//                     <div className="grid grid-cols-2 gap-2 text-xs font-medium">
//                       <button
//                         type="button"
//                         onClick={() => admin.setIsWorkFromHome(false)}
//                         className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
//                           !admin.isWorkFromHome
//                             ? "bg-brand-orange text-white border-brand-orange"
//                             : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
//                         }`}
//                       >
//                         On-Site
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => admin.setIsWorkFromHome(true)}
//                         className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
//                           admin.isWorkFromHome
//                             ? "bg-[#577A64] text-white border-[#577A64]"
//                             : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
//                         }`}
//                       >
//                         Work from Home
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Leave subtype (Leave only) */}
//               {admin.selectedStatus === "Leave" && (
//                 <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
//                   <label className="text-[10px] text-[#8C827A]">
//                     Leave Type
//                   </label>
//                   <div className="grid grid-cols-2 gap-2 text-xs font-medium">
//                     <button
//                       type="button"
//                       onClick={() => admin.setLeaveSubType("normal")}
//                       className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
//                         admin.leaveSubType === "normal"
//                           ? "bg-[#4E7B80] text-white border-[#4E7B80]"
//                           : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
//                       }`}
//                     >
//                       Normal Leave
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => admin.setLeaveSubType("unpaid")}
//                       className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
//                         admin.leaveSubType === "unpaid"
//                           ? "bg-[#DE4949] text-white border-[#DE4949]"
//                           : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
//                       }`}
//                     >
//                       Unpaid Leave
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {/* Remark */}
//               <div className="flex flex-col gap-1.5">
//                 <label className="text-[10px] text-[#8C827A]">
//                   Remark / Note (Optional)
//                 </label>
//                 <textarea
//                   rows={2}
//                   value={admin.remarkText}
//                   onChange={(e) => admin.setRemarkText(e.target.value)}
//                   placeholder="e.g. Approved by HR, Client visit, etc."
//                   className="w-full bg-background border border-[#E5DEC9] p-2.5 text-xs text-[#231F20] focus:outline-none resize-none"
//                 />
//               </div>

//               <div className="flex justify-end gap-2 mt-2">
//                 <button
//                   type="submit"
//                   disabled={admin.savingRemark}
//                   className="w-full bg-brand-orange text-white text-xs py-2.5 font-medium hover:bg-brand-orange/90 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
//                 >
//                   {admin.savingRemark ? (
//                     <>
//                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                       <span>Saving Changes...</span>
//                     </>
//                   ) : (
//                     "Save & Apply"
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AttendanceCalendarView;

// ------------------------------------ delete data control

"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Pencil, X, Loader2, Trash2 } from "lucide-react";
import { buildCalendarDays, type CalendarDay } from "@/lib/calendarGrid";
import { getDayDetails, type DayDetails } from "@/lib/calendarStatus";
import { useAttendanceCalendarData } from "@/hooks/useAttendanceCalendarData";
import { useExpandedOverlay } from "@/hooks/useExpandedOverlay";
import { useAdminManageDay } from "@/hooks/useAdminManageDay";

interface AttendanceCalendarViewProps {
  currentDate: Date;
  currentMonthStr: string; // e.g. "2026-08"
  targetUserId?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const AttendanceCalendarView = ({
  currentDate,
  currentMonthStr,
  targetUserId,
}: AttendanceCalendarViewProps) => {
  const { user, userData } = useAuth();
  const effectiveUid = targetUserId || user?.uid;
  const isAdmin = userData?.role === "admin";

  const { monthlyRecords, approvedLeavesMap, holidaysMap } =
    useAttendanceCalendarData(effectiveUid, currentMonthStr);

  const calendarDays = useMemo(
    () => buildCalendarDays(currentDate),
    [currentDate],
  );

  const detailsFor = useCallback(
    (day: CalendarDay): DayDetails =>
      getDayDetails(
        day,
        monthlyRecords[day.dateString],
        holidaysMap[day.dateString],
        approvedLeavesMap[day.dateString],
      ),
    [monthlyRecords, holidaysMap, approvedLeavesMap],
  );

  const { toggleDay, collapse, overlayConfig } = useExpandedOverlay(
    calendarDays,
    detailsFor,
    currentMonthStr,
  );

  const admin = useAdminManageDay({
    effectiveUid,
    userData,
    monthlyRecords,
    approvedLeavesMap,
  });

  // Whether the day currently being managed has any data at all.
  // Used to decide whether to show the Delete button.
  const hasExistingData =
    admin.remarkDate !== "" &&
    (monthlyRecords[admin.remarkDate] !== undefined ||
      approvedLeavesMap[admin.remarkDate] !== undefined);

  return (
    <div className="w-full font-poppins text-black select-none">
      <div className="relative">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center py-3 bg-transparent border-b border-[#E5DEC9]">
          {WEEKDAYS.map((d) => (
            <span key={d} className="font-semibold text-xs text-[#231F20]">
              {d}
            </span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 relative">
          {calendarDays.map((day, index) => {
            const { styleClass, hasOvertime } = detailsFor(day);
            return (
              <div
                key={index}
                onClick={() => toggleDay(day)}
                className={`relative aspect-square border-l border-r border-b border-[#E5DEC9] flex items-center justify-center text-xs md:text-sm transition-colors ${
                  day.isCurrentMonth ? "cursor-pointer" : "pointer-events-none"
                } ${styleClass}`}
              >
                {day.dayNumber}
                {hasOvertime && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#55B5E5] ring-[0.5px] ring-white" />
                )}
              </div>
            );
          })}

          {/* Expanded 2×2 overlay */}
          {overlayConfig && (
            <div
              onClick={collapse}
              style={{
                top: `${overlayConfig.topPercent}%`,
                left: `${overlayConfig.leftPercent}%`,
                width: `${overlayConfig.widthPercent}%`,
                height: `${overlayConfig.heightPercent}%`,
              }}
              className={`absolute z-20 border border-[#E5DEC9] p-1.5 flex flex-col justify-between cursor-pointer transition-all duration-150 shadow-md ${
                overlayConfig.details.isNormal
                  ? "bg-background text-[#231F20]"
                  : overlayConfig.details.styleClass
              }`}
            >
              <div className="flex items-center justify-between w-full">
                {!overlayConfig.isBottom ? (
                  <span className="text-xs font-medium">
                    {overlayConfig.day.dayNumber}
                  </span>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-1">
                  {overlayConfig.details.hasOvertime && (
                    <span
                      title={`Overtime: ${overlayConfig.details.overtimeMinutes} mins`}
                      className="text-[8px] font-semibold bg-[#55B5E5] text-white px-1 py-px leading-none tracking-wide"
                    >
                      OT
                    </span>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      title="Manage Day Record"
                      onClick={(e) => {
                        e.stopPropagation();
                        admin.openModal(overlayConfig.day.dateString);
                      }}
                      className="p-1 hover:opacity-75 transition cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                {overlayConfig.details.label && (
                  <span className="font-calSans text-xs tracking-wide leading-tight drop-shadow-xs">
                    {overlayConfig.details.label}
                  </span>
                )}
                {overlayConfig.details.remark && (
                  <span className="text-[10px] opacity-90 font-normal italic leading-tight mt-1 line-clamp-2">
                    &ldquo;{overlayConfig.details.remark}&rdquo;
                  </span>
                )}
              </div>

              {overlayConfig.isBottom && (
                <div
                  className={`flex ${overlayConfig.isBottom && overlayConfig.isRight ? "justify-end" : "justify-start"}`}
                >
                  <span className="text-xs font-medium">
                    {overlayConfig.day.dayNumber}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6">
        <span className="text-[10px] text-[#8C827A] font-normal block mb-3">
          Demarcations
        </span>
        <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 text-[8px] text-[#231F20]">
          {[
            ["bg-[#4E7B80]", "Leave"],
            ["bg-[#74C0B5]", "Half Day"],
            ["bg-[#577A64]", "WFH"],
            ["bg-[#55B5E5]", "Overtime"],
            ["bg-[#DE4949]", "Late"],
            ["bg-brand-orange", "Present"],
            ["bg-[#91C95A]", "Late/Allowed"],
            ["bg-[#BA255F]", "Holiday"],
          ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 ${color} shrink-0`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin modal */}
      {admin.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-poppins"
          onClick={admin.closeModal}
        >
          <div
            className="relative w-full max-w-sm bg-background border border-[#E5DEC9] p-5 shadow-xl text-[#231F20]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5DEC9]">
              <h4 className="text-xs font-semibold tracking-wide">
                Manage Day ({admin.remarkDate})
              </h4>
              <button
                type="button"
                onClick={admin.closeModal}
                className="text-[#8C827A] hover:text-[#231F20] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={admin.save} className="flex flex-col gap-4">
              {/* Status selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#8C827A]">
                  Mark Status
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-medium">
                  {(["Present", "Absent", "Half Day", "Leave"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => admin.setSelectedStatus(st)}
                        className={`py-2 px-1 text-center rounded-xs border transition cursor-pointer ${
                          admin.selectedStatus === st
                            ? "bg-[#231F20] text-white border-[#231F20]"
                            : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20] hover:bg-[#F3ECE0]"
                        }`}
                      >
                        {st}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Check-in + WFH toggle (Present only) */}
              {admin.selectedStatus === "Present" && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#8C827A]">
                      Check-in Time
                    </label>
                    <input
                      type="time"
                      value={admin.checkInTime}
                      onChange={(e) => admin.setCheckInTime(e.target.value)}
                      required
                      className="w-full bg-[#FBF3E3] border border-[#E5DEC9] px-3 py-2 text-xs text-[#231F20] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#8C827A]">
                      Work Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => admin.setIsWorkFromHome(false)}
                        className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
                          !admin.isWorkFromHome
                            ? "bg-brand-orange text-white border-brand-orange"
                            : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
                        }`}
                      >
                        On-Site
                      </button>
                      <button
                        type="button"
                        onClick={() => admin.setIsWorkFromHome(true)}
                        className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
                          admin.isWorkFromHome
                            ? "bg-[#577A64] text-white border-[#577A64]"
                            : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
                        }`}
                      >
                        Work from Home
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Leave subtype (Leave only) */}
              {admin.selectedStatus === "Leave" && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                  <label className="text-[10px] text-[#8C827A]">
                    Leave Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => admin.setLeaveSubType("normal")}
                      className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
                        admin.leaveSubType === "normal"
                          ? "bg-[#4E7B80] text-white border-[#4E7B80]"
                          : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
                      }`}
                    >
                      Normal Leave
                    </button>
                    <button
                      type="button"
                      onClick={() => admin.setLeaveSubType("unpaid")}
                      className={`py-2 px-2 text-center rounded-xs border transition cursor-pointer ${
                        admin.leaveSubType === "unpaid"
                          ? "bg-[#DE4949] text-white border-[#DE4949]"
                          : "bg-[#FBF3E3] border-[#E5DEC9] text-[#231F20]"
                      }`}
                    >
                      Unpaid Leave
                    </button>
                  </div>
                </div>
              )}

              {/* Remark */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#8C827A]">
                  Remark / Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={admin.remarkText}
                  onChange={(e) => admin.setRemarkText(e.target.value)}
                  placeholder="e.g. Approved by HR, Client visit, etc."
                  className="w-full bg-background border border-[#E5DEC9] p-2.5 text-xs text-[#231F20] focus:outline-none resize-none"
                />
              </div>

              {/* Action row — Delete (left) + Save (right) */}
              <div className="flex items-center gap-2 mt-2">
                {hasExistingData && (
                  <button
                    type="button"
                    disabled={admin.savingRemark}
                    onClick={admin.deleteDay}
                    title="Delete this day's record entirely"
                    className="flex items-center justify-center gap-1.5 text-[#DE4949] border border-[#DE4949]/50 bg-[#DE4949]/5 hover:bg-[#DE4949]/10 text-xs py-2.5 px-3 font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={admin.savingRemark}
                  className="flex-1 bg-brand-orange text-white text-xs py-2.5 font-medium hover:bg-brand-orange/90 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {admin.savingRemark ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    "Save & Apply"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendarView;
