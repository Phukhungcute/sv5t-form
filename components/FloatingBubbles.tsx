"use client";
import { FACULTY_NAME_NORMAL } from "@/lib/constants";

type FloatingBubblesProps = {
  left?: string;
};

export default function FloatingBubbles({
  left = "left-[100px]",
}: FloatingBubblesProps) {
  return (
    <div
      className={`fixed ${left} top-1/2 z-50 flex -translate-y-1/2 flex-col items-start gap-4`}
    >
      {/* Đoàn - Hội */}
      <a
        href="https://www.facebook.com/DoanHoiKhoaGiaoDucTieuHoc"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-[60px] w-[60px] items-center overflow-hidden rounded-full bg-white px-2 shadow-md transition-all duration-300 hover:w-[340px] hover:shadow-lg"
      >
        <img
          src="/icons/dhkhoa.png"
          alt="Đoàn - Hội Khoa"
          className="h-12 w-12 shrink-0"
        />

        <span className="ml-3 whitespace-nowrap text-sm font-medium text-gray-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Đoàn - Hội khoa {FACULTY_NAME_NORMAL}
        </span>
      </a>

      {/* CLB SV5T */}
      <a
        href="https://www.facebook.com/CLB.SV5T.GDTH"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-[60px] w-[60px] items-center overflow-hidden rounded-full bg-white px-2 shadow-md transition-all duration-300 hover:w-[280px] hover:shadow-lg"
      >
        <img
          src="/icons/clbsv5t.png"
          alt="CLB SV5T"
          className="h-12 w-12 shrink-0"
        />

        <span className="ml-3 whitespace-nowrap text-sm font-medium text-gray-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Câu lạc bộ "Sinh viên 5 tốt"
        </span>
      </a>

      {/* Group hỗ trợ Zalo */}
      <a
        href="https://zalo.me/g/g8i78lqtdfmhnkohk3cm"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-[60px] w-[60px] items-center overflow-hidden rounded-full bg-white px-2 shadow-md transition-all duration-300 hover:w-[240px] hover:shadow-lg"
      >
        <img
          src="/icons/zalo.png"
          alt="Zalo Group hỗ trợ"
          className="h-12 w-12 shrink-0"
        />

        <span className="ml-3 whitespace-nowrap text-sm font-medium text-gray-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Group hỗ trợ sinh viên
        </span>
      </a>
    </div>
  );
}