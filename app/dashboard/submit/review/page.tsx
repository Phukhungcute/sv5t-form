"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    FACULTY_NAME,
    FACULTY_NAME_NORMAL,
    STANDARD,
    isSubmissionPeriod,
} from "@/lib/constants";
import { initializeStudentPage } from "@/lib/initializeStudentPage";
import { Success } from "@/lib/success-notification";
import { useReviewCriteria } from "@/lib/useReviewCriteria";
import { INTEGRATION_GROUPS } from "@/lib/review-criteria";

type SubmissionData = {
  ethnicity: string;
  phone: string;
  studentYear: string;
  position: string;
  unionDate: string;
  email: string;
  address: string;

  probationHasDate: boolean | null;
  probationDate: string;

  officialHasDate: boolean | null;
  officialDate?: string;

  [key: string]: string | boolean | null | undefined;
};

type Student = {
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  class_name: string;
};

export default function ReviewPage() {
  const router = useRouter();
  const { criteria, error: criteriaError } = useReviewCriteria();

  useEffect(() => {
  initializeStudentPage(router, "submission");
}, [router]);

  const [submission, setSubmission] =
    useState<SubmissionData | null>(null);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
  async function loadData() {
    try {
      console.log("REVIEW: bắt đầu load");

      // 1. Lấy hồ sơ tạm
      const saved = localStorage.getItem("sv5t_submission");

      if (!saved) {
        console.log("REVIEW: không có submission");
        router.push("/dashboard/submit");
        return;
      }

      const parsed = JSON.parse(saved);
      setSubmission(parsed);

      // 2. Lấy user đang đăng nhập
      console.log("REVIEW: đang lấy user...");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("REVIEW USER:", user);
      console.log("REVIEW USER ERROR:", userError);

      if (userError || !user) {
        console.error("AUTH ERROR:", userError);
        return;
      }

      // 3. Lấy profile để lấy MSSV
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("mssv, role")
        .eq("id", user.id)
        .single();

      console.log("REVIEW PROFILE:", profile);
      console.log("REVIEW PROFILE ERROR:", profileError);

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);
        return;
      }

      // 4. Kiểm tra quyền
      if (profile.role !== "student") {
        router.push("/admin");
        return;
      }

      // 5. Lấy thông tin students
      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "mssv, full_name, birth_date, gender, class_name"
        )
        .eq("mssv", profile.mssv)
        .single();

      console.log("REVIEW STUDENT:", studentData);
      console.log("REVIEW STUDENT ERROR:", studentError);

      if (studentError || !studentData) {
        console.error("STUDENT ERROR:", studentError);
        return;
      }

      setStudent(studentData);

    } catch (error) {
      console.error("REVIEW LOAD ERROR:", error);
    }
  }

  loadData();
}, [router]);

