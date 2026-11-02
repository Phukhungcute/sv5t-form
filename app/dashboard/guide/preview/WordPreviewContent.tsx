"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function WordPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const title = searchParams.get("title") || "Biểu mẫu sinh viên";
  const fileUrl = searchParams.get("file") || "";

  const isValidFile =
    fileUrl.startsWith("/documents/") &&
    fileUrl.endsWith(".docx");

  const absoluteUrl =
    typeof window !== "undefined" && isValidFile
      ? `${window.location.origin}${fileUrl}`
      : "";

  const viewerUrl = absoluteUrl
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absoluteUrl)}`
    : "";

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Nút quay lại */}
        <div className="flex items-center">
          <div className="menu-btn-wrapper menu-btn-wrapper-header">
            <button
              onClick={() => router.back()}
              className="menu-btn menu-btn-white"
            >
              ← Quay lại
            </button>
          </div>
        </div>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-sv5t-blue md:text-2xl">
                XEM TRƯỚC BIỂU MẪU
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                {title}
              </p>
            </div>

            {isValidFile && (
              <a
                href={fileUrl}
                download
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sv5t-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                Tải xuống Word
              </a>
            )}
          </div>

          {isValidFile ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <iframe
                src={viewerUrl}
                title={`Xem trước: ${title}`}
                className="h-[700px] w-full md:h-[850px]"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-600">
              Đường dẫn tài liệu không hợp lệ.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}