"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STANDARD , FACULTY_NAME_NORMAL } from "@/lib/constants";

type Student = {
  id: number;
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  class_name: string;
};

type Submission = {
  id: number;
  mssv: string;
  version: number;
  data: Record<string, any>;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_edit: boolean
};

type Proof = {
  id: number;
  mssv: string;
  version: number;
  file_path: string;
  status: string;
  created_at: string;
};

type EditProof = {
  id: number;
  mssv: string;
  version: number;
  base_version: number;
  file_path: string;
  status: string;
  created_at: string;
};

type StudentSubmission = {
  student: Student;
  submission: Submission | null;
  proof: Proof | null;
  proofEdit: EditProof | null;
};

type ReviewStatus = "passed" | "failed" | "consider" | null;

const SUBMISSION_FIELD_ORDER = [
  // =====================================================
  // BƯỚC 1 — THÔNG TIN CHUNG
  // =====================================================
  "fullName",
  "studentId",
  "gender",
  "birthDate",
  "ethnicity",
  "major",
  "className",
  "faculty",
  "phone",
  "studentYear",
  "position",
  "unionDate",
  "unionHasDate",
  "probationHasDate",
  "probationDate",
  "officialHasDate",
  "officialDate",
  "email",
  "address",

  // =====================================================
  // BƯỚC 2 — ĐẠO ĐỨC TỐT
  // =====================================================
  "conductScore",
  "unionEvaluation",
  "ethics3",
  "ethics4",
  "ethics5",
  "ethics6",
  "ethics7",

  // =====================================================
  // BƯỚC 3 — HỌC TẬP TỐT
  // =====================================================
  "gpa",
  "study2",
  "study3",
  "study4",
  "study5",
  "study6",

  // =====================================================
  // BƯỚC 4 — THỂ LỰC TỐT
  // =====================================================
  "physical1",
  "physical2",
  "physical3",
  "physical4",

  // =====================================================
  // BƯỚC 5 — TÌNH NGUYỆN TỐT
  // =====================================================
  "volunteer1",
  "volunteer2",
  "volunteer3",
  "volunteer4",

  // =====================================================
  // BƯỚC 6 — HỘI NHẬP TỐT
  // =====================================================
  "foreignLanguage1",
  "foreignLanguage2",
  "foreignLanguage3",
  "skill4",
  "skill5",
  "skill6",
  "skill7",
  "integration8",
  "integration9",

  // =====================================================
  // BƯỚC 7 — TIÊU CHUẨN ƯU TIÊN
  // =====================================================
  "priority1",
  "priority2",
  "priority3",
  "priority4",
  "priority5",
  "priority6",
];

function getSubmissionFieldOrder(key: string) {
  const normalizedKey = key
    .replace(/[_-]/g, "")
    .toLowerCase();

  const index = SUBMISSION_FIELD_ORDER.findIndex(
    (field) =>
      field
        .replace(/[_-]/g, "")
        .toLowerCase() === normalizedKey
  );

  return index === -1 ? 9999 : index;
}

/* =====================================================
   CONFIG
===================================================== */

// Nếu bucket Storage của bạn có tên khác thì đổi ở đây.
const PROOF_BUCKET = "proofs";

function ReviewField({
  label,
  description,
  value,
}: {
  label: string;
  description?: string;
  value: unknown;
}) {
  let displayValue: string;

  if (value === null || value === undefined || value === "") {
    displayValue = "Không có";
  } else if (typeof value === "object") {
    displayValue = JSON.stringify(value, null, 2);
  } else {
    displayValue = String(value);
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="mb-2 text-sm font-medium leading-6 text-gray-700">
        {label}

        {description && (
          <span className="ml-1 text-sm font-normal text-gray-500">
            {description}
          </span>
        )}
      </p>

      <p className="whitespace-pre-wrap break-words text-gray-800">
        {displayValue}
      </p>
    </div>
  );
}

/* =====================================================
   COMPONENT
===================================================== */

