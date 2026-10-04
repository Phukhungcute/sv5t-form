"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FACULTY_NAME_NORMAL,
  ACADEMIC_YEAR,
} from "@/lib/constants";
import { initializeStudentPage } from "@/lib/initializeStudentPage";
import { Success } from "@/lib/success-notification";

type Student = {
  mssv: string;
  full_name: string;
  class_name: string;
};

type Submission = {
  id: number;
  status: "passed" | "failed" | "consider" | null;
  version: number;
  is_edit: number;
  participation: boolean | null;
};

export default function ResultPage() {
  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(null);

  const displayName =
    student?.full_name ?? "[user]";

  const [submission, setSubmission] =
    useState<Submission | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [participationChoice, setParticipationChoice] =
    useState<boolean | null>(null);

  const [participationSaving, setParticipationSaving] =
    useState(false);

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
          .select(
            "mssv, full_name, class_name"
          )
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
          .select(
            "id, status, version, is_edit, participation"
          )
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

        if (latestSubmission) {
          const submissionData =
            latestSubmission as Submission;

          setSubmission(submissionData);

          // Nếu trước đó đã xác nhận thì hiển thị
          // lựa chọn cũ.
          setParticipationChoice(
            submissionData.participation
          );
        } else {
          setSubmission(null);
        }
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
     XÁC NHẬN THAM GIA LỄ TUYÊN DƯƠNG
  ========================================== */

  async function handleParticipationConfirm() {
  if (participationChoice === null) {
    alert(
      "Vui lòng chọn Được hoặc Không."
    );
    return;
  }

  if (!submission?.id) {
    return;
  }

  setParticipationSaving(true);

  try {
    const { error } = await supabase
      .from("submissions")
      .update({
        participation:
          participationChoice,
      })
      .eq("id", submission.id);

    if (error) {
      console.error(
        "PARTICIPATION UPDATE ERROR:",
        error
      );

      alert(
        "Không thể lưu lựa chọn. Vui lòng thử lại."
      );

      return;
    }

    setSubmission((current) =>
      current
        ? {
            ...current,
            participation:
              participationChoice,
          }
        : current
    );

    Success(
      participationChoice
        ? "Đã xác nhận tham gia lễ tuyên dương!"
        : "Đã xác nhận không tham gia lễ tuyên dương!"
    );
  } catch (error) {
    console.error(
      "PARTICIPATION CONFIRM ERROR:",
      error
    );

    alert(
      "Đã xảy ra lỗi. Vui lòng thử lại."
    );
  } finally {
    setParticipationSaving(false);
  }
}

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
    "bg-blue-300 text-blue-700";
  let statusBackground =
    "bg-white";

  if (status === "passed") {
    statusText = "ĐẠT";
    statusClass =
      "bg-green-300 text-green-700";
    statusBackground =
      "bg-green-100";
  }

  if (status === "failed") {
    statusText = "KHÔNG ĐẠT";
    statusClass =
      "bg-red-300 text-red-700";
    statusBackground =
      "bg-red-100";
  }

  if (status === "consider") {
    statusText = "XEM XÉT";
    statusClass =
      "bg-yellow-300 text-yellow-700";
    statusBackground =
      "bg-yellow-100";
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
            Hồ sơ của bạn cần chỉnh sửa/bổ sung
            thêm trước khi có thể đánh giá kết quả.
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

        <div
          className={`rounded-2xl ${statusBackground} p-8 shadow-sm`}
        >

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

            <div className="flex justify-start gap-32">

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
                  Mã số sinh viên
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {student.mssv}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Lớp
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {student.class_name}
                </p>
              </div>

            </div>

          </div>

          {/* MESSAGE */}

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700">

            <h2 className="font-semibold text-gray-900">
              Thông báo
            </h2>

            <div className="mt-3 leading-7">
              {renderMessage()}
            </div>

          </div>

          {/* ==========================================
              THAM GIA LỄ TUYÊN DƯƠNG
          ========================================== */}

          {status === "passed" && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">

              <p className="font-semibold text-gray-900">
                Bạn có tham gia được lễ tuyên dương không?
              </p>

              {/* OPTIONS */}

              <div className="mt-4 flex justify-evenly">

                {/* ĐƯỢC */}
                <button
                  type="button"
                  onClick={() => setParticipationChoice(true)}
                  disabled={participationSaving}
                  className={`
                    flex
                    w-28
                    cursor-pointer
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-white
                    px-4
                    py-2.5
                    text-sm
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    active:translate-y-0.5
                    hover:shadow-md
                    ${
                      participationChoice === true
                        ? "border-2 border-green-500 text-green-700"
                        : "border border-gray-200 text-gray-700"
                    }
                    ${
                      participationSaving
                        ? "cursor-not-allowed opacity-70"
                        : ""
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-4
                      w-4
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      ${
                        participationChoice === true
                          ? "border-green-500"
                          : "border-gray-400"
                      }
                    `}
                  >
                    {participationChoice === true && (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </span>

                  Được
                </button>


                {/* KHÔNG */}
                <button
                  type="button"
                  onClick={() => setParticipationChoice(false)}
                  disabled={participationSaving}
                  className={`
                    flex
                    w-28
                    cursor-pointer
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-white
                    px-4
                    py-2.5
                    text-sm
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    active:translate-y-0.5
                    hover:shadow-md
                    ${
                      participationChoice === false
                        ? "border-2 border-red-500 text-red-700"
                        : "border border-gray-200 text-gray-700"
                    }
                    ${
                      participationSaving
                        ? "cursor-not-allowed opacity-70"
                        : ""
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-4
                      w-4
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      ${
                        participationChoice === false
                          ? "border-red-500"
                          : "border-gray-400"
                      }
                    `}
                  >
                    {participationChoice === false && (
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </span>

                  Không
                </button>

              </div>


              {/* XÁC NHẬN */}

              <div className="mt-4 flex items-center justify-end">
                <div className="menu-btn-wrapper menu-btn-wrapper-footer">
                  <button
                    type="button"
                    onClick={handleParticipationConfirm}
                    disabled={
                      participationChoice === null ||
                      participationSaving
                    }
                    className={`
                      menu-btn
                      ${
                        participationChoice === null || participationSaving
                          ? "menu-btn-disabled"
                          : "menu-btn-blue"
                      }
                    `}
                  >
                    {participationSaving ? "Đang lưu..." : "Xác nhận"}
                  </button>
                </div>
              </div>


              {/* TRẠNG THÁI HIỆN TẠI */}

              {submission.participation !== null && (
                <p className="mt-3 text-right text-sm text-gray-500">
                  Lựa chọn hiện tại:{" "}
                  <strong>
                    {submission.participation
                      ? "Tham gia"
                      : "Không tham gia"}
                  </strong>
                </p>
              )}

            </div>
          )}

          {/* BACK */}

          <div className="mt-4 flex items-center justify-center">

            <div className="menu-btn-wrapper menu-btn-wrapper-footer">

              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard")
                }
                className="menu-btn menu-btn-blue"
              >
                Quay lại trang chủ
              </button>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}