import LeaveHistory from "@/components/LeaveHistory";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import LeaveStats from "@/components/LeaveStats";

const LeavesPage = () => {
  return (
    <div className="py-10 px-5 flex flex-col gap-8 text-black">
      <LeaveStats />
      <LeaveRequestForm />
      <LeaveHistory />
    </div>
  );
};

export default LeavesPage;