async function handleConfirm() {
  if (!submission || !student) {
    return;
  }

  try {
    setSubmitting(true);

    // ==========================================
    // 1. KIỂM TRA USER
    // ==========================================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("USER:", user);
    console.log("USER ERROR:", userError);

    if (userError || !user) {
      console.error("AUTH ERROR:", userError);

      alert(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );

      router.push("/");
      return;
    }

    // ==========================================
    // 2. LẤY VERSION HIỆN TẠI
    // ==========================================

    const {
      data: latestSubmission,
      error: latestError,
    } = await supabase
      .from("submissions")
      .select("version")
      .eq("mssv", student.mssv)
      .order("version", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error(
        "LATEST VERSION ERROR:",
        latestError
      );

      alert(
        "Không thể kiểm tra phiên bản hồ sơ."
      );

      return;
    }

    const nextVersion =
      latestSubmission?.version != null
        ? latestSubmission.version + 1
        : 1;

    console.log(
      "LATEST SUBMISSION VERSION:",
      latestSubmission?.version ?? null
    );

    console.log(
      "NEXT SUBMISSION VERSION:",
      nextVersion
    );

    // ==========================================
    // 3. SUBMIT HỒ SƠ
    // ==========================================

    const {
      data,
      error,
    } = await supabase.rpc(
      "submit_student_form",
      {
        p_mssv: student.mssv,
        p_data: submission,
      }
    );

    if (error) {
      console.error(
        "SUBMISSION ERROR:",
        error
      );

      alert(
        `Không thể gửi hồ sơ: ${error.message}`
      );

      return;
    }

    console.log(
      "SUBMISSION CREATED, ID:",
      data
    );

    // ==========================================
    // 4. XOÁ VERSION CŨ
    // ==========================================

    await cleanupOldSubmissions(
      student.mssv,
      nextVersion
    );

    // ==========================================
    // 5. XOÁ DRAFT SAU KHI INSERT THÀNH CÔNG
    // ==========================================
    /* Bỏ xoá draft
    localStorage.removeItem(
      `sv5t_draft_${student.mssv}`
    );

    localStorage.removeItem(
      `sv5t_submission_${student.mssv}`
    );
    */
    // ==========================================
    // 6. HOÀN TẤT
    // ==========================================

    Success("Chúc mừng bạn đã gửi hồ sơ thành công!");

    router.push("/dashboard");

  } catch (error) {
    console.error(
      "CONFIRM SUBMISSION ERROR:",
      error
    );

    alert(
      "Đã xảy ra lỗi khi gửi hồ sơ."
    );
  } finally {
    setSubmitting(false);
  }
}

  if (!submission) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải hồ sơ...
        </p>
      </main>
    );
  }

  function formatDate(date: string) {
    if (!date) return "Không có";

    return new Date(date).toLocaleDateString("vi-VN");
  }

  function display(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Không";
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  // Đổi YYYY-MM-DD → DD-MM-YYYY
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  return String(value);
}

