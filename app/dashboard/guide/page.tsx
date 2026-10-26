"use client";

import { useRouter } from "next/navigation";

export default function IntroductionPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-left">
          <div className="menu-btn-wrapper menu-btn-wrapper-header">
            <button
              onClick={() => router.push("/dashboard")}
              className="menu-btn menu-btn-white"
            >
              ← Quay về trang chủ
            </button>
          </div>
        </div>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Hướng dẫn xét chọn
          </h1>

          <p className="mt-2 text-gray-500">
            Quy định và tiêu chí xét chọn danh hiệu Sinh viên 5 tốt.
          </p>

          {/* Hiển thị file PDF */}
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
            <iframe
              src="/documents/huong-dan-sv5t.pdf"
              title="Quy định xét chọn   danh hiệu Sinh viên 5 tốt"
              className="h-[75vh] min-h-[500px] w-full"
            />
          </div>

          {/* Liên kết mở PDF nếu trình duyệt không hiển thị được */}
          <p className="mt-3 text-center text-sm text-gray-500">
            Nếu không xem được hết PDF,{" "}
            <a
              href="/documents/huong-dan-sv5t.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline"
            >
              nhấn vào đây để mở tài liệu
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}