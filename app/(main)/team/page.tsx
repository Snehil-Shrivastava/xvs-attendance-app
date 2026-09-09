import TeamHeader from "@/components/TeamHeader";
import TeamMemberList from "@/components/TeamMemberList";

const TeamPage = () => {
  return (
    <div className="text-black py-10 px-5">
      <TeamHeader />
      <TeamMemberList />
    </div>
  );
};

export default TeamPage;
