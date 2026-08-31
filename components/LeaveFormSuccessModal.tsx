import Image from "next/image";
import sentSVG from "@/public/sentSVG.svg";

const LeaveFormSuccessModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-100 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="bg-brand-orange border-8 border-brand-cream flex flex-col items-center px-15 py-10 gap-5">
        <Image src={sentSVG} alt="" />
        <span className="capitalize text-brand-cream text-base font-medium">
          request sent
        </span>
      </div>
    </div>
  );
};

export default LeaveFormSuccessModal;
