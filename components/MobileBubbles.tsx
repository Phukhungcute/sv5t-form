"use client";

export default function MobileBubbles() {
  return (
    <div className="fixed right-3 top-4 z-50 flex -translate-y-1/2 flex-row gap-3 md:hidden">
      {/* Đoàn - Hội */}
      <a
        href="https://www.facebook.com/DoanHoiKhoaGiaoDucTieuHoc"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Đoàn - Hội Khoa"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg"
      >
        <img
          src="/icons/dhkhoa.png"
          alt=""
          className="h-9 w-9 object-contain"
        />
      </a>

      {/* CLB SV5T */}
      <a
        href="https://www.facebook.com/CLB.SV5T.GDTH"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Câu lạc bộ Sinh viên 5 tốt"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg"
      >
        <img
          src="/icons/clbsv5t.png"
          alt=""
          className="h-9 w-9 object-contain"
        />
      </a>

      {/* Zalo */}
      <a
        href="https://zalo.me/g/g8i78lqtdfmhnkohk3cm"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Nhóm hỗ trợ sinh viên trên Zalo"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg"
      >
        <img
          src="/icons/zalo.png"
          alt=""
          className="h-9 w-9 object-contain"
        />
      </a>
    </div>
  );
}