"use client";

import { FACULTY_NAME_NORMAL } from "@/lib/constants";

export default function LoginFloatingBubbles() {
  return (
    <>
      {/* Nhóm 3 bubble bên phải màn hình */}
      <div className="fixed right-4 top-1/2 z-50 flex -translate-y-1/2 flex-col items-end gap-3">
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
            className="h-11 w-11 shrink-0"
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
            className="h-11 w-11 shrink-0"
          />

          <span className="ml-3 whitespace-nowrap text-sm font-medium text-gray-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Câu lạc bộ "Sinh viên 5 tốt"
          </span>
        </a>

        {/* Nhóm Zalo */}
        <a
          href="https://zalo.me/g/g8i78lqtdfmhnkohk3cm"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex h-[60px] w-[60px] items-center overflow-hidden rounded-full bg-white px-2 shadow-md transition-all duration-300 hover:w-[240px] hover:shadow-lg"
        >
          <img
            src="/icons/zalo.png"
            alt="Zalo Group hỗ trợ"
            className="h-11 w-11 shrink-0"
          />

          <span className="ml-3 whitespace-nowrap text-sm font-medium text-gray-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Group hỗ trợ sinh viên
          </span>
        </a>
      </div>

      {/* Nút ? cố định ở góc dưới bên phải màn hình */}
      <a
        href="/dashboard/qa"
        aria-label="Câu hỏi thường gặp"
        title="Câu hỏi thường gặp"
        className="menu-btn-round menu-btn-blue fixed bottom-4 right-4 z-[60]"
      >
        ?
      </a>
    </>
  );
}