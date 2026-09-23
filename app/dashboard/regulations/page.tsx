"use client";

import { useRouter } from "next/navigation";

export default function RegulationsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/dashboard")}
          className="cursor-pointer mb-6 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          ← Quay lại Dashboard
        </button>
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Quy định</h1>
          <p className="mt-2 text-gray-500">Quy định và tiêu chí xét Sinh viên 5 tốt.</p>
          <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
            Nội dung quy định sẽ được hardcode tại đây.
          </div>
        </section>
      </div>
    </main>
  );
}
