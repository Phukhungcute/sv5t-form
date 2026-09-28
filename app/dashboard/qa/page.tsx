"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type QA = {
  id: number;
  question: string;
  answer: string;
  created_at: string;
};

export default function QAPage() {
  const router = useRouter();

  const [qaList, setQaList] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQA, setSelectedQA] = useState<QA | null>(null);

  useEffect(() => {
    async function loadQA() {
      const { data, error } = await supabase
        .from("qa")
        .select("id, question, answer, created_at")
        .order("id", { ascending: true });

      if (error) {
        console.error("LOAD QA ERROR:", error);
        setLoading(false);
        return;
      }

      setQaList(data ?? []);
      setLoading(false);
    }

    loadQA();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">

        {/* BACK */}
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

        {/* MAIN */}
        <section className="mt-4 rounded-2xl bg-white p-8 shadow-sm">

          <h1 className="text-3xl font-bold text-gray-900">
            Câu hỏi thường gặp
          </h1>

          <p className="mt-2 text-gray-500">
            Một số câu hỏi thường gặp trong quá trình sử dụng hệ thống SV5T.
          </p>

          {/* LOADING */}
          {loading && (
            <div className="mt-8 rounded-xl bg-gray-50 p-6 text-center text-gray-500">
              Đang tải câu hỏi...
            </div>
          )}

          {/* EMPTY */}
          {!loading && qaList.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              Hiện chưa có câu hỏi thường gặp.
            </div>
          )}

          {/* QA LIST */}
          {!loading && qaList.length > 0 && (
            <div className="mt-8 space-y-3">
              {qaList.map((qa) => (
                <button
                  key={qa.id}
                  type="button"
                  onClick={() => setSelectedQA(qa)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-medium text-gray-800">
                    {qa.question}
                  </span>

                  <span className="ml-4 shrink-0 text-xl text-gray-400">
                    →
                  </span>
                </button>
              ))}
            </div>
          )}

        </section>
      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {selectedQA && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedQA(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex items-start justify-between gap-4">

              <h2 className="text-xl font-bold text-gray-900">
                {selectedQA.question}
              </h2>

              <button
                type="button"
                onClick={() => setSelectedQA(null)}
                className="cursor-pointer shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>

            </div>

            {/* ANSWER */}
            <div className="mt-6 border-t border-gray-200 pt-5">

              <h3 className="mb-2 text-sm font-semibold text-gray-500">
                Trả lời
              </h3>

              <p className="whitespace-pre-line leading-7 text-gray-700">
                {selectedQA.answer}
              </p>

            </div>

            {/* CLOSE */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedQA(null)}
                className="cursor-pointer rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}