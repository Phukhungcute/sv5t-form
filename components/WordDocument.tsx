"use client";

import { useRouter } from "next/navigation";

type WordDocumentProps = {
  title: string;
  fileUrl: string;
};

export default function WordDocument({
  title,
  fileUrl,
}: WordDocumentProps) {
  const router = useRouter();

  return (
    <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sv5t-blue/10 text-sv5t-blue">
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
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-sv5t-blue">
              BIỂU MẪU DÀNH CHO SINH VIÊN
            </p>

            <h3 className="text-base font-semibold leading-relaxed text-slate-800 sm:text-lg">
              {title}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Định dạng Word (.docx)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/guide/preview?title=${encodeURIComponent(title)}&file=${encodeURIComponent(fileUrl)}`
            )
          }
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-sv5t-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
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
          Tải Word
        </button>
      </div>
    </article>
  );
}