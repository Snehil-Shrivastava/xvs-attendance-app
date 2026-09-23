// app/(main)/team/page.tsx
import TeamHeader from "@/components/TeamHeader";
import TeamMemberList from "@/components/TeamMemberList";
import { Suspense } from "react";

const TeamPage = () => {
  return (
    <div className="text-black py-10 px-5">
      <TeamHeader />
      <Suspense fallback={null}>
        <TeamMemberList />
      </Suspense>
    </div>
  );
};

export default TeamPage;
