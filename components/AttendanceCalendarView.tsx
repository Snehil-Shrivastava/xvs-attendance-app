// "use client";

// import { useEffect, useState, useMemo } from "react";
// import { collection, query, where, onSnapshot } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/context/AuthContext";

// interface DayRecord {
//   date: string;
//   status?:
//     | "On Time"
//     | "Grace Used"
//     | "Late"
//     | "Half Day"
//     | "Absent"
//     | "On Leave";
//   overtimeMinutes?: number;
// }

// interface AttendanceCalendarViewProps {
//   currentDate: Date;
//   currentMonthStr: string; // e.g. "2026-08"
// }

// const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// const AttendanceCalendarView = ({
//   currentDate,
//   currentMonthStr,
// }: AttendanceCalendarViewProps) => {
//   const { user } = useAuth();
//   const [monthlyRecords, setMonthlyRecords] = useState<
//     Record<string, DayRecord>
//   >({});
//   const [leaveDatesSet, setLeaveDatesSet] = useState<Set<string>>(new Set());

//   useEffect(() => {
//     if (!user) return;

//     // 1. Listen to Daily Punches for this month
//     const attendanceQuery = query(
//       collection(db, "daily_attendance"),
//       where("userId", "==", user.uid),
//       where("month", "==", currentMonthStr),
//     );

//     const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
//       const recordsMap: Record<string, DayRecord> = {};
//       snapshot.forEach((docSnap) => {
//         const data = docSnap.data() as DayRecord;
//         recordsMap[data.date] = data;
//       });
//       setMonthlyRecords(recordsMap);
//     });

//     // 2. Listen to `leaves` collection and expand all leave dates into a Set
//     const leavesQuery = query(
//       collection(db, "leaves"),
//       where("userId", "==", user.uid),
//     );

//     const unsubscribeLeaves = onSnapshot(leavesQuery, (snapshot) => {
//       const datesSet = new Set<string>();

//       snapshot.forEach((docSnap) => {
//         const data = docSnap.data();
//         if (data.status === "approved") {
//           const start = data.startDate; // "2026-08-11"
//           const end = data.endDate; // "2026-08-13"

//           if (start && end) {
//             const startDate = new Date(start);
//             const endDate = new Date(end);
//             const curDate = new Date(startDate);

//             while (curDate <= endDate) {
//               const yyyy = curDate.getFullYear();
//               const mm = String(curDate.getMonth() + 1).padStart(2, "0");
//               const dd = String(curDate.getDate()).padStart(2, "0");
//               datesSet.add(`${yyyy}-${mm}-${dd}`);
//               curDate.setDate(curDate.getDate() + 1);
//             }
//           }
//         }
//       });

//       setLeaveDatesSet(datesSet);
//     });

//     return () => {
//       unsubscribeAttendance();
//       unsubscribeLeaves();
//     };
//   }, [user, currentMonthStr]);

//   // Build Calendar Days Array
//   const calendarDays = useMemo(() => {
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth();

//     const firstDayIndex = new Date(year, month, 1).getDay();
//     const startingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

//     const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
//     const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

//     const days: Array<{
//       dayNumber: number;
//       dateString: string;
//       isCurrentMonth: boolean;
//       isWeekend: boolean;
//     }> = [];

//     // Previous month filler days
//     for (let i = startingOffset - 1; i >= 0; i--) {
//       const dayNum = totalDaysInPrevMonth - i;
//       const prevDate = new Date(year, month - 1, dayNum);
//       days.push({
//         dayNumber: dayNum,
//         dateString: "",
//         isCurrentMonth: false,
//         isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6,
//       });
//     }

//     // Current month days
//     for (let d = 1; d <= totalDaysInMonth; d++) {
//       const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
//       const dayDate = new Date(year, month, d);
//       days.push({
//         dayNumber: d,
//         dateString: dateStr,
//         isCurrentMonth: true,
//         isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
//       });
//     }

//     // Next month filler days
//     const remainingSlots =
//       35 - days.length > 0 ? 35 - days.length : 42 - days.length;
//     for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
//       const nextDate = new Date(year, month + 1, nextDay);
//       days.push({
//         dayNumber: nextDay,
//         dateString: "",
//         isCurrentMonth: false,
//         isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6,
//       });
//     }

//     return days;
//   }, [currentDate]);

//   // Determine Background Color & Text Color based on Status
//   const getDayStyle = (day: (typeof calendarDays)[0]) => {
//     if (!day.isCurrentMonth) {
//       return "bg-[#F3ECE0]/70 text-[#C4BCB1]";
//     }

//     if (day.isWeekend) {
//       return "bg-transparent text-[#B8B1A8]";
//     }

