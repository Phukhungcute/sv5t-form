"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { initializeStudentPage } from "@/lib/initializeStudentPage";

type Student = {
  mssv: string;
  full_name: string;
};

type Submission = {
  status: "passed" | "failed" | "consider" | null;
  version: number;
  is_edit: number;
};

export default function ResultPage() {
  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(null);

    const displayName = student?.full_name ?? "[user]";

  const [submission, setSubmission] =
    useState<Submission | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
  initializeStudentPage(
    router,
    "result"
  );
}, [router]);

  useEffect(() => {
    async function loadResult() {
      try {
        /* ==========================================
           1. LẤY USER
        ========================================== */

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/");
          return;
        }

        /* ==========================================
           2. LẤY PROFILE
        ========================================== */

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("mssv, role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.error(
            "PROFILE ERROR:",
            profileError
          );
          router.replace("/");
          return;
        }

        if (profile.role !== "student") {
          router.replace("/admin");
          return;
        }

        /* ==========================================
           3. LẤY THÔNG TIN SINH VIÊN
        ========================================== */

        const {
          data: studentData,
          error: studentError,
        } = await supabase
          .from("students")
          .select("mssv, full_name")
          .eq("mssv", profile.mssv)
          .single();

        if (
          studentError ||
          !studentData
        ) {
          console.error(
            "STUDENT ERROR:",
            studentError
          );
          return;
        }

        setStudent(studentData);

        /* ==========================================
           4. LẤY SUBMISSION MỚI NHẤT
        ========================================== */

        const {
          data: latestSubmission,
          error: submissionError,
        } = await supabase
          .from("submissions")
          .select("status, version, is_edit")
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

        setSubmission(
          latestSubmission
            ? (latestSubmission as Submission)
            : null
        );

      } catch (error) {
        console.error(
          "RESULT LOAD ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [router]);

  /* ==========================================
     LOADING
  ========================================== */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải kết quả...
        </p>
      </main>
    );
  }

  /* ==========================================
     CHƯA CÓ HỒ SƠ
  ========================================== */

  if (!student || !submission) {
    return (
      <main className="min-h-screen bg-gray-100 px-4 py-10">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

            <h1 className="text-2xl font-bold text-gray-900">
              KẾT QUẢ XÉT DUYỆT HỒ SƠ
            </h1>

            <p className="mt-4 text-gray-500">
              Bạn chưa có hồ sơ được gửi lên hệ thống.
            </p>

          </div>

        </div>
      </main>
    );
  }

  /* ==========================================
     XÁC ĐỊNH TRẠNG THÁI
  ========================================== */

  const status = submission.status;

  let statusText = "ĐÃ NỘP";
  let statusClass =
    "bg-blue-100 text-blue-700";

  if (status === "passed") {
    statusText = "ĐẠT";
    statusClass =
      "bg-green-100 text-green-700";
  }

  if (status === "failed") {
    statusText = "KHÔNG ĐẠT";
    statusClass =
      "bg-red-100 text-red-700";
  }

  if (status === "consider") {
    statusText = "XEM XÉT";
    statusClass =
      "bg-yellow-100 text-yellow-700";
  }

  /* ==========================================
     MESSAGE
  ========================================== */

  function renderMessage() {
    if (status === "passed") {
      return (
        <>
          <p>
            Chúc mừng{" "}
            <strong>
              {displayName}
            </strong>{" "}
            đã xuất sắc đạt danh hiệu
            “Sinh viên 5 tốt”! 🎉
          </p>

          <p className="mt-3">
            Ban xét duyệt ghi nhận những
            nỗ lực và thành tích của bạn
            trong quá trình xét chọn.
          </p>
        </>
      );
    }

    if (status === "failed") {
      return (
        <>
          <p>
            Rất tiếc,{" "}
            <strong>
              {displayName}
            </strong>{" "}
            chưa đạt yêu cầu để được công
            nhận danh hiệu “Sinh viên 5 tốt”
            trong đợt xét duyệt này.
          </p>

          <p className="mt-3">
            Bạn có thể tiếp tục cố gắng và
            hoàn thiện các tiêu chí trong
            những đợt xét duyệt tiếp theo.
          </p>
        </>
      );
    }

    if (status === "consider") {
      return (
        <>
          <p>
            Chào{" "}
            <strong>
              {displayName}
            </strong>
            ,
          </p>

          <p className="mt-3">
            Hồ sơ của bạn cần chỉnh sửa/bổ sung thêm trước khi có thể đánh giá kết quả.
          </p>
        </>
      );
    }

    return (
      <>
        <p>
          Hồ sơ của{" "}
          <strong>
            {displayName}
          </strong>{" "}
          đã được gửi thành công.
        </p>

        <p className="mt-3">
          Hiện hồ sơ đang chờ được xét duyệt.
          Vui lòng quay lại sau để kiểm tra
          kết quả.
        </p>
      </>
    );
  }

  /* ==========================================
     UI
  ========================================== */

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">

        <div className="rounded-2xl bg-white p-8 shadow-sm">

          {/* TITLE */}

          <div className="text-center">

            <h1 className="text-2xl font-bold text-gray-900">
              KẾT QUẢ XÉT DUYỆT HỒ SƠ
            </h1>

            <div className="mt-5">
              <span
                className={`inline-flex rounded-full px-5 py-2 text-sm font-bold ${statusClass}`}
              >
                {statusText}
              </span>
            </div>

          </div>

          {/* STUDENT INFO */}

          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <div>
                <p className="text-sm text-gray-500">
                  Họ và tên
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {student.full_name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  MSSV
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {student.mssv}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Phiên bản hồ sơ
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {`v${submission.version}${submission.is_edit ? "*" : ""}`}
                </p>
              </div>

            </div>

          </div>

          {/* MESSAGE */}

          <div className="mt-6 rounded-xl border border-gray-200 p-6 text-gray-700">

            <h2 className="font-semibold text-gray-900">
              Thông báo
            </h2>

            <div className="mt-3 leading-7">
              {renderMessage()}
            </div>

          </div>

          {/* BACK */}

          <div className="mt-6 text-center">

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              Quay lại Dashboard
            </button>

          </div>

        </div>

      </div>
    </main>
  );
}