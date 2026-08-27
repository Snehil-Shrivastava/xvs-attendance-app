import AttendanceCalendarView from "@/components/AttendanceCalendarView";
import AttendanceHistory from "@/components/AttendanceHistory";
import AttendanceStats from "@/components/AttendanceStats";
import Link from "next/link";

const AttendancePage = () => {
  return (
    <div className="py-10 px-5 flex flex-col gap-8">
      <AttendanceStats />
      <AttendanceCalendarView />
      <AttendanceHistory />
      <Link
        href={"#"}
        className="capitalize text-white text-base bg-brand-orange py-3 w-full mt-4 text-center"
      >
        request attendance correction
      </Link>
    </div>
  );
};

export default AttendancePage;
