"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import AddTeamMemberModal from "./AddTeamMemberModal";

const TeamHeader = () => {
  const [total, setTotal] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Live count of active team members
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      let count = 0;
      snap.forEach((docSnap) => {
        if (docSnap.data().isActive !== false) count++;
      });
      setTotal(count);
    });
    return unsub;
  }, []);

  return (
    <>
      <div className="flex items-stretch gap-4">
        {/* Total members box */}
        <div className="flex-1 flex items-center gap-5 border border-[#E5DEC9] px-8 py-1.5">
          <span className="text-xl font-semibold text-[#231F20] leading-none">
            {total === null ? "–" : total}
          </span>
          <span className="text-xs text-[#231F20]">Total members of Team</span>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-brand-orange hover:bg-brand-orange/90 active:scale-[0.99] transition text-white flex items-center gap-1.5 px-4 cursor-pointer"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          <span className="text-sm font-medium">Add</span>
        </button>
      </div>

      <AddTeamMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default TeamHeader;