async function cleanupOldSubmissions(
  mssv: string,
  latestVersion: number
) {
  const deleteBeforeVersion =
    latestVersion - 2;

  // Chưa đủ 3 version thì chưa cần xóa
  if (deleteBeforeVersion < 1) {
    return;
  }

  const { error } = await supabase
    .from("submissions")
    .delete()
    .eq("mssv", mssv)
    .lte("version", deleteBeforeVersion);

  if (error) {
    console.error(
      "CLEANUP OLD SUBMISSIONS ERROR:",
      error
    );
  }
}

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      {criteriaError && (
        <div className="mx-auto mb-4 max-w-4xl rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {criteriaError}
        </div>
      )}
      <div className="mx-auto max-w-4xl">

        {/* HEADER DESKTOP */}
        <div className="mb-8 hidden items-start justify-between md:flex">
          {/* Bên trái: Tiêu đề */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Xem lại hồ sơ
            </h1>

            <p className="mt-2 text-gray-600">
              Vui lòng kiểm tra toàn bộ thông tin trước khi xác nhận.
            </p>
          </div>

          {/* Bên phải: Nút chỉnh sửa */}
          <div className="menu-btn-wrapper menu-btn-wrapper-header">
            <button
              type="button"
              onClick={() => router.push("/dashboard/submit")}
              className="menu-btn menu-btn-white menu-btn-header"
            >
              ← Chỉnh sửa
            </button>
          </div>
        </div>

        {/* HEADER MOBILE */}
        <div className="mb-8 md:hidden">
          <div className="menu-btn-wrapper menu-btn-wrapper-header mb-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard/submit")}
              className="menu-btn menu-btn-white menu-btn-header"
            >
              ← Chỉnh sửa
            </button>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Xem lại hồ sơ
            </h1>

            <p className="mt-2 text-gray-600">
              Vui lòng kiểm tra toàn bộ thông tin trước khi xác nhận.
            </p>
          </div>
        </div>

        {/* =====================================================
            THÔNG TIN SINH VIÊN
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            1. Thông tin sinh viên
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <ReviewItem
              label="Mã số sinh viên"
              value={display(student?.mssv)}
            />

            <ReviewItem
              label="Họ và tên"
              value={student?.full_name ?? "Đang cập nhật"}
            />

            <ReviewItem
              label="Ngày sinh"
              value={
                student?.birth_date
                  ? formatDate(student.birth_date)
                  : "Đang cập nhật"
              }
            />

            <ReviewItem
              label="Giới tính"
              value={student?.gender ?? "Đang cập nhật"}
            />

            <ReviewItem
              label="Lớp"
              value={student?.class_name ?? "Đang cập nhật"}
            />

            <ReviewItem
              label="Khoa"
              value="Giáo dục Tiểu học"
            />

            <ReviewItem
              label="Chuyên ngành đào tạo"
              value="Giáo dục Tiểu học"
            />

          </div>
        </section>
        
        {/* =====================================================
            THÔNG TIN CHUNG
        ====================================================== */}

        {/*
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Thông tin chung
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <ReviewItem
              label="Dân tộc"
              value={display(submission.ethnicity)}
            />

            <ReviewItem
              label="Số điện thoại"
              value={display(submission.phone)}
            />

            <ReviewItem
              label="Sinh viên năm thứ"
              value={display(submission.studentYear)}
            />

            <ReviewItem
              label="Chức vụ"
              value={display(submission.position)}
            />

            <ReviewItem
              label="Ngày vào Đoàn"
              value={display(submission.youthunionDate)}
            />

            <ReviewItem
              label="Ngày vào Hội"
              value={display(submission.unionDate)}
            />

            <div>
            <label className="text-sm text-gray-500 nhưng nhạt hơn mt-1">
                Ngày vào Đảng (Nếu có)
            </label>

                <div className="flex gap-8">
                <ReviewItem
                label="a/ Dự bị"
                value={display(submission.probationDate)}
                />

                <ReviewItem
                label="b/ Chính thức"
                value={display(submission.officialDate)}
                />
                </div>
            
            </div>

            <ReviewItem
              label="Email"
              value={display(submission.email)}
            />

            <div className="md:col-span-2">
              <ReviewItem
                label="Địa chỉ"
                value={display(submission.address)}
              />
            </div>

          </div>
        </section>
*/}

        {/* =====================================================
            ĐẠO ĐỨC TỐT
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            2. Đạo đức tốt
          </h2>

          <div className="space-y-5">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Tiêu chuẩn bắt buộc
          </h2>

            <ReviewItem
              label={`${STANDARD.CONDUCTSCORE.CONTENT} ${STANDARD.CONDUCTSCORE.DESC}`}
              value={display(submission.conductScore)}
            />

            <ReviewItem
              label={`${STANDARD.UNIONEVALUATION.CONTENT} ${STANDARD.UNIONEVALUATION.DESC}`}
              value={display(submission.unionEvaluation)}
            />

          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Tiêu chuẩn khác
          </h2>

            {criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "ethics" &&
                  (criterion.is_active ||
                    submission[criterion.criterion_key] !== undefined),
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <ReviewItem
                  key={criterion.id}
                  label={`${criterion.sort_order + 1}. ${criterion.content} ${criterion.description ?? ""}`}
                  value={display(submission[criterion.criterion_key])}
                />
              ))}
          </div>
        </section>

        {/* =====================================================
            HỌC TẬP TỐT
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            3. Học tập tốt
          </h2>

          <div className="space-y-5">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Tiêu chuẩn bắt buộc
          </h2>

            <ReviewItem
              label={`${STANDARD.GPA.CONTENT} ${STANDARD.GPA.DESC}`}
              value={display(submission.gpa)}
            />

          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Tiêu chuẩn khác
          </h2>

            {criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "study" &&
                  (criterion.is_active ||
                    submission[criterion.criterion_key] !== undefined),
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <ReviewItem
                  key={criterion.id}
                  label={`${criterion.sort_order + 1}. ${criterion.content} ${criterion.description ?? ""}`}
                  value={display(submission[criterion.criterion_key])}
                />
              ))}
          </div>
        </section>

        {/* =====================================================
            THỂ LỰC TỐT
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            4. Thể lực tốt
          </h2>

          <div className="space-y-5">
            {criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "physical" &&
                  (criterion.is_active ||
                    submission[criterion.criterion_key] !== undefined),
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <ReviewItem
                  key={criterion.id}
                  label={`${criterion.sort_order + 1}. ${criterion.content} ${criterion.description ?? ""}`}
                  value={display(submission[criterion.criterion_key])}
                />
              ))}
          </div>
        </section>

        {/* =====================================================
            TÌNH NGUYỆN TỐT
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            5. Tình nguyện tốt
          </h2>

          <div className="space-y-5">
            {criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "volunteer" &&
                  (criterion.is_active ||
                    submission[criterion.criterion_key] !== undefined),
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <ReviewItem
                  key={criterion.id}
                  label={`${criterion.sort_order + 1}. ${criterion.content} ${criterion.description ?? ""}`}
                  value={display(submission[criterion.criterion_key])}
                />
              ))}
          </div>
        </section>

        {/* =====================================================
            HỘI NHẬP TỐT
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            6. Hội nhập tốt
          </h2>

          <div className="space-y-5">
            {INTEGRATION_GROUPS.map((group) => {
              const groupCriteria = criteria
                .filter(
                  (criterion) =>
                    criterion.section_key === "integration" &&
                    criterion.integration_group === group.key &&
                    (criterion.is_active ||
                      submission[criterion.criterion_key] !== undefined),
                )
                .sort((a, b) => a.sort_order - b.sort_order);

              if (groupCriteria.length === 0) return null;

              return (
                <div key={group.key} className="space-y-4">
                  <h3 className="font-semibold text-gray-800">
                    {group.label}
                  </h3>
                  {groupCriteria.map((criterion) => (
                    <ReviewItem
                      key={criterion.id}
                      label={`${criterion.sort_order + 1}. ${criterion.content} ${criterion.description ?? ""}`}
                      value={display(submission[criterion.criterion_key])}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            TIÊU CHUẨN ƯU TIÊN
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            7. Tiêu chuẩn ưu tiên
          </h2>

          <div className="space-y-5">
            {criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "priority" &&
                  (criterion.is_active ||
                    submission[criterion.criterion_key] !== undefined),
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <ReviewItem
                  key={criterion.id}
                  label={`${criterion.sort_order + 1}. ${criterion.content} ${criterion.description ?? ""}`}
                  value={display(submission[criterion.criterion_key])}
                />
              ))}
          </div>
        </section>

        {/* =====================================================
            XÁC NHẬN
        ====================================================== */}

        <section className="mb-8 rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

          <h2 className="text-lg font-semibold text-gray-900">
            Xác nhận hồ sơ
          </h2>

          <p className="mt-2 leading-6 text-gray-700">
            Tôi xác nhận rằng các thông tin trên là chính xác
            và chịu trách nhiệm về nội dung hồ sơ đã gửi.
          </p>
          
          <div className="menu-btn-wrapper menu-btn-wrapper-footer">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="menu-btn menu-btn-blue"
            >
            {submitting
                ? "Đang gửi hồ sơ..."
                : "✓ Xác nhận và gửi hồ sơ"}
          </button>
          </div>

        </section>

      </div>
    </main>
  );
}

/* =========================================================
   COMPONENT HIỂN THỊ MỘT TRƯỜNG
========================================================= */

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
    <label className="text-sm text-gray-500 nhưng nhạt hơn mt-1">
        {label}
    </label>

    <p className="whitespace-pre-wrap break-words font-medium text-gray-900">
        {value}
    </p>
    </div>
  );
}