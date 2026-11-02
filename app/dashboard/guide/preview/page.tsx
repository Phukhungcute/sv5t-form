import { Suspense } from "react";
import WordPreviewContent from "./WordPreviewContent";

export default function WordPreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-100 p-6">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
            Đang tải tài liệu...
          </div>
        </main>
      }
    >
      <WordPreviewContent />
    </Suspense>
  );
}