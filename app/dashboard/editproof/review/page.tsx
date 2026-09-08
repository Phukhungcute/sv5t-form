"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    FACULTY_NAME,
    FACULTY_NAME_NORMAL,
    ACADEMIC_YEAR,
    STANDARD,
    isSubmissionPeriod,
} from "@/lib/constants";
import { initializeStudentPage } from "@/lib/initializeStudentPage";

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

export default function EditSubmitReviewPage() {
  const router = useRouter();

  useEffect(() => {
  initializeStudentPage(router, "addition");
}, [router]);

  const [submission, setSubmission] =
    useState<SubmissionData | null>(null);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/");
          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("mssv, role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.error("PROFILE ERROR:", profileError);
          return;
        }

        if (profile.role !== "student") {
          router.push("/admin");
          return;
        }

        const {
          data: studentData,
          error: studentError,
        } = await supabase
          .from("students")
          .select("mssv, full_name, birth_date, gender, class_name")
          .eq("mssv", profile.mssv)
          .single();

        if (studentError || !studentData) {
          console.error("STUDENT ERROR:", studentError);
          return;
        }

        const saved = sessionStorage.getItem(
          `sv5t_edit_submission_${studentData.mssv}`
        );

        if (!saved) {
          router.push("/dashboard/editsubmit");
          return;
        }

        setSubmission(JSON.parse(saved));
        setStudent(studentData);
      } catch (error) {
        console.error("EDIT SUBMISSION REVIEW LOAD ERROR:", error);
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );
      router.push("/");
      return;
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "edit_student_form",
      {
        p_mssv: student.mssv,
        p_data: submission,
      }
    );

    if (error) {
      console.error("EDIT SUBMISSION ERROR:", error);
      alert(`Không thể lưu chỉnh sửa: ${error.message}`);
      return;
    }

    console.log("EDIT SUBMISSION CREATED, ID:", data);

    // Giữ lại logic cleanup 2 phiên bản gần nhất.
    const {
      data: latestSubmission,
      error: latestError,
    } = await supabase
      .from("submissions")
      .select("version")
      .eq("mssv", student.mssv)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error("LATEST EDIT VERSION ERROR:", latestError);
    } else if (latestSubmission) {
      await cleanupOldSubmissions(
        student.mssv,
        latestSubmission.version
      );
    }

    sessionStorage.removeItem(
      `sv5t_edit_submission_${student.mssv}`
    );

    alert("Chỉnh sửa hồ sơ thành công!");
    router.push("/dashboard");
  } catch (error) {
    console.error("CONFIRM EDIT SUBMISSION ERROR:", error);
    alert("Đã xảy ra lỗi khi xác nhận chỉnh sửa.");
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
      <div className="mx-auto max-w-4xl">

        {/* Header */}

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Xem lại hồ sơ
            </h1>

            <p className="mt-2 text-gray-600">
              Vui lòng kiểm tra toàn bộ thông tin trước khi xác nhận.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/editsubmit")}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← Chỉnh sửa
          </button>
        </div>

        {/* =====================================================
            THÔNG TIN SINH VIÊN
        ====================================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Thông tin sinh viên
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

          </div>
        </section>

        {/* =====================================================
            THÔNG TIN CHUNG
        ====================================================== */}

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

            <ReviewItem
              label={`${STANDARD.ETHIC3.CONTENT} ${STANDARD.ETHIC3.DESC}`}
              value={display(submission.ethics3)}
            />

            <ReviewItem
              label={`${STANDARD.ETHIC4.CONTENT} ${STANDARD.ETHIC4.DESC}`}
              value={display(submission.ethics4)}
            />

            <ReviewItem
              label={`${STANDARD.ETHIC5.CONTENT} ${STANDARD.ETHIC5.DESC}`}
              value={display(submission.ethics5)}
            />

            <ReviewItem
              label={`${STANDARD.ETHIC6.CONTENT} ${STANDARD.ETHIC6.DESC}`}
              value={display(submission.ethics6)}
            />

            <ReviewItem
              label={`${STANDARD.ETHIC7.CONTENT} ${STANDARD.ETHIC7.DESC}`}
              value={display(submission.ethics7)}
            />

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

            <ReviewItem
              label={`${STANDARD.STUDY2.CONTENT} ${STANDARD.STUDY2.DESC}`}
              value={display(submission.study2)}
            />

            <ReviewItem
              label={`${STANDARD.STUDY3.CONTENT} ${STANDARD.STUDY3.DESC}`}
              value={display(submission.study3)}
            />
            
            <ReviewItem
              label={`${STANDARD.STUDY4.CONTENT} ${STANDARD.STUDY4.DESC}`}
              value={display(submission.study4)}
            />

            <ReviewItem
              label={`${STANDARD.STUDY5.CONTENT} ${STANDARD.STUDY5.DESC}`}
              value={display(submission.study5)}
            />
            
            <ReviewItem
              label={`${STANDARD.STUDY6.CONTENT} ${STANDARD.STUDY6.DESC}`}
              value={display(submission.study6)}
            />
          
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
            <ReviewItem
              label={`${STANDARD.PHYSICAL1.CONTENT} ${STANDARD.PHYSICAL1.DESC}`}
              value={display(submission.physical1)}
            />

            <ReviewItem
              label={`${STANDARD.PHYSICAL2.CONTENT} ${STANDARD.PHYSICAL2.DESC}`}
              value={display(submission.physical2)}
            />

            <ReviewItem
              label={`${STANDARD.PHYSICAL3.CONTENT} ${STANDARD.PHYSICAL3.DESC}`}
              value={display(submission.physical3)}
            />

            <ReviewItem
              label={`${STANDARD.PHYSICAL4.CONTENT} ${STANDARD.PHYSICAL4.DESC}`}
              value={display(submission.physical4)}
            />
                  
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
            <ReviewItem
              label={`${STANDARD.VOLUNTEER1.CONTENT} ${STANDARD.VOLUNTEER1.DESC}`}
              value={display(submission.volunteer1)}
            />

            <ReviewItem
              label={`${STANDARD.VOLUNTEER2.CONTENT} ${STANDARD.VOLUNTEER2.DESC}`}
              value={display(submission.volunteer2)}
            />

            <ReviewItem
              label={`${STANDARD.VOLUNTEER3.CONTENT} ${STANDARD.VOLUNTEER3.DESC}`}
              value={display(submission.volunteer3)}
            />

            <ReviewItem
              label={`${STANDARD.VOLUNTEER4.CONTENT} ${STANDARD.VOLUNTEER4.DESC}`}
              value={display(submission.volunteer4)}
            />
            
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
            <ReviewItem
              label={`${STANDARD.FOREIGNLANGUAGE1.CONTENT} ${STANDARD.FOREIGNLANGUAGE1.DESC}`}
              value={display(submission.foreignLanguage1)}
            />

            <ReviewItem
              label={`${STANDARD.FOREIGNLANGUAGE2.CONTENT} ${STANDARD.FOREIGNLANGUAGE2.DESC}`}
              value={display(submission.foreignLanguage2)}
            />

            <ReviewItem
              label={`${STANDARD.FOREIGNLANGUAGE3.CONTENT} ${STANDARD.FOREIGNLANGUAGE3.DESC}`}
              value={display(submission.foreignLanguage3)}
            />

            <ReviewItem
              label={`${STANDARD.SKILL4.CONTENT} ${STANDARD.SKILL4.DESC}`}
              value={display(submission.skill4)}
            />

            <ReviewItem
              label={`${STANDARD.SKILL5.CONTENT} ${STANDARD.SKILL5.DESC}`}
              value={display(submission.skill5)}
            />

            <ReviewItem
              label={`${STANDARD.SKILL6.CONTENT} ${STANDARD.SKILL6.DESC}`}
              value={display(submission.skill6)}
            />
            
            <ReviewItem
              label={`${STANDARD.SKILL7.CONTENT} ${STANDARD.SKILL7.DESC}`}
              value={display(submission.skill7)}
            />
            
            <ReviewItem
              label={`${STANDARD.INTEGRATION8.CONTENT} ${STANDARD.INTEGRATION8.DESC}`}
              value={display(submission.integration8)}
            />
            
            <ReviewItem
              label={`${STANDARD.INTEGRATION9.CONTENT} ${STANDARD.INTEGRATION9.DESC}`}
              value={display(submission.integration9)}
            />

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
            <ReviewItem
              label={`${STANDARD.PRIORITY1.CONTENT} ${STANDARD.PRIORITY1.DESC}`}
              value={display(submission.priority1)}
            />

            <ReviewItem
              label={`${STANDARD.PRIORITY2.CONTENT} ${STANDARD.PRIORITY2.DESC}`}
              value={display(submission.priority2)}
            />

            <ReviewItem
              label={`${STANDARD.PRIORITY3.CONTENT} ${STANDARD.PRIORITY3.DESC}`}
              value={display(submission.priority3)}
            />

            <ReviewItem
              label={`${STANDARD.PRIORITY4.CONTENT} ${STANDARD.PRIORITY4.DESC}`}
              value={display(submission.priority4)}
            />

            <ReviewItem
              label={`${STANDARD.PRIORITY5.CONTENT} ${STANDARD.PRIORITY5.DESC}`}
              value={display(submission.priority5)}
            />

            <ReviewItem
              label={`${STANDARD.PRIORITY6.CONTENT} ${STANDARD.PRIORITY6.DESC}`}
              value={display(submission.priority6)}
            />
            
          </div>
        </section>

        {/* =====================================================
            XÁC NHẬN
        ====================================================== */}

        <section className="mb-8 rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

          <h2 className="text-lg font-semibold text-gray-900">
            Xác nhận chỉnh sửa hồ sơ
          </h2>

          <p className="mt-2 leading-6 text-gray-700">
            Tôi xác nhận rằng các thông tin trên là chính xác
            và chịu trách nhiệm về nội dung hồ sơ đã gửi.
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="mt-6 w-full cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
            {submitting
                ? "Đang gửi hồ sơ..."
                : "✓ Xác nhận và lưu chỉnh sửa"}
          </button>

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