//     // Check if this day is marked as a Leave in `leaves` collection
//     if (leaveDatesSet.has(day.dateString)) {
//       return "bg-[#4E7B80] text-white font-medium"; // Leave (Teal)
//     }

//     const record = monthlyRecords[day.dateString];
//     if (!record) {
//       return "bg-transparent text-[#231F20]";
//     }

//     if ((record.overtimeMinutes ?? 0) > 0) {
//       return "bg-[#4BA7E3] text-white font-medium"; // Overtime (Blue)
//     }

//     switch (record.status) {
//       case "Late":
//         return "bg-[#DE4949] text-white font-medium"; // Late (Red)
//       case "Grace Used":
//         return "bg-[#88C252] text-white font-medium"; // Late/Allowed (Lime Green)
//       case "On Leave":
//         return "bg-[#4E7B80] text-white font-medium"; // Leave (Teal)
//       case "Half Day":
//         return "bg-[#74C0B5] text-white font-medium"; // Half Day (Cyan)
//       case "On Time":
//       default:
//         return "bg-transparent text-[#231F20]"; // Present (Neutral)
//     }
//   };

//   return (
//     <div className="w-full font-poppins text-black">
//       {/* Calendar Grid Container with Blue Border */}
//       <div className="bg-[#F7F3EB]/40">
//         {/* Weekday Column Headers */}
//         <div className="grid grid-cols-7 text-center py-3 bg-transparent">
//           {WEEKDAYS.map((day) => (
//             <span key={day} className="font-semibold text-xs text-[#231F20]">
//               {day}
//             </span>
//           ))}
//         </div>

//         {/* Day Grid */}
//         <div className="grid grid-cols-7">
//           {calendarDays.map((day, index) => {
//             const styleClass = getDayStyle(day);

//             return (
//               <div
//                 key={index}
//                 className={`aspect-square border-r border-b border-[#E5DEC9] flex items-center justify-center text-xs md:text-sm select-none transition-colors ${styleClass}`}
//               >
//                 {day.dayNumber}
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* Demarcations Legend Section */}
//       <div className="mt-6">
//         <span className="text-[10px] text-[#8C827A] font-normal block mb-3">
//           Demarcations
//         </span>

//         <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 text-[8px] text-[#231F20]">
//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 bg-[#4E7B80] shrink-0" />
//             <span>Leave</span>
//           </div>
//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 bg-[#74C0B5] shrink-0" />
//             <span>Half Day</span>
//           </div>
//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 bg-[#577A64] shrink-0" />
//             <span>WFM</span>
//           </div>
//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 bg-[#4BA7E3] shrink-0" />
//             <span>Overtime</span>
//           </div>

//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 bg-[#DE4949] shrink-0" />
//             <span>Late</span>
//           </div>
//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 border border-[#E5DEC9] bg-transparent shrink-0" />
//             <span>Present</span>
//           </div>
//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 bg-[#88C252] shrink-0" />
//             <span>Late/Allowed</span>
//           </div>
//           <div className="flex items-center gap-1.5">
//             <span className="w-3.5 h-3.5 bg-[#BA255F] shrink-0" />
//             <span>Holiday</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AttendanceCalendarView;

// ----------------------------------------------------------------

"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface DayRecord {
  date: string;
  status?:
    | "On Time"
    | "Grace Used"
    | "Late"
    | "Half Day"
    | "Absent"
    | "On Leave"
    | "WFM"
    | "Work from Home"
    | "Holiday";
  overtimeMinutes?: number;
}

