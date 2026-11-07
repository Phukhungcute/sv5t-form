"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ACADEMIC_YEAR, FACULTY_NAME_NORMAL } from "@/lib/constants";
import { useReviewCriteria } from "@/lib/useReviewCriteria";
import { INTEGRATION_GROUPS } from "@/lib/review-criteria";
import { ChevronDown } from "lucide-react";
import * as XLSX from "xlsx-js-style";

type Student = {
  id: number;
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  class_name: string;
  created_at: string;
};

type Submission = {
  id: number;
  mssv: string;
  version: number;
  data: Record<string, any>;
  status: string;
  participation: boolean | null;
  is_representative: boolean;
  is_university_level: boolean;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_edit: boolean;
};

type AwardPhoto = {
  mssv: string;
  file_path: string;
};

type AwardStudent = {
  mssv: string;
  full_name: string;
  participation: boolean | null;
  file_path: string | null;
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
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "";

  let displayValue: string;

  if (isEmpty) {
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

      <p
        className={`whitespace-pre-wrap break-words ${
          isEmpty ? "text-red-500" : "text-gray-800"
        }`}
      >
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
  const { criteria, error: criteriaError } = useReviewCriteria();

  const [adminName, setAdminName] =
    useState("Quản trị viên");

  const [loading, setLoading] =
    useState(true);

  const [students, setStudents] =
    useState<StudentSubmission[]>([]);

  const [search, setSearch] =
    useState("");

  const [sortNewest, setSortNewest] =
    useState(false);

  const [statusFilter, setStatusFilter] =
    useState<ReviewStatus | "all">("all");

  const [selected, setSelected] =
    useState<StudentSubmission | null>(null);

  const [reviewStatus, setReviewStatus] =
    useState<ReviewStatus>(null);

  const [isRepresentative, setIsRepresentative] =
    useState(false);

  const [isUniversityLevel, setIsUniversityLevel] =
    useState(false);

  const [reviewNote, setReviewNote] =
    useState("");

  const [submissionsListOpen, setSubmissionsListOpen] = useState(true);

  const [awardPhotos, setAwardPhotos] = useState<AwardPhoto[]>([]);
  const [awardPhotosLoading, setAwardPhotosLoading] = useState(false);
  const [awardListOpen, setAwardListOpen] = useState(true);

  const [selectedAwardMssv, setSelectedAwardMssv] = useState<string[]>([]);

  const awardStudents = students
    .filter((item) => item.submission?.status === "passed")
    .map((item) => {
      const photo = awardPhotos.find(
        (photo) => photo.mssv === item.student.mssv
      );

      return {
        mssv: item.student.mssv,
        full_name: item.student.full_name,
        participation: item.submission?.participation ?? null,
        file_path: photo?.file_path ?? null,
      };
    });

  async function loadAwardPhotos() {
    setAwardPhotosLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Không tìm thấy phiên đăng nhập.");
      }

      const response = await fetch("/api/admin/award-photos", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Không thể tải ảnh tuyên dương."
        );
      }

      setAwardPhotos(result.photos ?? []);
    } catch (error) {
      console.error("LOAD AWARD PHOTOS ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Không thể tải ảnh tuyên dương."
      );
    } finally {
      setAwardPhotosLoading(false);
    }
  }

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
          "id, mssv, version, data, status, participation,is_representative, is_university_level, created_at, reviewed_at, reviewed_by, is_edit"
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
      await loadAwardPhotos();

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
    const keyword = search.trim().toLowerCase();

    const result = students.filter((item) => {
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

    if (sortNewest) {
      result.sort((a, b) => {
        const dateA = a.submission?.created_at
          ? new Date(a.submission.created_at).getTime()
          : 0;

        const dateB = b.submission?.created_at
          ? new Date(b.submission.created_at).getTime()
          : 0;

        return dateB - dateA;
      });
    }

    return result;
  }, [students, search, statusFilter, sortNewest]);

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

  setIsRepresentative(
    item.submission?.is_representative ?? false
  );

  setIsUniversityLevel(
    item.submission?.is_university_level ?? false
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
    setIsRepresentative(false);
    setIsUniversityLevel(false);
  }

  /* =====================================================
     PDF
  ===================================================== */

  
  async function openPDF(filePath: string) {
    // Mở tab ngay trong thao tác click để tránh popup blocker.
    const newTab = window.open("about:blank", "_blank");

    if (!newTab) {
      alert("Trình duyệt đã chặn cửa sổ mở PDF. Vui lòng cho phép mở cửa sổ bật lên.");
      return;
    }

    try {
      let path = filePath.trim();

      if (path.startsWith("/")) {
        path = path.slice(1);
      }

      if (path.startsWith(`${PROOF_BUCKET}/`)) {
        path = path.slice(PROOF_BUCKET.length + 1);
      }

      const { data, error } = await supabase.storage
        .from(PROOF_BUCKET)
        .createSignedUrl(path, 60 * 60);

      if (error || !data?.signedUrl) {
        console.error("PDF URL ERROR:", error);
        newTab.close();
        alert("Không thể mở file PDF.");
        return;
      }

      newTab.location.href = data.signedUrl;
    } catch (error) {
      console.error("PDF ERROR:", error);
      newTab.close();
      alert("Không thể mở file PDF.");
    }
  }


  
  async function openAwardPhoto(filePath: string) {
    // Mở tab ngay khi người dùng nhấn nút.
    const newTab = window.open("about:blank", "_blank");

    if (!newTab) {
      alert("Trình duyệt đã chặn cửa sổ mở ảnh. Vui lòng cho phép mở cửa sổ bật lên.");
      return;
    }

    try {
      // 1. Chuẩn hóa đường dẫn ảnh
      let path = filePath.trim();

      if (path.startsWith("/")) {
        path = path.slice(1);
      }

      if (path.startsWith("student-awards/")) {
        path = path.slice("student-awards/".length);
      }

      console.log("AWARD PHOTO PATH:", path);

      // 2. Tạo signed URL
      const { data, error } = await supabase.storage
        .from("student-awards")
        .createSignedUrl(path, 60 * 60);

      if (error) {
        console.error("AWARD PHOTO URL ERROR:", error);
        newTab.close();
        alert(`Không thể tạo đường dẫn ảnh: ${error.message}`);
        return;
      }

      if (!data?.signedUrl) {
        newTab.close();
        alert("Không tạo được đường dẫn ảnh.");
        return;
      }

      // 3. Chuyển tab mới đến ảnh
      newTab.location.href = data.signedUrl;
    } catch (error) {
      console.error("OPEN AWARD PHOTO ERROR:", error);

      newTab.close();

      alert(
        error instanceof Error
          ? error.message
          : "Không thể mở ảnh tuyên dương."
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

          // Chỉ lưu hai trạng thái phụ khi hồ sơ ĐẠT.
          // Các trạng thái khác sẽ tự động đưa về false.
          is_representative:
            reviewStatus === "passed"
              ? isRepresentative
              : false,

          is_university_level:
            reviewStatus === "passed"
              ? isUniversityLevel
              : false,

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

function exportToExcel() {
  const exportData = filteredStudents.map((item) => {
    let status = "SUBMITTED";

    switch (item.submission?.status) {
      case "passed":
        status = "ĐẠT";
        break;

      case "failed":
        status = "KHÔNG ĐẠT";
        break;

      case "consider":
        status = "XEM XÉT";
        break;

      default:
        status = item.submission
          ? "SUBMITTED"
          : "CHƯA NỘP";
    }

    return {
      "MSSV": item.student.mssv,
      "Họ tên": item.student.full_name,
      "Lớp": item.student.class_name,
      "Kết quả": status,
    };
  });

  // ==========================================
  // TẠO WORKSHEET
  // ==========================================

  const worksheet = XLSX.utils.aoa_to_sheet([]);

  // Đưa dữ liệu + header bắt đầu từ A2
  XLSX.utils.sheet_add_json(
    worksheet,
    exportData,
    {
      origin: "A2",
      skipHeader: false,
    }
  );

  // ==========================================
  // TẠO WORKBOOK
  // ==========================================

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Kết quả SV5T"
  );

  // ==========================================
  // TITLE
  // ==========================================

  XLSX.utils.sheet_add_aoa(
    worksheet,
    [[
      `KẾT QUẢ XÉT SV5T NĂM HỌC ${ACADEMIC_YEAR}`,
    ]],
    {
      origin: "A1",
    }
  );

  // Merge A1:D1
  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 3 },
    },
  ];

  // Style title
  worksheet["A1"].s = {
    font: {
      bold: true,
      sz: 16,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  };

  // ==========================================
  // HEADER
  // ==========================================

  const headerRow = 2;

  const headers = [
    "MSSV",
    "Họ tên",
    "Lớp",
    "Kết quả",
  ];

  headers.forEach((header, columnIndex) => {
    const cellAddress =
      XLSX.utils.encode_cell({
        r: headerRow - 1,
        c: columnIndex,
      });

    worksheet[cellAddress].s = {
      font: {
        bold: true,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
      border: {
        top: {
          style: "thin",
          color: {
            rgb: "000000",
          },
        },
        bottom: {
          style: "thin",
          color: {
            rgb: "000000",
          },
        },
        left: {
          style: "thin",
          color: {
            rgb: "000000",
          },
        },
        right: {
          style: "thin",
          color: {
            rgb: "000000",
          },
        },
      },
    };
  });

  // ==========================================
  // BORDER + CĂN GIỮA + MÀU TRẠNG THÁI
  // ==========================================

  for (
    let rowIndex = 0;
    rowIndex < exportData.length;
    rowIndex++
  ) {
    const excelRow = headerRow + 1 + rowIndex;

    // ------------------------------------------
    // BORDER CHO TẤT CẢ Ô DỮ LIỆU
    // ------------------------------------------

    ["A", "B", "C", "D"].forEach((column) => {
      const cell =
        worksheet[`${column}${excelRow}`];

      if (!cell) return;

      cell.s = {
        ...(cell.s ?? {}),

        border: {
          top: {
            style: "thin",
            color: {
              rgb: "000000",
            },
          },
          bottom: {
            style: "thin",
            color: {
              rgb: "000000",
            },
          },
          left: {
            style: "thin",
            color: {
              rgb: "000000",
            },
          },
          right: {
            style: "thin",
            color: {
              rgb: "000000",
            },
          },
        },
      };
    });

    // ------------------------------------------
    // CĂN GIỮA MSSV + LỚP + TRẠNG THÁI
    // ------------------------------------------

    ["A", "C", "D"].forEach((column) => {
      const cell =
        worksheet[`${column}${excelRow}`];

      if (!cell) return;

      cell.s = {
        ...(cell.s ?? {}),
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    });

    // ------------------------------------------
    // MÀU TRẠNG THÁI
    // ------------------------------------------

    const statusCell =
      `D${excelRow}`;

    const status =
      exportData[rowIndex]["Kết quả"];

    if (status === "ĐẠT") {
      worksheet[statusCell].s = {
        ...(worksheet[statusCell].s ?? {}),
        font: {
          bold: true,
        },
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: "C6EFCE",
          },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }

    else if (status === "KHÔNG ĐẠT") {
      worksheet[statusCell].s = {
        ...(worksheet[statusCell].s ?? {}),
        font: {
          bold: true,
        },
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: "FFC7CE",
          },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }

    else if (status === "XEM XÉT") {
      worksheet[statusCell].s = {
        ...(worksheet[statusCell].s ?? {}),
        font: {
          bold: true,
        },
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: "FFEB9C",
          },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }

    else if (status === "SUBMITTED") {
      worksheet[statusCell].s = {
        ...(worksheet[statusCell].s ?? {}),
        font: {
          bold: true,
        },
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: "BDD7EE",
          },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }
  }

  // ==========================================
  // ĐỘ RỘNG CỘT
  // ==========================================

  worksheet["!cols"] = [
    { wch: 18 }, // MSSV
    { wch: 30 }, // Họ tên
    { wch: 18 }, // Lớp
    { wch: 18 }, // Trạng thái
  ];

  // ==========================================
  // CHIỀU CAO
  // ==========================================

  worksheet["!rows"] = [
    { hpt: 28 }, // Title
    { hpt: 22 }, // Header
  ];

  // ==========================================
  // XUẤT FILE
  // ==========================================

  XLSX.writeFile(
    workbook,
    `Ket-qua-SV5T-${ACADEMIC_YEAR}.xlsx`
  );
}

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
      {criteriaError && (
        <div className="mx-auto mb-4 max-w-6xl rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Không thể tải tiêu chí động: {criteriaError}
        </div>
      )}
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
    <main className="min-h-screen bg-orange-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">

        {/* ============================================
            HEADER
        ============================================ */}

        <header className="mb-8 flex items-center justify-between">

          <div>
            <div className="menu-btn-wrapper menu-btn-wrapper-header">
            <button
            onClick={() => router.push("/admin")}
            className="menu-btn menu-btn-white"
          >
            ← Quay lại trang quản trị
          </button>
          </div>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              Duyệt hồ sơ/Phản hồi sinh viên
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
              className="cursor-pointer rounded-lg border-4 border-red-200 px-4 py-2 text-xl font-medium text-red-600 transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
            >
              Đăng xuất
            </button>

          </div>

        </header>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              Lọc:
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`w-[130px] cursor-pointer rounded-lg px-4 py-4 text-sm font-medium transition ${
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
              className={`w-[130px] cursor-pointer rounded-lg px-4 py-4 text-sm font-medium transition ${
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
              className={`w-[130px] cursor-pointer rounded-lg px-4 py-4 text-sm font-medium transition ${
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
              className={`w-[130px] cursor-pointer rounded-lg px-4 py-4 text-sm font-medium transition ${
                statusFilter === "consider"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              XEM XÉT
            </button>

            <button
              type="button"
              onClick={() => setSortNewest((prev) => !prev)}
              className={`cursor-pointer rounded-lg px-4 py-4 text-sm font-medium transition ${
                sortNewest
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {sortNewest ? "MỚI NHẤT ↓" : "SẮP XẾP: MẶC ĐỊNH"}
            </button>

            <div className="ml-4 menu-btn-wrapper-inline">
              <button
                type="button"
                onClick={exportToExcel}
                className="menu-btn menu-btn-gray"
              >
                📊 Tải Excel
              </button>
            </div>
          </div>
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
            LIST — HỒ SƠ SINH VIÊN
        ============================================ */}

        <section className="mt-6 overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-sm">
          {/* HEADER ĐÓNG / MỞ */}
          <button
            type="button"
            onClick={() =>
              setSubmissionsListOpen((prev: boolean) => !prev)
            }
            aria-expanded={submissionsListOpen}
            className="flex w-full cursor-pointer items-center justify-between gap-3 bg-blue-50 px-5 py-4 text-left transition hover:bg-blue-100"
          >
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Danh sách hồ sơ sinh viên
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                {filteredStudents.length} sinh viên
              </p>
            </div>

            <ChevronDown
              size={20}
              className={`shrink-0 transition-transform duration-200 ${
                submissionsListOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* BODY */}
          {submissionsListOpen && (
            <div className="border-t border-blue-200">
              {/* KHUNG CUỘN */}
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full min-w-[1200px] border-collapse text-sm">
                  {/* HEADER CỘT */}
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr className="border-b border-gray-200 text-left font-semibold text-gray-700">
                      <th className="whitespace-nowrap px-6 py-4">
                        MSSV
                      </th>

                      <th className="whitespace-nowrap px-6 py-4">
                        Họ và tên
                      </th>

                      <th className="whitespace-nowrap px-6 py-4 text-center">
                        Trạng thái
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 text-center">
                        <div>Version</div>
                        <div>(Hồ sơ)</div>
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 text-center">
                        <div>Version</div>
                        <div>(Minh chứng)</div>
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 text-center">
                        <div>Version</div>
                        <div>(Minh chứng - edited)</div>
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 text-center">
                        PDF
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 text-center">
                        <div>PDF</div>
                        <div>(edited)</div>
                      </th>
                    </tr>
                  </thead>

                  {/* BODY DANH SÁCH */}
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-14 text-center text-gray-500"
                        >
                          Không tìm thấy sinh viên.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((item) => {
                        const status = getStatusLabel(item.submission);

                        return (
                          <tr
                            key={item.student.mssv}
                            onClick={() => openStudent(item)}
                            className="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50"
                          >
                            {/* MSSV */}
                            <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-800">
                              {item.student.mssv}
                            </td>

                            {/* HỌ VÀ TÊN */}
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-800">
                                {item.student.full_name}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {item.student.class_name}
                              </p>

                              <p className="mt-1 text-xs text-red-800">
                                Đã nộp vào lúc{" "}
                                {item.submission?.created_at
                                  ? new Date(item.submission.created_at).toLocaleString("vi-VN", {
                                      timeZone: "Asia/Ho_Chi_Minh",
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Null"}
                              </p>
                            </td>

                            {/* TRẠNG THÁI */}
                            <td className="whitespace-nowrap px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                                >
                                  {status.text}
                                </span>

                                {item.submission?.status === "passed" && (
                                  <>
                                    {item.submission.is_university_level && (
                                      <span className="text-xs font-semibold text-red-600">
                                        (Cấp trường)
                                      </span>
                                    )}

                                    {item.submission.is_representative && (
                                      <span className="text-xs font-semibold text-orange-500">
                                        (Tiêu biểu)
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                            {/* VERSION HỒ SƠ */}
                            <td className="whitespace-nowrap px-4 py-4 text-center text-gray-600">
                              {item.submission
                                ? `v${item.submission.version}${
                                    item.submission.is_edit ? "*" : ""
                                  }`
                                : "—"}
                            </td>

                            {/* VERSION MINH CHỨNG */}
                            <td className="whitespace-nowrap px-4 py-4 text-center text-gray-600">
                              {item.proof
                                ? `v${item.proof.version}`
                                : "—"}
                            </td>

                            {/* VERSION MINH CHỨNG EDITED */}
                            <td className="whitespace-nowrap px-4 py-4 text-center text-gray-600">
                              {item.proofEdit
                                ? `v${item.proofEdit.version}*`
                                : "—"}
                            </td>

                            {/* PDF */}
                            <td
                              className="whitespace-nowrap px-4 py-4 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.proof ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openPDF(item.proof!.file_path)
                                  }
                                  className="cursor-pointer font-medium text-blue-600 hover:underline"
                                >
                                  📄 PDF
                                </button>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>

                            {/* PDF EDIT */}
                            <td
                              className="whitespace-nowrap px-4 py-4 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.proofEdit ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openPDF(item.proofEdit!.file_path)
                                  }
                                  className="cursor-pointer font-medium text-blue-600 hover:underline"
                                >
                                  📄 PDF edit
                                </button>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            DANH SÁCH PHẢN HỒI CỦA SINH VIÊN ĐẠT
        ===================================================== */}

        <section className="mt-8 overflow-hidden rounded-xl border-2 border-green-300 bg-white shadow-sm">
          {/* HEADER ĐÓNG / MỞ */}
          <button
            type="button"
            onClick={() => setAwardListOpen((prev) => !prev)}
            aria-expanded={awardListOpen}
            className="flex w-full cursor-pointer items-center justify-between gap-3 bg-green-50 px-5 py-4 text-left transition hover:bg-green-100"
          >
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                Danh sách phản hồi của các sinh viên Đạt
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                {awardStudents.length} sinh viên
              </p>
            </div>

            <ChevronDown
              size={20}
              className={`shrink-0 transition-transform duration-200 ${
                awardListOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {awardListOpen && (
            <div className="border-t border-green-200">
                {awardPhotosLoading ? (
                  <div className="px-6 py-10 text-center text-gray-500">
                    Đang tải ảnh tuyên dương...
                  </div>
                ) : (
                  <>
                    {/* CHỌN TẤT CẢ / BỎ CHỌN TẤT CẢ */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={
                            awardStudents.length > 0 &&
                            awardStudents.every((item) =>
                              selectedAwardMssv.includes(item.mssv)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAwardMssv(
                                awardStudents.map((item) => item.mssv)
                              );
                            } else {
                              setSelectedAwardMssv([]);
                            }
                          }}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300"
                        />
                        Chọn tất cả
                      </label>

                      <span className="text-sm text-gray-500">
                        Đã chọn{" "}
                        {
                          awardStudents.filter((item) =>
                            selectedAwardMssv.includes(item.mssv)
                          ).length
                        }{" "}
                        / {awardStudents.length} sinh viên
                      </span>
                    </div>

                    {/* HEADER CỘT */}
                    <div className="grid grid-cols-[44px_minmax(140px,1fr)_minmax(180px,1.5fr)_minmax(150px,1fr)_minmax(130px,1fr)] items-center border-b bg-gray-50 px-5 py-4 text-sm font-semibold text-gray-700">
                      <div></div>
                      <div>MSSV</div>
                      <div>Họ và tên</div>
                      <div className="text-center">Tham gia LTD</div>
                      <div className="text-center">Ảnh tuyên dương</div>
                    </div>

                    {/* BODY */}
                    <div className="max-h-[600px] overflow-y-auto">
                    {awardStudents.length === 0 ? (
                      <div className="px-6 py-12 text-center text-gray-500">
                        Chưa có sinh viên nào đạt.
                      </div>
                    ) : (
                      awardStudents.map((item) => {
                        const isSelected = selectedAwardMssv.includes(item.mssv);

                        const participationStatus =
                          item.participation === true
                            ? {
                                text: "ĐƯỢC",
                                className: "bg-green-100 text-green-700",
                              }
                            : item.participation === false
                              ? {
                                  text: "KHÔNG",
                                  className: "bg-red-100 text-red-700",
                                }
                              : {
                                  text: "CHƯA PHẢN HỒI",
                                  className: "bg-blue-100 text-blue-700",
                                };

                        return (
                          <div
                            key={item.mssv}
                            className="grid grid-cols-[44px_minmax(140px,1fr)_minmax(180px,1.5fr)_minmax(150px,1fr)_minmax(130px,1fr)] items-center border-b px-5 py-4 text-sm transition hover:bg-green-50"
                          >
                            {/* CHECKBOX */}
                            <div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedAwardMssv((prev) =>
                                    e.target.checked
                                      ? [...prev, item.mssv]
                                      : prev.filter(
                                          (mssv) => mssv !== item.mssv
                                        )
                                  );
                                }}
                                aria-label={`Chọn ${item.full_name}`}
                                className="h-4 w-4 cursor-pointer rounded border-gray-300"
                              />
                            </div>

                            {/* MSSV */}
                            <div className="font-medium text-gray-800">
                              {item.mssv}
                            </div>

                            {/* HỌ VÀ TÊN */}
                            <div className="font-medium text-gray-800">
                              {item.full_name}
                            </div>

                            {/* THAM GIA LTD */}
                            <div className="text-center">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${participationStatus.className}`}
                              >
                                {participationStatus.text}
                              </span>
                            </div>

                            {/* ẢNH TUYÊN DƯƠNG */}
                            <div className="text-center">
                              {item.file_path ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAwardPhoto(item.file_path!)
                                  }
                                  className="cursor-pointer font-medium text-blue-600 hover:underline"
                                >
                                  🖼️ Xem
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

                    {/* FOOTER */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-5 py-4">
                      <p className="text-sm text-gray-500">
                        Chọn sinh viên để chuẩn bị tải ảnh tuyên dương.
                      </p>

                      <button
                        type="button"
                        disabled={selectedAwardMssv.length === 0}
                        onClick={() => {
                          alert("Chức năng tải ZIP sẽ được bổ sung ở bước tiếp theo.");
                        }}
                        className="menu-btn menu-btn-inline menu-btn-green"
                      >
                        Tải ảnh đã chọn
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
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

                    <p className="mt-1  font-medium text-gray-800">
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

                    <p className="mt-1 font-medium text-gray-800">
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

                    <p className="mt-1 font-medium text-gray-800">
                      {
                        selected.student
                          .class_name
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Khoa/Ngành
                    </p>

                    <p className="mt-1 font-medium text-gray-800">
                      {FACULTY_NAME_NORMAL}
                    </p>
                  </div>
                  
                  {/*
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
                        formatDateInput(data.youthunionDate)
                      }
                    </p>
                  </div>

                  <div>
                  <p className="text-sm text-gray-500">
                      Ngày vào Hội
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
                  */}

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
                            label={`1. Điểm rèn luyện năm học ${ACADEMIC_YEAR} (Không ghi xếp loại)`}
                            value={data.conductScore}
                          />
                          <ReviewField
                            label={`2. Phân tích chất lượng Đoàn viên năm học ${ACADEMIC_YEAR} (đối với Hội viên là Đoàn viên)`}
                            value={data.unionEvaluation}
                          />
                          {criteria
                            .filter(
                              (criterion) =>
                                criterion.section_key === "ethics" &&
                                (criterion.is_active ||
                                  data[criterion.criterion_key] !== undefined),
                            )
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((criterion) => (
                              <ReviewField
                                key={criterion.id}
                                label={`${criterion.sort_order + 1}. ${criterion.content}`}
                                description={criterion.description}
                                value={data[criterion.criterion_key]}
                              />
                            ))}
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
                            label={`1. Điểm trung bình học tập năm học ${ACADEMIC_YEAR} (Không ghi xếp loại)`}
                            value={data.gpa}
                          />
                          {criteria
                            .filter(
                              (criterion) =>
                                criterion.section_key === "study" &&
                                (criterion.is_active ||
                                  data[criterion.criterion_key] !== undefined),
                            )
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((criterion) => (
                              <ReviewField
                                key={criterion.id}
                                label={`${criterion.sort_order + 1}. ${criterion.content}`}
                                description={criterion.description}
                                value={data[criterion.criterion_key]}
                              />
                            ))}
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
                          {criteria
                            .filter(
                              (criterion) =>
                                criterion.section_key === "physical" &&
                                (criterion.is_active ||
                                  data[criterion.criterion_key] !== undefined),
                            )
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((criterion) => (
                              <ReviewField
                                key={criterion.id}
                                label={`${criterion.sort_order + 1}. ${criterion.content}`}
                                description={criterion.description}
                                value={data[criterion.criterion_key]}
                              />
                            ))}
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
                          {criteria
                            .filter(
                              (criterion) =>
                                criterion.section_key === "volunteer" &&
                                (criterion.is_active ||
                                  data[criterion.criterion_key] !== undefined),
                            )
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((criterion) => (
                              <ReviewField
                                key={criterion.id}
                                label={`${criterion.sort_order + 1}. ${criterion.content}`}
                                description={criterion.description}
                                value={data[criterion.criterion_key]}
                              />
                            ))}
                        </div>
                        </div>

                      {/* =====================================================
                          6. HỘI NHẬP TỐT
                      ====================================================== */}
                      <div>
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          6. Tiêu chí Hội nhập tốt
                        </h3>

                        <div className="space-y-6">
                          {INTEGRATION_GROUPS.map((group) => {
                            const groupCriteria = criteria
                              .filter(
                                (criterion) =>
                                  criterion.section_key === "integration" &&
                                  criterion.integration_group === group.key &&
                                  (criterion.is_active ||
                                    data[criterion.criterion_key] !== undefined),
                              )
                              .sort((a, b) => a.sort_order - b.sort_order);

                            if (groupCriteria.length === 0) return null;

                            return (
                              <div key={group.key} className="space-y-4">
                                <h4 className="font-semibold text-gray-800">
                                  {group.label}
                                </h4>
                                {groupCriteria.map((criterion) => (
                                  <ReviewField
                                    key={criterion.id}
                                    label={`${criterion.sort_order + 1}. ${criterion.content}`}
                                    description={criterion.description}
                                    value={data[criterion.criterion_key]}
                                  />
                                ))}
                              </div>
                            );
                          })}
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
                          {criteria
                            .filter(
                              (criterion) =>
                                criterion.section_key === "priority" &&
                                (criterion.is_active ||
                                  data[criterion.criterion_key] !== undefined),
                            )
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((criterion) => (
                              <ReviewField
                                key={criterion.id}
                                label={`${criterion.sort_order + 1}. ${criterion.content}`}
                                description={criterion.description}
                                value={data[criterion.criterion_key]}
                              />
                            ))}
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
                    TRẠNG THÁI BỔ SUNG KHI ĐẠT
                ====================================== */}

                {reviewStatus === "passed" && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-green-900">
                      Phân loại bổ sung (không bắt buộc)
                    </p>

                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={isRepresentative}
                          onChange={(e) =>
                            setIsRepresentative(e.target.checked)
                          }
                          className="h-4 w-4 cursor-pointer rounded border-gray-300"
                        />
                        Tiêu biểu
                      </label>

                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={isUniversityLevel}
                          onChange={(e) =>
                            setIsUniversityLevel(e.target.checked)
                          }
                          className="h-4 w-4 cursor-pointer rounded border-gray-300"
                        />
                        Cấp trường
                      </label>
                    </div>
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