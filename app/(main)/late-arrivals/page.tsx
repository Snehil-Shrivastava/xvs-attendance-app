import Image from "next/image";
import infoSVG from "@/public/infoSVG.svg";
import LateRequestForm from "@/components/LateRequestForm";
import LateHistory from "@/components/LateHistory";

const LateArrivalsPage = () => {
  return (
    <div className="py-10 px-5 flex flex-col gap-8 text-black">
      <div className="text-[10px] flex items-center gap-3 border border-black/10 px-2.5 py-2">
        <Image src={infoSVG} alt="" />
        <span>
          You can apply for late arrival <b>two times</b> in a given month{" "}
          <b>before 8AM</b>
        </span>
      </div>
      <LateRequestForm />
      <LateHistory />
    </div>
  );
};

export default LateArrivalsPage;