interface AttendanceCalendarViewProps {
  currentDate: Date;
  currentMonthStr: string; // e.g. "2026-08"
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const AttendanceCalendarView = ({
  currentDate,
  currentMonthStr,
}: AttendanceCalendarViewProps) => {
  const { user } = useAuth();
  const [monthlyRecords, setMonthlyRecords] = useState<
    Record<string, DayRecord>
  >({});

  // Maps date string -> "Leave" | "Half Day"
  const [approvedLeavesMap, setApprovedLeavesMap] = useState<
    Record<string, "Leave" | "Half Day">
  >({});

  useEffect(() => {
    if (!user) return;

    // 1. Listen to Daily Punches for this month
    const attendanceQuery = query(
      collection(db, "daily_attendance"),
      where("userId", "==", user.uid),
      where("month", "==", currentMonthStr),
    );

    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const recordsMap: Record<string, DayRecord> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DayRecord;
        recordsMap[data.date] = data;
      });
      setMonthlyRecords(recordsMap);
    });

    // 2. Listen to `leaves` collection (Separating Full Leaves vs Half Days)
    const leavesQuery = query(
      collection(db, "leaves"),
      where("userId", "==", user.uid),
    );

    const unsubscribeLeaves = onSnapshot(leavesQuery, (snapshot) => {
      const leavesMap: Record<string, "Leave" | "Half Day"> = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "approved") {
          const isHalfDay =
            data.leaveType === "Half Day" ||
            data.durationType === "half" ||
            data.totalDays === 0.5;
          const start = data.startDate;
          const end = data.endDate;

          if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const curDate = new Date(startDate);

            while (curDate <= endDate) {
              const yyyy = curDate.getFullYear();
              const mm = String(curDate.getMonth() + 1).padStart(2, "0");
              const dd = String(curDate.getDate()).padStart(2, "0");
              const dateKey = `${yyyy}-${mm}-${dd}`;

              leavesMap[dateKey] = isHalfDay ? "Half Day" : "Leave";
              curDate.setDate(curDate.getDate() + 1);
            }
          }
        }
      });

      setApprovedLeavesMap(leavesMap);
    });

    return () => {
      unsubscribeAttendance();
      unsubscribeLeaves();
    };
  }, [user, currentMonthStr]);

  // Build Calendar Days Array
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    // Previous month filler days
    for (let i = startingOffset - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      days.push({
        dayNumber: dayNum,
        dateString: "",
        isCurrentMonth: false,
        isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayDate = new Date(year, month, d);
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
        isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
      });
    }

    // Next month filler days
    const remainingSlots =
      35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      days.push({
        dayNumber: nextDay,
        dateString: "",
        isCurrentMonth: false,
        isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6,
      });
    }

    return days;
  }, [currentDate]);

  // Determine Color Based on Status & Demarcations
  const getDayStyle = (day: (typeof calendarDays)[0]) => {
    if (!day.isCurrentMonth) {
      return "bg-[#F3ECE0]/70 text-[#C4BCB1]";
    }

    if (day.isWeekend) {
      return "bg-transparent text-[#B8B1A8]";
    }

    // 1. Check Approved Requests from `leaves` collection
    const approvedType = approvedLeavesMap[day.dateString];
    if (approvedType === "Half Day") {
      return "bg-[#74C0B5] text-white font-medium"; // Half Day (Cyan)
    }
    if (approvedType === "Leave") {
      return "bg-[#4E7B80] text-white font-medium"; // Full Leave (Teal)
    }

    // 2. Check Daily Attendance Records
    const record = monthlyRecords[day.dateString];
    if (!record) {
      return "bg-transparent text-[#231F20]"; // Present / Normal Workday
    }

    // 3. Priority Order for Daily Attendance
    if ((record.overtimeMinutes ?? 0) > 0) {
      return "bg-[#4BA7E3] text-white font-medium"; // Overtime (Blue)
    }

    switch (record.status) {
      case "Late":
        return "bg-[#DE4949] text-white font-medium"; // Late (Red)
      case "Grace Used":
        return "bg-[#88C252] text-white font-medium"; // Late/Allowed (Lime Green)
      case "Half Day":
        return "bg-[#74C0B5] text-white font-medium"; // Half Day (Cyan)
      case "On Leave":
        return "bg-[#4E7B80] text-white font-medium"; // Leave (Teal)
      case "WFM":
      case "Work from Home":
        return "bg-[#577A64] text-white font-medium"; // WFM (Sage Green)
      case "Holiday":
        return "bg-[#BA255F] text-white font-medium"; // Holiday (Magenta)
      case "On Time":
      default:
        return "bg-transparent text-[#231F20]"; // Present (Neutral)
    }
  };

  return (
    <div className="w-full font-poppins text-black">
      {/* Calendar Grid Container */}
      <div className="bg-[#F7F3EB]/40">
        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 text-center py-3 bg-transparent">
          {WEEKDAYS.map((day) => (
            <span key={day} className="font-semibold text-xs text-[#231F20]">
              {day}
            </span>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const styleClass = getDayStyle(day);

            return (
              <div
                key={index}
                className={`aspect-square border-r border-b border-[#E5DEC9] flex items-center justify-center text-xs md:text-sm select-none transition-colors ${styleClass}`}
              >
                {day.dayNumber}
              </div>
            );
          })}
        </div>
      </div>

      {/* Demarcations Legend Section */}
      <div className="mt-6">
        <span className="text-[10px] text-[#8C827A] font-normal block mb-3">
          Demarcations
        </span>

        <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 text-[8px] text-[#231F20]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#4E7B80] shrink-0" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#74C0B5] shrink-0" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#577A64] shrink-0" />
            <span>WFM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#4BA7E3] shrink-0" />
            <span>Overtime</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#DE4949] shrink-0" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border border-[#E5DEC9] bg-transparent shrink-0" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#88C252] shrink-0" />
            <span>Late/Allowed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#BA255F] shrink-0" />
            <span>Holiday</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendarView;
