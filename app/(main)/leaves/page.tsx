import LeaveHistory from "@/components/LeaveHistory";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import LeaveStats from "@/components/LeaveStats";
import { Suspense } from "react";

const LeavesPage = () => {
  return (
    <div className="py-10 px-5 flex flex-col gap-8 text-black">
      <LeaveStats />
      <Suspense
        fallback={
          <div className="p-4 text-xs text-neutral-400">Loading form...</div>
        }
      >
        <LeaveRequestForm />
      </Suspense>
      <LeaveHistory />
    </div>
  );
};

export default LeavesPage;