export default function SubmissionsPage() {
  const router = useRouter();

  const [adminName, setAdminName] =
    useState("Quản trị viên");

  const [loading, setLoading] =
    useState(true);

  const [students, setStudents] =
    useState<StudentSubmission[]>([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<ReviewStatus | "all">("all");

  const [selected, setSelected] =
    useState<StudentSubmission | null>(null);

  const [reviewStatus, setReviewStatus] =
    useState<ReviewStatus>(null);

  const [reviewNote, setReviewNote] =
    useState("");

  const [latestReviewNote, setLatestReviewNote] =
  useState("");

  const [saving, setSaving] =
    useState(false);

  // Dữ liệu hồ sơ nằm trong cột JSONB `submissions.data`.
  const data = selected?.submission?.data ?? {};

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    async function loadData() {
    try {
      // ==========================================
      // 1. KIỂM TRA USER
      // ==========================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("AUTH ERROR:", userError);
        router.push("/");
        return;
      }

      // ==========================================
      // 2. KIỂM TRA ADMIN
      // ==========================================

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);
        router.push("/");
        return;
      }

      if (profile.role !== "admin") {
        router.push("/");
        return;
      }

      // ==========================================
      // 3. LẤY SINH VIÊN
      // ==========================================

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "id, mssv, full_name, birth_date, gender, class_name"
        );

        console.log("=== STUDENTS ===");
        console.log("DATA:", studentData);
        console.log("ERROR:", studentError);

      if (studentError) {
        console.error("STUDENT ERROR:", studentError);
        return;
      }

      // ==========================================
      // 4. LẤY SUBMISSION
      // ==========================================

      const {
        data: submissionData,
        error: submissionError,
      } = await supabase
        .from("submissions")
        .select(
          "id, mssv, version, data, status, created_at, reviewed_at, reviewed_by, is_edit"
        )
        .order("version", {
          ascending: false,
        });

        console.log("=== SUBMISSIONS ===");
        console.log("DATA:", submissionData);
        console.log("ERROR:", submissionError);

      if (submissionError) {
        console.error(
          "SUBMISSION ERROR:",
          submissionError
        );
        return;
      }

      // ==========================================
      // 5a. LẤY PROOF
      // ==========================================

      const {
        data: proofData,
        error: proofError,
      } = await supabase
        .from("proofs")
        .select(
          "id, mssv, version, file_path, status, created_at"
        )
        .order("version", {
          ascending: false,
        });

        console.log("=== PROOFS ===");
        console.log("DATA:", proofData);
        console.log("ERROR:", proofError);

      // ==========================================
      // 5b. LẤY PROOF EDIT
      // ==========================================

      const {
        data: editProofData,
        error: editProofError,
      } = await supabase
        .from("edit_proofs")
        .select(
          "id, mssv, version, base_version, file_path, status, created_at"
        )
        .order("version", {
          ascending: false,
        });

      console.log("=== EDIT PROOFS ===");
      console.log("DATA:", editProofData);
      console.log("ERROR:", editProofError);

      if (editProofError) {
        console.error(
          "EDIT PROOF ERROR:",
          editProofError
        );
      }

      // ==========================================
      // 6. LẤY BẢN SUBMISSION / PROOF MỚI NHẤT
      // ==========================================

      const latestSubmissions = new Map<
        string,
        Submission
      >();

      for (const submission of submissionData ?? []) {
        if (!latestSubmissions.has(submission.mssv)) {
          latestSubmissions.set(
            submission.mssv,
            submission as Submission
          );
        }
      }

      const latestProofs = new Map<
        string,
        Proof
      >();

      for (const proof of proofData ?? []) {
        if (!latestProofs.has(proof.mssv)) {
          latestProofs.set(
            proof.mssv,
            proof as Proof
          );
        }
      }

      const latestEditProofs = new Map<
        string,
        EditProof
      >();

      for (const editProof of editProofData ?? []) {
        if (!latestEditProofs.has(editProof.mssv)) {
          latestEditProofs.set(
            editProof.mssv,
            editProof as EditProof
          );
        }
      }


      // ==========================================
      // 7. GỘP THÀNH StudentSubmission
      // ==========================================

      const rows: StudentSubmission[] = (
        studentData ?? []
      ).map((student) => ({
        student: student as Student,

        submission:
          latestSubmissions.get(
            student.mssv
          ) ?? null,

        proof:
          latestProofs.get(
            student.mssv
          ) ?? null,

        proofEdit:
          latestEditProofs.get(
            student.mssv
          ) ?? null,
      }));


      // ==========================================
      // 8. ƯU TIÊN SUBMITTED → MSSV
      // ==========================================

      rows.sort((a, b) => {
        const aSubmitted =
          a.submission !== null;

        const bSubmitted =
          b.submission !== null;

        // Đã submit lên trước
        if (
          aSubmitted !== bSubmitted
        ) {
          return aSubmitted ? -1 : 1;
        }

        // Sau đó sắp xếp theo MSSV
        return a.student.mssv.localeCompare(
          b.student.mssv,
          undefined,
          {
            numeric: true,
          }
        );
      });

      setStudents(rows);

    } catch (error) {
      console.error(
        "LOAD SUBMISSIONS ERROR:",
        error
      );

    
    } finally {
      // QUAN TRỌNG:
      // dù query thành công, lỗi hay return
      // thì loading cũng phải kết thúc
      setLoading(false);
    }
  }

  loadData();
  }, [router]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredStudents = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return students.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.student.mssv
          .toLowerCase()
          .includes(keyword) ||
        item.student.full_name
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        item.submission?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  /* =====================================================
     OPEN STUDENT
  ===================================================== */

  function openStudent(
  item: StudentSubmission
) {
  setSelected(item);

  const status =
    item.submission?.status ?? null;

  setReviewStatus(
    status === "passed" ||
    status === "failed" ||
    status === "consider"
      ? status
      : null
  );

  // Lấy nhận xét mới nhất trực tiếp từ database
  setReviewNote(
    item.submission?.data?.review_note ?? ""
  );
}

  /* =====================================================
     CLOSE STUDENT
  ===================================================== */

  function closeStudent() {
    if (saving) return;

    setSelected(null);
    setReviewStatus(null);
    setReviewNote("");
  }

  /* =====================================================
     PDF
  ===================================================== */

  async function openPDF(filePath: string) {
    try {
      let path = filePath.trim();

      // Nếu DB lưu "/proofs/..." hoặc "proofs/..."
      // thì bỏ phần bucket ra.
      if (path.startsWith("/")) {
        path = path.slice(1);
      }

      if (path.startsWith(`${PROOF_BUCKET}/`)) {
        path = path.slice(
          PROOF_BUCKET.length + 1
        );
      }

      console.log("PDF FILE PATH:", path);

      const {
        data,
        error,
      } = await supabase.storage
        .from(PROOF_BUCKET)
        .createSignedUrl(
          path,
          60 * 60
        );

      if (error) {
        console.error(
          "PDF URL ERROR:",
          error
        );

        alert(
          "Không thể mở file PDF."
        );

        return;
      }

      if (!data?.signedUrl) {
        alert(
          "Không tạo được đường dẫn PDF."
        );
        return;
      }

      window.open(
        data.signedUrl,
        "_blank"
      );
    } catch (error) {
      console.error(
        "PDF ERROR:",
        error
      );

      alert(
        "Không thể mở file PDF."
      );
    }
  }

  /* =====================================================
     CONFIRM REVIEW
  ===================================================== */

  async function confirmReview() {
    if (!selected?.submission) {
      return;
    }
    
    if (
      reviewStatus === "consider" &&
      !reviewNote.trim()
    ) {
      alert(
        "Vui lòng nhập nội dung cần sinh viên bổ sung."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      /*
        Khi XEM XÉT:
        status = consider
        data.review_note = nội dung cần bổ sung

        Khi ĐẠT / KHÔNG ĐẠT:
        status tương ứng
      */

      const currentData =
        selected.submission.data ?? {};

      const updatedData = {
        ...currentData,

        // Chỉ cập nhật nhận xét khi đang XEM XÉT.
        // Nếu ĐẠT / KHÔNG ĐẠT thì giữ nguyên nhận xét cũ.
        ...(reviewStatus === "consider"
          ? {
              review_note: reviewNote.trim(),
            }
          : {}),
      };

      const {
        data,
        error,
      } = await supabase
        .from("submissions")
        .update({
          status: reviewStatus,
          data: updatedData,
          reviewed_at:
            new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq(
          "id",
          selected.submission.id
        )
        .select()
        .single();

      if (error) {
        console.error(
          "REVIEW UPDATE ERROR:",
          error
        );

        alert(
          "Không thể xác nhận đánh giá."
        );

        return;
      }

      /* -----------------------------------------------
         UPDATE UI
      ----------------------------------------------- */

      const updatedSubmission =
        data as Submission;

      setStudents((prev) =>
        prev.map((item) => {
          if (
            item.student.mssv !==
            selected.student.mssv
          ) {
            return item;
          }

          return {
            ...item,
            submission:
              updatedSubmission,
          };
        })
      );

      setSelected((prev) =>
        prev
          ? {
              ...prev,
              submission:
                updatedSubmission,
            }
          : prev
      );

      alert("Đã xác nhận đánh giá.");

      // Đóng popup
      setSelected(null);
      setReviewStatus(null);
    } catch (error) {
      console.error(
        "CONFIRM REVIEW ERROR:",
        error
      );

      alert(
        "Đã xảy ra lỗi khi xác nhận."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     STATUS
  ===================================================== */

  function getStatusLabel(
    submission: Submission | null
  ) {
    if (!submission) {
      return {
        text: "CHƯA NỘP",
        className:
          "bg-gray-100 text-gray-500",
      };
    }

    switch (submission.status) {
      case "passed":
        return {
          text: "ĐẠT",
          className:
            "bg-green-100 text-green-700",
        };

      case "failed":
        return {
          text: "KHÔNG ĐẠT",
          className:
            "bg-red-100 text-red-700",
        };

      case "consider":
        return {
          text: "XEM XÉT",
          className:
            "bg-yellow-100 text-yellow-700",
        };

      default:
        return {
          text: "ĐÃ NỘP",
          className:
            "bg-blue-100 text-blue-700",
        };
    }
  }

  /* =====================================================
     RENDER JSON DATA
  ===================================================== */

  function renderValue(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Chưa có";
  }

  if (typeof value === "string") {
    // Các field ngày tháng
    if (
      /^\d{4}-\d{2}-\d{2}/.test(value)
    ) {
      return formatDateInput(value);
    }

    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

  function getFieldLabel(key: string) {
  const normalizedKey = key
    .replace(/[_-]/g, "")
    .toLowerCase();

  const standardMap: Record<string, string> = {
    conductscore: STANDARD.CONDUCTSCORE.CONTENT,
    unionevaluation: STANDARD.UNIONEVALUATION.CONTENT,

    ethics3: STANDARD.ETHIC3.CONTENT,
    ethics4: STANDARD.ETHIC4.CONTENT,
    ethics5: STANDARD.ETHIC5.CONTENT,
    ethics6: STANDARD.ETHIC6.CONTENT,
    ethics7: STANDARD.ETHIC7.CONTENT,

    gpa: STANDARD.GPA.CONTENT,
    study2: STANDARD.STUDY2.CONTENT,
    study3: STANDARD.STUDY3.CONTENT,
    study4: STANDARD.STUDY4.CONTENT,
    study5: STANDARD.STUDY5.CONTENT,
    study6: STANDARD.STUDY6.CONTENT,

    physical1: STANDARD.PHYSICAL1.CONTENT,
    physical2: STANDARD.PHYSICAL2.CONTENT,
    physical3: STANDARD.PHYSICAL3.CONTENT,
    physical4: STANDARD.PHYSICAL4.CONTENT,

    volunteer1: STANDARD.VOLUNTEER1.CONTENT,
    volunteer2: STANDARD.VOLUNTEER2.CONTENT,
    volunteer3: STANDARD.VOLUNTEER3.CONTENT,
    volunteer4: STANDARD.VOLUNTEER4.CONTENT,

    foreignlanguage1:
      STANDARD.FOREIGNLANGUAGE1.CONTENT,
    foreignlanguage2:
      STANDARD.FOREIGNLANGUAGE2.CONTENT,
    foreignlanguage3:
      STANDARD.FOREIGNLANGUAGE3.CONTENT,

    skill4: STANDARD.SKILL4.CONTENT,
    skill5: STANDARD.SKILL5.CONTENT,
    skill6: STANDARD.SKILL6.CONTENT,
    skill7: STANDARD.SKILL7.CONTENT,

    integration8:
      STANDARD.INTEGRATION8.CONTENT,
    integration9:
      STANDARD.INTEGRATION9.CONTENT,

    priority1: STANDARD.PRIORITY1.CONTENT,
    priority2: STANDARD.PRIORITY2.CONTENT,
    priority3: STANDARD.PRIORITY3.CONTENT,
    priority4: STANDARD.PRIORITY4.CONTENT,
    priority5: STANDARD.PRIORITY5.CONTENT,
    priority6: STANDARD.PRIORITY6.CONTENT,
  };

  if (standardMap[normalizedKey]) {
    return standardMap[normalizedKey];
  }

  const generalMap: Record<string, string> = {
    fullname: "Họ và tên",
    studentid: "Mã số sinh viên",
    mssv: "Mã số sinh viên",
    gender: "Giới tính",
    birthdate: "Ngày sinh",
    ethnicity: "Dân tộc",
    major: "Chuyên ngành đào tạo",
    classname: "Lớp",
    faculty: "Khoa",
    phone: "Số điện thoại",
    studentyear: "Sinh viên năm thứ",
    position: "Chức vụ (Đoàn - Hội)",
    uniondate: "Ngày vào Hội / Ngày vào Đoàn",
    unionhasdate: "Ngày vào Đoàn",
    probationhasdate: "Đảng viên dự bị",
    probationdate: "Ngày vào Đảng — Dự bị",
    officialhasdate: "Đảng viên chính thức",
    officialdate: "Ngày vào Đảng — Chính thức",
    email: "Email",
    address: "Địa chỉ liên lạc",
  };

  return (
    generalMap[normalizedKey] ??
    key
  );
}

  function getStandardLabel(key: string) {
  const normalizedKey = key
    .replace(/[_-]/g, "")
    .toLowerCase();

  for (const [standardKey, standard] of Object.entries(STANDARD)) {
    if (
      standardKey
        .replace(/[_-]/g, "")
        .toLowerCase() === normalizedKey
    ) {
      return standard.CONTENT;
    }
  }

  return null;
}

function formatDateInput(
  dateString: string | null | undefined
) {
  if (!dateString) return "Chưa có";

  const date = dateString.slice(0, 10);

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}/${month}/${year}`;
}

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải...
        </p>
      </main>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-7xl">

        {/* ============================================
            HEADER
        ============================================ */}

        <header className="mb-8 flex items-center justify-between">

          <div>
            <button
              onClick={() =>
                router.push("/admin")
              }
              className="mb-5 cursor-pointer text-sm text-blue-600 hover:underline"
            >
              ← Quay lại trang quản trị
            </button>

            <h1 className="text-3xl font-bold text-gray-900">
              Duyệt hồ sơ
            </h1>

            <p className="mt-1 text-gray-500">
              Danh sách hồ sơ Sinh viên 5 Tốt
            </p>
          </div>

          <div className="flex items-center gap-4">

            <div className="text-right">
              <p className="font-medium text-gray-800">
                {adminName}
              </p>

              <p className="text-sm text-gray-500">
                Quản trị viên
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Đăng xuất
            </button>

          </div>

        </header>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <span className="text-2xl font-bold text-gray-900">
            Lọc:
          </span>
          
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`w-[120px] cursor-pointer rounded-lg px-4 py-2 ml-2 text-sm font-medium transition ${
              statusFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            TẤT CẢ
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("passed")}
            className={`w-[120px] cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
              statusFilter === "passed"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ĐẠT
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("failed")}
            className={`w-[120px] cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
              statusFilter === "failed"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            KHÔNG ĐẠT
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("consider")}
            className={`w-[120px] cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
              statusFilter === "consider"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            XEM XÉT
          </button>
        </div>

        {/* ============================================
            SEARCH
        ============================================ */}

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Tìm theo MSSV hoặc họ tên..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </section>

        {/* ============================================
            LIST
        ============================================ */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">

          {/* HEADER */}
          <div className="grid grid-cols-[180px_150px_180px_110px_130px_150px_150px_150px] items-center border-b bg-gray-50 px-6 py-4 text-sm font-semibold text-gray-700">

            <div>MSSV</div>
            <div>Họ và tên</div>
            <div className="text-center">Trạng thái</div>
            <div className="text-center">
              <div>Version</div>
              <div>(Hồ sơ)</div>
            </div>
            <div className="text-center">
              <div>Version</div>
              <div>(Minh chứng)</div>
            </div>
            <div className="text-center">
              <div>Version</div>
              <div>(Minh chứng - edited)</div>
            </div>
            <div className="text-center">PDF</div>
            <div className="text-center">
              <div>PDF</div>
              <div>(edited)</div>
            </div>
          </div>

          {/* BODY */}
          {filteredStudents.length === 0 ? (
            <div className="px-6 py-14 text-center text-gray-500">
              Không tìm thấy sinh viên.
            </div>
          ) : (
            filteredStudents.map((item) => {

              const status =
                getStatusLabel(item.submission);

              return (
                <div
                  key={item.student.mssv}
                  onClick={() =>
                    openStudent(item)
                  }
                  className="grid grid-cols-[180px_150px_180px_110px_130px_150px_150px_150px] items-center border-b bg-gray-50 px-6 py-4 text-sm font-semibold text-gray-700"
                >

                  {/* MSSV */}
                  <div className="font-medium text-gray-800">
                    {item.student.mssv}
                  </div>

                  {/* HỌ VÀ TÊN */}
                  <div>
                    <p className="font-medium text-gray-800">
                      {item.student.full_name}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {item.student.class_name}
                    </p>
                  </div>

                  {/* TRẠNG THÁI */}
                  <div className="text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                    >
                      {status.text}
                    </span>
                  </div>

                  {/* VERSION HỒ SƠ */}
                  <div className="text-center text-gray-600">
                    {item.submission
                      ? `v${item.submission.version}${item.submission.is_edit ? "*" : ""}`
                      : "—"}
                  </div>

                  {/* VERSION MINH CHỨNG */}
                  <div className="text-center text-gray-600">
                    {item.proof
                      ? `v${item.proof.version}`
                      : "—"}
                  </div>

                  {/* VER LATEST ĐÃ EDIT */}
                  <div className="text-center text-gray-600">
                    {item.proofEdit
                      ? `v${item.proofEdit.version}*`
                      : "—"}
                  </div>

                  {/* PDF */}
                  <div className="text-center"
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >
                    {item.proof ? (
                      <button
                        type="button"
                        onClick={() =>
                          openPDF(
                            item.proof!.file_path
                          )
                        }
                        className="cursor-pointer text-sm font-medium text-blue-600 hover:underline"
                      >
                        📄 PDF
                      </button>
                    ) : (
                      <span className="text-sm text-gray-300">
                        —
                      </span>
                    )}
                  </div>

                  {/* PDF EDIT */}
                  <div
                    className="text-center"
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >
                    {item.proofEdit ? (
                      <button
                        type="button"
                        onClick={() =>
                          openPDF(
                            item.proofEdit!.file_path
                          )
                        }
                        className="cursor-pointer text-sm font-medium text-blue-600 hover:underline"
                      >
                        📄 PDF edit
                      </button>
                    ) : (
                      <span className="text-sm text-gray-300">
                        —
                      </span>
                    )}
                  </div>

                </div>
              );
            })
          )}

        </section>

      </div>

      {/* ================================================
          DETAIL MODAL
      ================================================ */}

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-10">

          <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-2xl">

            {/* ==========================================
                MODAL HEADER
            ========================================== */}

            <div className="flex items-center justify-between border-b px-6 py-5">

              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {selected.student.full_name}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  MSSV:{" "}
                  {selected.student.mssv}
                </p>
              </div>

              <button
                onClick={closeStudent}
                className="cursor-pointer text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>

            </div>

            {/* ==========================================
                CONTENT
            ========================================== */}

            <div className="max-h-[57vh] overflow-y-auto px-6 py-6">

              {/* Thông tin sinh viên */}

              <div className="mb-8 rounded-xl bg-gray-50 p-5">

                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Thông tin sinh viên
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div>
                    <p className="text-sm text-gray-500">
                      Họ và tên
                    </p>

                    <p className="mt-1 font-medium text-gray-800">
                      {
                        selected.student
                          .full_name
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      MSSV
                    </p>

                    <p className="mt-1 font-medium text-gray-800">
                      {
                        selected.student
                          .mssv
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Ngày sinh
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        selected.student
                          .birth_date
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Giới tính
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        selected.student
                          .gender
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Lớp
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        selected.student
                          .class_name
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Khoa
                    </p>

                    <p className="mt-1 text-gray-800">
                      {FACULTY_NAME_NORMAL}
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Dân tộc
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        data.ethnicity
                      }
                    </p>
                  </div>
                  
                  <div>
                  <p className="text-sm text-gray-500">
                      Số điện thoại
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        data.phone
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Sinh viên năm thứ
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        data.studentYear
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Chức vụ
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        data.position
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Ngày vào Đoàn
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        formatDateInput(data.unionDate)
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Ngày vào Đảng (nếu có)
                    </p>

                    <div className="flex gap-8">
                      <p className="mt-1 text-gray-500">
                          a/ Dự bị:
                      <span className="text-gray-800">
                          {" "} {formatDateInput(data.probationDate)}
                      </span>
                      </p>
                    </div>

                    <div className="flex gap-8">
                      <p className="mt-1 text-gray-500">
                          b/ Chính thức:
                      <span className="text-gray-800">
                          {" "} {formatDateInput(data.officialDate)}
                      </span>
                      </p>
                    </div>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Email
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        data.email
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Địa chỉ
                    </p>

                    <p className="mt-1 text-gray-800">
                      {
                        data.address
                      }
                    </p>
                  </div>

                </div>

              </div>

              {/* Submission */}

              {!selected.submission ? (
                <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-gray-500">
                  Sinh viên chưa submit hồ sơ.
                </div>
              ) : (
                <div>

                  <div className="mb-4 flex items-center justify-between">

                    <h3 className="text-lg font-semibold text-gray-900">
                      Nội dung hồ sơ
                    </h3>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      Version{" "}
                      {selected.submission.version}
                    </span>

                  </div>

                  <div className="space-y-4">

                    <div className="space-y-8">
                      {/* =====================================================
                          1. THÔNG TIN CHUNG
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          1. Nhận xét
                        </h3>
                        
                        {/* =====================================================
                            NHẬN XÉT NGƯỜI DUYỆT
                        ====================================================== */}

                        <div className="bg-yellow-100 rounded-xl border border-gray-200 p-4">
                          <p className="whitespace-pre-wrap break-words text-gray-800">
                            {data.review_note}
                          </p>
                        </div>
                       </div>

                      {/* =====================================================
                          2. ĐẠO ĐỨC TỐT
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          2. Tiêu chí Đạo đức tốt
                        </h3>

                        <div className="space-y-4">
                          <ReviewField
                            label={`${STANDARD.CONDUCTSCORE.CONTENT} ${STANDARD.CONDUCTSCORE.DESC}`}
                            value={data.conductScore}
                          />

                          <ReviewField
                            label={`${STANDARD.UNIONEVALUATION.CONTENT} ${STANDARD.UNIONEVALUATION.DESC}`}
                            value={data.unionEvaluation}
                          />

                          <ReviewField
                            label={STANDARD.ETHIC3.CONTENT}
                            description={STANDARD.ETHIC3.DESC}
                            value={data.ethics3}
                          />

                          <ReviewField
                            label={STANDARD.ETHIC4.CONTENT}
                            description={STANDARD.ETHIC4.DESC}
                            value={data.ethics4}
                          />

                          <ReviewField
                            label={STANDARD.ETHIC5.CONTENT}
                            description={STANDARD.ETHIC5.DESC}
                            value={data.ethics5}
                          />

                          <ReviewField
                            label={STANDARD.ETHIC6.CONTENT}
                            description={STANDARD.ETHIC6.DESC}
                            value={data.ethics6}
                          />

                          <ReviewField
                            label={STANDARD.ETHIC7.CONTENT}
                            description={STANDARD.ETHIC7.DESC}
                            value={data.ethics7}
                          />
                        </div>
                      </div>

                      {/* =====================================================
                          3. HỌC TẬP TỐT
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          3. Tiêu chí Học tập tốt
                        </h3>

                        <div className="space-y-4">
                          <ReviewField
                            label={`${STANDARD.GPA.CONTENT} ${STANDARD.GPA.DESC}`}
                            value={data.gpa}
                          />

                          <ReviewField
                            label={STANDARD.STUDY2.CONTENT}
                            description={STANDARD.STUDY2.DESC}
                            value={data.study2}
                          />

                          <ReviewField
                            label={STANDARD.STUDY3.CONTENT}
                            description={STANDARD.STUDY3.DESC}
                            value={data.study3}
                          />

                          <ReviewField
                            label={STANDARD.STUDY4.CONTENT}
                            description={STANDARD.STUDY4.DESC}
                            value={data.study4}
                          />

                          <ReviewField
                            label={STANDARD.STUDY5.CONTENT}
                            description={STANDARD.STUDY5.DESC}
                            value={data.study5}
                          />

                          <ReviewField
                            label={STANDARD.STUDY6.CONTENT}
                            description={STANDARD.STUDY6.DESC}
                            value={data.study6}
                          />
                        </div>
                      </div>

                      {/* =====================================================
                          4. THỂ LỰC TỐT
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          4. Tiêu chí Thể lực tốt
                        </h3>

                        <div className="space-y-4">
                          <ReviewField
                            label={STANDARD.PHYSICAL1.CONTENT}
                            description={STANDARD.PHYSICAL1.DESC}
                            value={data.physical1}
                          />

                          <ReviewField
                            label={STANDARD.PHYSICAL2.CONTENT}
                            description={STANDARD.PHYSICAL2.DESC}
                            value={data.physical2}
                          />

                          <ReviewField
                            label={STANDARD.PHYSICAL3.CONTENT}
                            description={STANDARD.PHYSICAL3.DESC}
                            value={data.physical3}
                          />

                          <ReviewField
                            label={STANDARD.PHYSICAL4.CONTENT}
                            description={STANDARD.PHYSICAL4.DESC}
                            value={data.physical4}
                          />
                        </div>
                      </div>

                      {/* =====================================================
                          5. TÌNH NGUYỆN TỐT
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          5. Tiêu chí Tình nguyện tốt
                        </h3>

                        <div className="space-y-4">
                          <ReviewField
                            label={STANDARD.VOLUNTEER1.CONTENT}
                            description={STANDARD.VOLUNTEER1.DESC}
                            value={data.volunteer1}
                          />

                          <ReviewField
                            label={STANDARD.VOLUNTEER2.CONTENT}
                            description={STANDARD.VOLUNTEER2.DESC}
                            value={data.volunteer2}
                          />

                          <ReviewField
                            label={STANDARD.VOLUNTEER3.CONTENT}
                            description={STANDARD.VOLUNTEER3.DESC}
                            value={data.volunteer3}
                          />

                          <ReviewField
                            label={STANDARD.VOLUNTEER4.CONTENT}
                            description={STANDARD.VOLUNTEER4.DESC}
                            value={data.volunteer4}
                          />
                        </div>
                      </div>

                      {/* =====================================================
                          6. HỘI NHẬP TỐT
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          6. Tiêu chí Hội nhập tốt
                        </h3>

                        {/* Ngoại ngữ */}
                        <div>
                          <h4 className="mb-3 text-base font-semibold text-gray-800">
                            Về ngoại ngữ
                          </h4>

                          <div className="space-y-4">
                            <ReviewField
                              label={STANDARD.FOREIGNLANGUAGE1.CONTENT}
                              description={STANDARD.FOREIGNLANGUAGE1.DESC}
                              value={data.foreignLanguage1}
                            />

                            <ReviewField
                              label={STANDARD.FOREIGNLANGUAGE2.CONTENT}
                              description={STANDARD.FOREIGNLANGUAGE2.DESC}
                              value={data.foreignLanguage2}
                            />

                            <ReviewField
                              label={STANDARD.FOREIGNLANGUAGE3.CONTENT}
                              description={STANDARD.FOREIGNLANGUAGE3.DESC}
                              value={data.foreignLanguage3}
                            />
                          </div>
                        </div>

                        {/* Kỹ năng */}
                        <div className="mt-8 border-t border-gray-200 pt-6">
                          <h4 className="mb-3 text-base font-semibold text-gray-800">
                            Về kỹ năng
                          </h4>

                          <div className="space-y-4">
                            <ReviewField
                              label={STANDARD.SKILL4.CONTENT}
                              description={STANDARD.SKILL4.DESC}
                              value={data.skill4}
                            />

                            <ReviewField
                              label={STANDARD.SKILL5.CONTENT}
                              description={STANDARD.SKILL5.DESC}
                              value={data.skill5}
                            />

                            <ReviewField
                              label={STANDARD.SKILL6.CONTENT}
                              description={STANDARD.SKILL6.DESC}
                              value={data.skill6}
                            />

                            <ReviewField
                              label={STANDARD.SKILL7.CONTENT}
                              description={STANDARD.SKILL7.DESC}
                              value={data.skill7}
                            />
                          </div>
                        </div>

                        {/* Hội nhập */}
                        <div className="mt-8 border-t border-gray-200 pt-6">
                          <h4 className="mb-3 text-base font-semibold text-gray-800">
                            Về hoạt động hội nhập
                          </h4>

                          <div className="space-y-4">
                            <ReviewField
                              label={STANDARD.INTEGRATION8.CONTENT}
                              description={STANDARD.INTEGRATION8.DESC}
                              value={data.integration8}
                            />

                            <ReviewField
                              label={STANDARD.INTEGRATION9.CONTENT}
                              description={STANDARD.INTEGRATION9.DESC}
                              value={data.integration9}
                            />
                          </div>
                        </div>
                      </div>

                      {/* =====================================================
                          7. TIÊU CHUẨN ƯU TIÊN
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          7. Tiêu chuẩn ưu tiên
                        </h3>

                        <div className="space-y-4">
                          <ReviewField
                            label={STANDARD.PRIORITY1.CONTENT}
                            description={STANDARD.PRIORITY1.DESC}
                            value={data.priority1}
                          />

                          <ReviewField
                            label={STANDARD.PRIORITY2.CONTENT}
                            description={STANDARD.PRIORITY2.DESC}
                            value={data.priority2}
                          />

                          <ReviewField
                            label={STANDARD.PRIORITY3.CONTENT}
                            description={STANDARD.PRIORITY3.DESC}
                            value={data.priority3}
                          />

                          <ReviewField
                            label={STANDARD.PRIORITY4.CONTENT}
                            description={STANDARD.PRIORITY4.DESC}
                            value={data.priority4}
                          />

                          <ReviewField
                            label={STANDARD.PRIORITY5.CONTENT}
                            description={STANDARD.PRIORITY5.DESC}
                            value={data.priority5}
                          />

                          <ReviewField
                            label={STANDARD.PRIORITY6.CONTENT}
                            description={STANDARD.PRIORITY6.DESC}
                            value={data.priority6}
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* ==========================================
                REVIEW
            ========================================== */}

            {selected.submission && (
              <div className="border-t px-6 py-5">

                <div className="flex gap-3">

                  {/* ĐẠT */}

                  <button
                    type="button"
                    onClick={() => {
                      setReviewStatus(
                        reviewStatus ===
                          "passed"
                          ? null
                          : "passed"
                      );

                      if (
                        reviewStatus !==
                        "passed"
                      ) {}
                    }}
                    className={`cursor-pointer rounded-lg px-5 py-3 font-medium transition ${
                      reviewStatus ===
                      "passed"
                        ? "bg-green-600 text-white"
                        : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    ĐẠT
                  </button>

                  {/* KHÔNG ĐẠT */}

                  <button
                    type="button"
                    onClick={() => {
                      setReviewStatus(
                        reviewStatus ===
                          "failed"
                          ? null
                          : "failed"
                      );

                      if (
                        reviewStatus !==
                        "failed"
                      ) {}
                    }}
                    className={`cursor-pointer rounded-lg px-5 py-3 font-medium transition ${
                      reviewStatus ===
                      "failed"
                        ? "bg-red-600 text-white"
                        : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    KHÔNG ĐẠT
                  </button>

                  {/* XEM XÉT */}

                  <button
                    type="button"
                    onClick={() => {
                      setReviewStatus(
                        reviewStatus ===
                          "consider"
                          ? null
                          : "consider"
                      );

                      if (
                        reviewStatus ===
                        "consider"
                      ) {}
                    }}
                    className={`cursor-pointer rounded-lg px-5 py-3 font-medium transition ${
                      reviewStatus ===
                      "consider"
                        ? "bg-yellow-500 text-white"
                        : "border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    }`}
                  >
                    XEM XÉT
                  </button>

                </div>

                {/* ======================================
                    TEXTBOX XEM XÉT
                ====================================== */}

                {reviewStatus ===
                  "consider" && (
                  <div className="mt-4">

                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Nội dung cần sinh viên bổ sung
                      <span className="inline mb-2 block text-sm font-bold text-gray-700">
                        {" "} (Lưu ý: Nội dung chỉ được lưu khi bấm "Xác nhận" ở trạng thái "XEM XÉT")
                      </span>
                    </label>

                    <textarea
                      value={
                        reviewNote
                      }
                      onChange={(e) => {
                        const value = e.target.value;

                        setReviewNote(value);

                        if (selected?.student.mssv) {
                          localStorage.setItem(
                            `sv5t_review_draft_${selected.student.mssv}`,
                            value
                          );
                        }
                      }}
                      rows={5}
                      placeholder="Nhập nội dung yêu cầu sinh viên bổ sung..."
                      className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                    />

                  </div>
                )}

                {/* ======================================
                    CONFIRM
                ====================================== */}

                <div className="mt-5 flex justify-end">

                  <button
                    type="button"
                    disabled={saving}             
                    onClick={confirmReview}
                    className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Đang xác nhận..."
                      : "Xác nhận"}
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </main>
  );
}