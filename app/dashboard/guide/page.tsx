"use client";

import { useRouter } from "next/navigation";
import PdfDocument from "@/components/PdfDocument";

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
          <h1 className="text-2xl font-bold text-sv5t-blue md:text-3xl">
            HƯỚNG DẪN XÉT CHỌN
          </h1>

          <p className="mt-2 text-gray-500">
            Quy định và tiêu chí xét chọn danh hiệu Sinh viên 5 tốt.
          </p>

          {/* Hiển thị file PDF */}
          {/* Cấp trường */}
          <PdfDocument
            title='1. Quy định về tiêu chuẩn xét chọn danh hiệu "Sinh viên 5 tốt" cấp trường'
            pdfUrl="/documents/huong-dan-sv5t-truong.pdf"
          />
          {/* Cấp khoa */}
          <PdfDocument
            title='2. Quy định về bình chọn danh hiệu "Sinh viên 5 tốt" cấp khoa'
            pdfUrl="/documents/huong-dan-sv5t.pdf"
          />
        </section>
      </div>
    </main>
  );
}