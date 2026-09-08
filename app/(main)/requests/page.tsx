"use client";

import PendingRequests from "@/components/PendingRequests";
import RequestsHistory from "@/components/RequestsHistory";
import { useAuth } from "@/context/AuthContext";

const RequestsPage = () => {
  const { userData } = useAuth();
  const isAdmin = userData?.role === "admin";
  return (
    <div className="py-10 px-5 text-black">
      {isAdmin && <PendingRequests />}
      <RequestsHistory />
    </div>
  );
};

export default RequestsPage;
