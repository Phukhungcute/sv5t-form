"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { initializeStudentPage } from "@/lib/initializeStudentPage";

type Submission = {
  id: number;
  mssv: string;
  version: number;
  data: Record<string, any>;
  status: string;
  created_at: string;
};

export default function RequestPage() {
  const router = useRouter();

  useEffect(() => {
  initializeStudentPage(router, "addition");
}, [router]);

  const [loading, setLoading] =
    useState(true);

  const [reviewNote, setReviewNote] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  useEffect(() => {
    async function loadRequest() {
      try {
        /* =========================================
           1. KIỂM TRA USER
        ========================================= */

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/");
          return;
        }

        /* =========================================
           2. LẤY PROFILE
        ========================================= */

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("mssv, role")
          .eq("id", user.id)
          .single();

        if (
          profileError ||
          !profile ||
          profile.role !== "student"
        ) {
          router.replace("/");
          return;
        }

        /* =========================================
           3. LẤY THÔNG TIN SINH VIÊN
        ========================================= */

        const {
          data: student,
          error: studentError,
        } = await supabase
          .from("students")
          .select("full_name")
          .eq("mssv", profile.mssv)
          .single();

        if (studentError || !student) {
          console.error(
            "STUDENT ERROR:",
            studentError
          );
          return;
        }

        setStudentName(student.full_name);

        /* =========================================
           4. LẤY SUBMISSION MỚI NHẤT
        ========================================= */

        const {
          data: submission,
          error: submissionError,
        } = await supabase
          .from("submissions")
          .select("id, mssv, version, data, status, created_at")
          .eq("mssv", profile.mssv)
          .order("version", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (submissionError) {
          console.error(
            "SUBMISSION ERROR:",
            submissionError
          );
          return;
        }

        console.log("LATEST SUBMISSION:", submission);
        console.log(
          "REVIEW NOTE:",
          submission?.data?.review_note
        );

        const note =
          submission?.status === "consider"
            ? submission?.data?.review_note
            : null;

        if (
          typeof note === "string" &&
          note.trim()
        ) {
          setReviewNote(note.trim());
        } else {
          setReviewNote("");
        }

      } catch (error) {
        console.error(
          "LOAD REQUEST ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [router]);

  /* =============================================
     LOADING
  ============================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải...
        </p>
      </main>
    );
  }

  /* =============================================
     RENDER
  ============================================= */

  const hasNote =
    reviewNote.trim().length > 0;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Yêu cầu chỉnh sửa
          </h1>

          <p className="mt-1 text-gray-500">
            {studentName
              ? `Xin chào, ${studentName}`
              : "Theo dõi yêu cầu bổ sung hồ sơ"}
          </p>
        </div>

        {/* NỘI DUNG */}
        <section
          className={`rounded-2xl p-6 shadow-lg ${
            hasNote
              ? "border border-yellow-200 bg-yellow-50"
              : "border border-gray-200 bg-white"
          }`}
        >

          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Nhận xét từ quản trị viên
            </h2>

            {hasNote && (
              <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-800">
                Cần bổ sung/chỉnh sửa
              </span>
            )}
          </div>

          {hasNote ? (
            <div className="mt-5 rounded-xl border border-yellow-300 bg-white p-5">
              <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {reviewNote}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-sm font-medium text-gray-400">
                Không có bổ sung/nhận xét
              </p>
            </div>
          )}

        </section>

        {/* QUAY LẠI */}
        <button
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
          className="mt-5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          ← Quay lại Trang chủ
        </button>

      </div>
    </main>
  );
}