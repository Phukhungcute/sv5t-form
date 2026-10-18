"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PortraitOnly() {
  const pathname = usePathname();
  const [isLandscape, setIsLandscape] = useState(false);

  // Cho phép xoay ngang tại trang admin và tất cả trang con.
  const isAdminPage =
    pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    // Không cần theo dõi hướng màn hình trên trang admin.
    if (isAdminPage) {
      setIsLandscape(false);
      return;
    }

    const media = window.matchMedia(
      "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)"
    );

    const updateOrientation = () => {
      setIsLandscape(media.matches);
    };

    updateOrientation();
    media.addEventListener("change", updateOrientation);

    return () => {
      media.removeEventListener("change", updateOrientation);
    };
  }, [isAdminPage]);

  if (isAdminPage || !isLandscape) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-sv5t-blue px-8 text-center text-white">
      <div className="mb-6 text-6xl" aria-hidden="true">
        📱
      </div>

      <h2 className="mb-3 text-2xl font-bold">
        Vui lòng xoay điện thoại
      </h2>

      <p className="max-w-sm text-base leading-relaxed">
        Hệ thống SV5T Form được tối ưu cho màn hình dọc.
        Bạn hãy xoay điện thoại về chiều dọc để tiếp tục sử dụng.
      </p>

      <div className="mt-6 animate-pulse text-3xl" aria-hidden="true">
        ↻
      </div>
    </div>
  );
}
