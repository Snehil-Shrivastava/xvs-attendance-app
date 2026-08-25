import lateArrival from "@/public/late-arrival.svg";
import leaveApply from "@/public/apply-for-leave.svg";
import halfdayApply from "@/public/apply-for-halfday.svg";
import Image from "next/image";

const DashboardRequests = () => {
  return (
    <div className="py-10">
      {/* Section Header */}
      <span className="text-[10px] text-black opacity-50">Requests</span>

      {/* 2-Card Grid */}
      <div className="text-brand-cream flex justify-between gap-4 mt-3">
        <div className="bg-brand-red px-5 py-8 text-center flex-1">
          <Image src={lateArrival} alt="" className="mx-auto mb-4 w-10 h-10" />
          <span className="capitalize text-[12px]">Late Arrival</span>
        </div>
        <div className="bg-brand-black px-5 py-8 text-center flex-1">
          <Image src={leaveApply} alt="" className="mx-auto mb-4 w-10 h-10" />
          <span className="capitalize text-[12px]">Apply for leave</span>
        </div>
        <div className="bg-brand-black px-5 py-8 text-center flex-1">
          <Image src={halfdayApply} alt="" className="mx-auto mb-4 w-10 h-10" />
          <span className="capitalize text-[12px]">apply for half day</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardRequests;
