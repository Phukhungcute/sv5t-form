"use client";

import { useState } from "react";

type PdfDocumentProps = {
  title: string;
  pdfUrl: string;
};

export default function PdfDocument({
  title,
  pdfUrl,
}: PdfDocumentProps) {
  const [previewHeight, setPreviewHeight] = useState<number>(520);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const startY = event.clientY;
    const startHeight = previewHeight;
    const element = event.currentTarget;

    element.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = Math.min(
        900,
        Math.max(280, startHeight + moveEvent.clientY - startY),
      );

      setPreviewHeight(nextHeight);
    };

    const handlePointerUp = () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerUp);
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);
  };

  return (
    <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      {/* Phần thông tin tài liệu */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h6" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-600">
              VĂN BẢN HƯỚNG DẪN
            </p>

            <h3 className="text-base font-semibold leading-relaxed text-slate-800 sm:text-lg">
              {title}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Định dạng PDF · Có thể xem trực tiếp
            </p>
          </div>
        </div>

        <a
          href={pdfUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98]"
          aria-label={`Tải tài liệu ${title}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Tải PDF
        </a>
      </div>

      {/* Vùng xem trước PDF */}
        <div className="border-t border-slate-100 bg-slate-50">
          {/* Nút mở/đóng PDF */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="cursor-pointer flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
          >
            <span>{isExpanded ? "Ẩn nội dung PDF" : "Xem nội dung PDF"}</span>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Nội dung PDF */}
          {isExpanded && (
            <div className="px-3 pb-4 sm:px-5">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <iframe
                  src={`${pdfUrl}#toolbar=1&navpanes=0`}
                  title={`Xem trước PDF: ${title}`}
                  className="h-[600px] w-full"
                />
              </div>
            </div>
          )}
        </div>
    </article>
  );
}