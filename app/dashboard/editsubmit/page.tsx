"use client";

import { useEffect, useState} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    MAJOR,
    FACULTY_NAME,
    FACULTY_NAME_NORMAL,
    STANDARD,
    ACADEMIC_YEAR
} from "@/lib/constants";
import { initializeStudentPage } from "@/lib/initializeStudentPage";
import DynamicCriterionField from "@/components/DynamicCriterionField";
import { useReviewCriteria } from "@/lib/useReviewCriteria";
import {
  INTEGRATION_GROUPS,
  removeDeletedCriterionAnswers,
} from "@/lib/review-criteria";
import { hasUsableReviewNote } from "@/lib/edit-permission";

type Student = {
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  class_name: string;
};

type TextFieldProps = {
  field: string;
  title: string;
  description?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

function TextField({
  field,
  title,
  description,
  placeholder = "Để trống nếu không có...",
  value,
  onChange,
}: TextFieldProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <p className="font-medium leading-7 text-gray-800">
        {title}
      </p>

      {description && (
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {description}
        </p>
      )}

      <textarea
        rows={4}
        maxLength={1000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-4 w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <p className="mt-2 text-xs text-red-400">
        Để trống nếu không có thông tin.
      </p>
    </div>
  );
}

function getOfficialDate(date: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-").map(Number);

  // Trường hợp 29/02 → 01/03 của năm tiếp theo
  if (month === 2 && day === 29) {
    return `${year + 1}-03-01`;
  }

  return `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type DateOptionProps = {
  title: string;
  hasDate: boolean | null;
  setHasDate: (value: boolean) => void;
  date: string;
  setDate: (value: string) => void;
};

function DateOption({
  title,
  hasDate,
  setHasDate,
  date,
  setDate,
}: DateOptionProps) {
  return (
    <div>
      <label className="mb-2 block font-medium text-gray-700">
        {title} <span className="text-red-500">*</span>
      </label>

      <div className="flex gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={title}
            checked={hasDate === false}
            onChange={() => setHasDate(false)}
          />

          <span>Không có</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={title}
            checked={hasDate === true}
            onChange={() => setHasDate(true)}
          />

          <span>Có</span>
        </label>
      </div>

      {hasDate === true && (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      )}
    </div>
  );
}

export default function EditSubmitPage() {
  const router = useRouter();
  const {
    criteria,
    loading: criteriaLoading,
    error: criteriaError,
  } = useReviewCriteria();

  // Chỉ load dữ liệu sau khi initializeStudentPage xác nhận
  // đúng thời gian + đúng quyền truy cập.
  useEffect(() => {
    let mounted = true;

    async function initializeAndLoad() {
      const allowed = await initializeStudentPage(
        router,
        "addition"
      );

      if (!allowed || !mounted) {
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("mssv, role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
          console.error("PROFILE ERROR:", profileError);
          router.replace("/");
          return;
        }

        if (profile.role !== "student") {
          router.replace("/admin");
          return;
        }

        const { data: studentData, error: studentError } =
          await supabase
            .from("students")
            .select(
              "mssv, full_name, birth_date, gender, class_name"
            )
            .eq("mssv", profile.mssv)
            .single();

        if (studentError || !studentData) {
          console.error("STUDENT ERROR:", studentError);
          return;
        }

        // =====================================================
        // BẮT BUỘC: SV PHẢI ĐÃ NỘP HỒ SƠ
        // =====================================================
        const { data: latestSubmission, error: submissionError } =
          await supabase
            .from("submissions")
            .select("id, version, data, status, is_edit")
            .eq("mssv", studentData.mssv)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (submissionError) {
          console.error(
            "SUBMISSION LOAD ERROR:",
            submissionError
          );

          alert("Không thể kiểm tra hồ sơ đã nộp.");
          return;
        }

        if (!latestSubmission) {
          console.warn(
            "EDIT SUBMISSION: SINH VIÊN CHƯA NỘP HỒ SƠ"
          );

          alert("Bạn chưa nộp hồ sơ nên không thể chỉnh sửa.");
          router.replace("/dashboard");
          return;
        }

        if (!mounted) return;

        setStudent(studentData);

        // ==========================================
        // KIỂM TRA QUYỀN CHỈNH SỬA
        // ==========================================
        const reviewNote = latestSubmission.data?.review_note;

        if (!hasUsableReviewNote(reviewNote)) {
          console.warn(
            "EDIT SUBMISSION BLOCKED: KHÔNG CÓ REVIEW NOTE"
          );

          alert(
            "Hồ sơ hiện chưa có nhận xét bổ sung từ quản trị viên nên bạn chưa thể chỉnh sửa."
          );

          router.replace("/dashboard");
          return;
        }

        // =====================================================
        // LOAD DATA CỦA HỒ SƠ MỚI NHẤT VÀO FORM
        // =====================================================
        const data =
          latestSubmission.data as Record<string, unknown>;

        setEthnicity(String(data.ethnicity ?? ""));
        setPhone(String(data.phone ?? ""));
        setStudentYear(String(data.studentYear ?? ""));
        setPosition(String(data.position ?? ""));
        setUnionDate(String(data.unionDate ?? ""));
        setEmail(String(data.email ?? ""));
        setAddress(String(data.address ?? ""));

        setYouthunionHasDate(
          typeof data.youthunionHasDate === "boolean"
            ? data.youthunionHasDate
            : null
        );
        setYouthunionDate(String(data.youthunionDate ?? ""));
        
        setProbationHasDate(
          typeof data.probationHasDate === "boolean"
            ? data.probationHasDate
            : null
        );
        setProbationDate(String(data.probationDate ?? ""));

        setOfficialHasDate(
          typeof data.officialHasDate === "boolean"
            ? data.officialHasDate
            : null
        );
        setOfficialDate(String(data.officialDate ?? ""));

        // submission gốc lưu các answer trực tiếp trong data
        // chứ không nằm trong data.answers.
        const answerData: Record<string, string> = {};

        const basicKeys = new Set([
          "ethnicity",
          "phone",
          "studentYear",
          "position",
          "unionDate",
          "email",
          "address",
          "probationHasDate",
          "probationDate",
          "officialHasDate",
          "officialDate",
        ]);

        for (const [key, value] of Object.entries(data)) {
          if (
            !basicKeys.has(key) &&
            typeof value === "string"
          ) {
            answerData[key] = value;
          }
        }

        setAnswers(answerData);

        console.log("EDIT SUBMISSION LOADED:", {
          version: latestSubmission.version,
          status: latestSubmission.status,
          is_edit: latestSubmission.is_edit,
          data: latestSubmission.data,
        });
      } catch (error) {
        console.error("EDIT SUBMISSION LOAD ERROR:", error);
      } finally {
        if (mounted) {
          setLoadingStudent(false);
        }
      }
    }

    initializeAndLoad();

    return () => {
      mounted = false;
    };
  }, [router]);

  const [currentStep, setCurrentStep] = useState(1);

  const [student, setStudent] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);

useEffect(() => {
  async function loadStudent() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("mssv, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);
        router.push("/");
        return;
      }

      if (profile.role !== "student") {
        router.push("/admin");
        return;
      }

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("mssv, full_name, birth_date, gender, class_name")
        .eq("mssv", profile.mssv)
        .single();

        console.log("PROFILE:", profile);
        console.log("STUDENT DATA:", studentData);
        console.log("STUDENT ERROR:", studentError);

      if (studentError || !studentData) {
        console.error("STUDENT ERROR:", studentError);
        return;
      }

      setStudent(studentData);
    } catch (error) {
      console.error("LOAD STUDENT ERROR:", error);
    } finally {
      setLoadingStudent(false);
    }
  }

  loadStudent();
}, [router]);

  // Thông tin sinh viên
  // States:
  const fullName = student?.full_name ?? "";
  const studentId = student?.mssv ?? ""
  const gender = student?.gender ?? ""
  const birthDate = student?.birth_date ?? ""
  const [ethnicity, setEthnicity] = useState("");
  const major = MAJOR;
  const className = student?.class_name ?? ""
  const faculty = FACULTY_NAME_NORMAL;
  const [phone, setPhone] = useState("");
  const [studentYear, setStudentYear] = useState("");
  const [position, setPosition] = useState("");
  const [unionDate, setUnionDate] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  const [youthunionHasDate, setYouthunionHasDate] = useState<boolean | null>(null);
  const [youthunionDate, setYouthunionDate] = useState("");
  const [probationHasDate, setProbationHasDate] = useState<boolean | null>(null);
  const [probationDate, setProbationDate] = useState("");
  const [officialHasDate, setOfficialHasDate] = useState<boolean | null>(null);
  const [officialDate, setOfficialDate] = useState("");

  useEffect(() => {
  setOfficialDate(getOfficialDate(probationDate));
}, [probationDate]);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const submissionData = {
    // Thông tin chung
  ethnicity,
  phone,
  studentYear,
  position,
  unionDate,
  email,
  address,

  youthunionHasDate,
  youthunionDate,
  probationHasDate,
  probationDate,
  officialHasDate,
  officialDate: getOfficialDate(probationDate),

  // Các tiêu chuẩn
  ...answers,
};

function getSubmissionData() {
  return {
    ethnicity,
    phone,
    studentYear,
    position,
    unionDate,
    email,
    address,

    probationHasDate,
    probationDate,

    officialHasDate,
    officialDate,

    ...removeDeletedCriterionAnswers(answers, criteria),
  };
}

function finishForm() {
  if (criteriaLoading || criteriaError) {
    alert(
      criteriaLoading
        ? "Tiêu chí đang được tải. Vui lòng đợi một chút rồi thử lại."
        : "Không thể tải bộ tiêu chí. Vui lòng tải lại trang trước khi tiếp tục.",
    );
    return;
  }

  if (!isRequiredCriteriaComplete()) {
    alert(
      "Vui lòng điền đầy đủ các mục bắt buộc: Điểm rèn luyện, Đánh giá của Đoàn - Hội và Điểm trung bình (GPA)."
    );
    return;
  }

  if (!student?.mssv) {
    alert("Không tìm thấy thông tin sinh viên.");
    return;
  }

  sessionStorage.setItem(
    `sv5t_edit_submission_${student.mssv}`,
    JSON.stringify(getSubmissionData())
  );

  router.push("/dashboard/editsubmit/review");
}

function isStep1Complete() {
  return (
    fullName.trim() !== "" &&
    studentId.trim() !== "" &&
    gender !== "" &&
    birthDate !== "" &&
    // ethnicity.trim() !== "" &&
    major.trim() !== "" &&
    className.trim() !== "" &&
    faculty.trim() !== ""
    // phone.trim() !== "" &&
    // studentYear !== "" &&
    // position.trim() !== "" &&
    // unionDate !== ""
    // email.trim() !== "" &&
    // address.trim() !== ""
  );
}

function isRequiredCriteriaComplete() {
  return (
    (answers.conductScore ?? "").trim() !== "" &&
    (answers.unionEvaluation ?? "").trim() !== "" &&
    (answers.gpa ?? "").trim() !== ""
  );
}

  const totalSteps = 7;

  const stepNames = [
    "Thông tin chung",
    "Đạo đức tốt",
    "Học tập tốt",
    "Thể lực tốt",
    "Tình nguyện tốt",
    "Hội nhập tốt",
    "Tiêu chuẩn ưu tiên",
  ];

  function nextStep() {
  if (currentStep === 1 && !isStep1Complete()) {
    setShowWarning(true);
    return;
  }

  if (currentStep < totalSteps) {
    setShowWarning(false);
    setCurrentStep(currentStep + 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
}

  function previousStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">

      {/* HEADER DESKTOP */}
      <div className="mb-8 hidden items-start justify-between md:flex">
        {/* Bên trái */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Chỉnh sửa hồ sơ
          </h1>

          <p className="mt-2 text-gray-600">
            Vui lòng điền đầy đủ và chính xác các thông tin dưới đây.
          </p>
        </div>

        {/* Bên phải */}
        <div className="menu-btn-wrapper menu-btn-wrapper-header">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="menu-btn menu-btn-blue"
          >
            ← Quay về trang chủ
          </button>
        </div>
      </div>

      {/* HEADER MOBILE */}
      <div className="mb-8 md:hidden">
        {/* Hàng 1: Nút quay về góc trên bên trái */}
        <div className="mb-4 flex justify-start">
          <div className="menu-btn-wrapper menu-btn-wrapper-header">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="menu-btn menu-btn-blue"
            >
              ← Quay về trang chủ
            </button>
          </div>
        </div>

        {/* Hàng 2: Tiêu đề và mô tả */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Chỉnh sửa hồ sơ
          </h1>

          <p className="mt-2 text-gray-600">
            Vui lòng điền đầy đủ và chính xác các thông tin dưới đây.
          </p>
        </div>
      </div>

        {/* Progress */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-4 flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Bước {currentStep}/{totalSteps}
            </span>

            <span className="text-sm text-gray-500">
              {stepNames[currentStep - 1]}
            </span>
          </div>

          {/* Thanh tiến trình */}

          <div className="relative">
            {/* Đường thẳng nằm phía sau các vòng tròn */}
            <div className="absolute left-[7.14%] right-[7.14%] top-4 md:top-5 h-1 rounded bg-gray-200" />

            {/* 7 bước */}
            <div className="relative grid grid-cols-7">

              {stepNames.map((step, index) => {
                const stepNumber = index + 1;
                const isCurrent = stepNumber === currentStep;

                // Các bước sau chỉ mở khi Step 0 hoàn thành
                const isLocked =
                  stepNumber > 1 && !isStep1Complete();

                return (
                  <div
                    key={step}
                    className="flex flex-col items-center"
                  >
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) {
                          setCurrentStep(stepNumber);
                        }
                      }}
                      className={`group flex flex-col items-center ${
                        isLocked
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                      title={
                        isLocked
                          ? "Hãy điền đầy đủ thông tin bắt buộc"
                          : step
                      }
                    >
                      <div
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all md:h-10 md:w-10 md:text-sm ${
                          isCurrent
                            ? "border-blue-600 bg-blue-600 text-white shadow-md ring-4 ring-blue-100"
                            : isLocked
                              ? "border-gray-300 bg-gray-100 text-gray-400"
                              : "border-gray-300 bg-white text-gray-500 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        {stepNumber}
                      </div>

                      <span
                        className={`mt-3 hidden text-center text-xs md:block ${
                          isCurrent
                            ? "font-semibold text-blue-600"
                            : isLocked
                              ? "text-gray-400"
                              : "text-gray-500"
                        }`}
                      >
                        {step}
                      </span>
                    </button>
                  </div>
                );
              })}

            </div>
          </div>

        </section>

        {/* =====================================================
            BƯỚC 1 — THÔNG TIN CHUNG
        ====================================================== */}

        {currentStep === 1 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-semibold text-gray-900">
              Thông tin chung về sinh viên
            </h2>

            <div className="mt-8 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Họ và tên <span className="text-red-500">*</span>
                </label>

                <input
                  value={fullName}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Mã số sinh viên <span className="text-red-500">*</span>
                </label>

                <input
                  value={studentId}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Giới tính <span className="text-red-500">*</span>
                </label>

                <input
                  value={gender}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Ngày sinh <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  value={birthDate}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>

              {/*
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Dân tộc <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  placeholder="Ví dụ: Kinh, Hoa,..."
                  maxLength={50}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              */}

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Chuyên ngành đào tạo <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={major}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Lớp <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={student?.class_name ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Khoa <span className="text-red-500">*</span>
                </label>

                <input
                  value={faculty}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                  />
              </div>

              {/*
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={15}
                  placeholder="0123456789"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Sinh viên năm thứ <span className="text-red-500">*</span>
                </label>

                <select
                  value={studentYear}
                  onChange={(e) => setStudentYear(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <option value="">-- Chọn --</option>
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Chức vụ (Đoàn - Hội) <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Ví dụ: Bí thư Chi Đoàn, Chi hội Trưởng,..."
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Ngày vào Hội <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  value={unionDate}
                  onChange={(e) => setUnionDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <DateOption
                title="Ngày vào Đoàn"
                hasDate={youthunionHasDate}
                setHasDate={setYouthunionHasDate}
                date={youthunionDate}
                setDate={setUnionDate}
              />
              
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Ngày vào Đảng
                </label>

                <div className="grid gap-6 md:grid-cols-2">
                  
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  a. Dự bị
                </label>

                <div className="flex gap-6">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="probationPartyDate"
                      checked={probationHasDate === false}
                      onChange={() => {
                        setProbationHasDate(false);
                        setProbationDate("");
                        setOfficialHasDate(false);
                      }}
                    />
                    <span>Không có</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="probationPartyDate"
                      checked={probationHasDate === true}
                      onChange={() => setProbationHasDate(true)}
                    />
                    <span>Có</span>
                  </label>
                </div>

                {probationHasDate === true && (
                  <input
                    type="date"
                    value={probationDate}
                    onChange={(e) => setProbationDate(e.target.value)}
                    className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                )}
              </div>

              <div>
              <label className="mb-2 block font-medium text-gray-700">
                b. Chính thức
              </label>

              <div className="flex gap-6">
                <label
                  className={`flex items-center gap-2 ${
                    probationHasDate === false
                      ? "cursor-not-allowed text-gray-400"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="officialPartyDate"
                    checked={officialHasDate === false}
                    disabled={probationHasDate === false}
                    onChange={() => setOfficialHasDate(false)}
                  />
                  <span>Không có</span>
                </label>

                <label
                  className={`flex items-center gap-2 ${
                    probationHasDate === false
                      ? "cursor-not-allowed text-gray-400"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="officialPartyDate"
                    checked={officialHasDate === true}
                    disabled={probationHasDate === false}
                    onChange={() => setOfficialHasDate(true)}
                  />
                  <span>Có</span>
                </label>
              </div>

              {officialHasDate === true && (
                <input
                  type="date"
                  value={officialDate}
                  readOnly
                  className="mt-4 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 outline-none"
                />
              )}
            </div>

  </div>
</div>
            </div>

            <div className="mt-8 grid gap-5 border-t border-gray-200 pt-8">
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>              

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Địa chỉ liên lạc <span className="text-red-500">*</span>
                </label>

                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={4}
                  maxLength={300}
                  placeholder="Nhập địa chỉ liên lạc"
                  className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              */}

            </div>

          </section>
        )}

        {/* =====================================================
            BƯỚC 2 — ĐẠO ĐỨC TỐT
        ====================================================== */}

        {currentStep === 2 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-semibold text-gray-900">
              Đạo đức tốt
            </h2>

            {/* Tiêu chuẩn bắt buộc */}

            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-800">
                Tiêu chuẩn bắt buộc
              </h3>

              <div className="mt-5 space-y-6">

                <div>
                  <label className="mb-2 block font-medium leading-7 text-gray-700">
                      {STANDARD.CONDUCTSCORE.CONTENT}
                    <span className="ml-1 text-sm text-gray-500">
                      {STANDARD.CONDUCTSCORE.DESC}
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={answers.conductScore ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "") {
                        setAnswer("conductScore", "");
                        return;
                      }

                      // Chỉ cho phép số nguyên, không cho dấu . hoặc -
                      if (!/^\d+$/.test(value)) {
                        return;
                      }

                      const num = Number(value);

                      if (num >= 0 && num <= 100) {
                        setAnswer("conductScore", value);
                      }
                    }}
                    placeholder="Nhập điểm rèn luyện"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="mb-3 block font-medium leading-7 text-gray-700">
                      {STANDARD.UNIONEVALUATION.CONTENT}
                    <span className="ml-1 text-sm text-gray-500">
                      {STANDARD.UNIONEVALUATION.DESC}
                    </span>
                  </label>

                  <select
                    value={answers.unionEvaluation ?? ""}
                    onChange={(e) => setAnswer("unionEvaluation", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <option value="">-- Chọn kết quả --</option>

                    <option>
                      Đoàn viên Hoàn thành Xuất sắc nhiệm vụ
                    </option>

                    <option>
                      Đoàn viên Hoàn thành Tốt nhiệm vụ
                    </option>

                    <option>
                      Đoàn viên Hoàn thành nhiệm vụ
                    </option>

                    <option>
                      Đoàn viên Không hoàn thành nhiệm vụ
                    </option>
                  </select>
                </div>

              </div>
            </div>

            {/* Tiêu chuẩn khác */}

            <div className="mt-8 space-y-5">
              <h3 className="text-xl font-semibold text-gray-800">
                Tiêu chuẩn khác
              </h3>
              {criteriaError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {criteriaError}
                </p>
              )}
              {criteriaLoading ? (
                <p className="text-sm text-gray-500">Đang tải tiêu chí...</p>
              ) : (
                criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "ethics" &&
                  criterion.is_active,
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <DynamicCriterionField
                  key={criterion.id}
                  criterion={criterion}
                  value={answers[criterion.criterion_key] ?? ""}
                  onChange={(value) =>
                    setAnswer(criterion.criterion_key, value)
                  }
                />
              ))
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            BƯỚC 3 — HỌC TẬP TỐT
        ====================================================== */}

        {currentStep === 3 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-semibold text-gray-900">
              Học tập tốt
            </h2>

            <div className="mt-8">

              <h3 className="text-xl font-semibold text-gray-800">
                Tiêu chuẩn bắt buộc
              </h3>

              <div className="mt-5">
                <label className="mb-2 block font-medium leading-7 text-gray-700">
                    {STANDARD.GPA.CONTENT}
                  <span className="ml-1 text-sm text-gray-500">
                    {STANDARD.GPA.DESC}
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={answers.gpa ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;

                    // Cho phép xóa ô
                    if (value === "") {
                      setAnswer("gpa", "");
                      return;
                    }

                    // Chỉ cho số và tối đa 2 số sau dấu .
                    if (!/^\d*\.?\d{0,2}$/.test(value)) {
                      return;
                    }

                    // Không cho vượt quá 4
                    const num = Number(value);

                    if (num > 4) {
                      return;
                    }

                    setAnswer("gpa", value);
                  }}
                  placeholder="Ví dụ: 2.72"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

            </div>

            <div className="mt-8 space-y-5">
              <h3 className="text-xl font-semibold text-gray-800">
                Tiêu chuẩn khác
              </h3>
              {criteriaError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {criteriaError}
                </p>
              )}
              {criteriaLoading ? (
                <p className="text-sm text-gray-500">Đang tải tiêu chí...</p>
              ) : (
                criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "study" &&
                  criterion.is_active,
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <DynamicCriterionField
                  key={criterion.id}
                  criterion={criterion}
                  value={answers[criterion.criterion_key] ?? ""}
                  onChange={(value) =>
                    setAnswer(criterion.criterion_key, value)
                  }
                />
              ))
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            BƯỚC 4 — THỂ LỰC TỐT
        ====================================================== */}

        {currentStep === 4 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              Thể lực tốt
            </h2>

            
            <div className="mt-8 space-y-5">
              {criteriaError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {criteriaError}
                </p>
              )}
              {criteriaLoading ? (
                <p className="text-sm text-gray-500">Đang tải tiêu chí...</p>
              ) : (
                criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "physical" &&
                  criterion.is_active,
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <DynamicCriterionField
                  key={criterion.id}
                  criterion={criterion}
                  value={answers[criterion.criterion_key] ?? ""}
                  onChange={(value) =>
                    setAnswer(criterion.criterion_key, value)
                  }
                />
              ))
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            BƯỚC 5 — TÌNH NGUYỆN TỐT
        ====================================================== */}

        {currentStep === 5 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              Tình nguyện tốt
            </h2>

            
            <div className="mt-8 space-y-5">
              {criteriaError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {criteriaError}
                </p>
              )}
              {criteriaLoading ? (
                <p className="text-sm text-gray-500">Đang tải tiêu chí...</p>
              ) : (
                criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "volunteer" &&
                  criterion.is_active,
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <DynamicCriterionField
                  key={criterion.id}
                  criterion={criterion}
                  value={answers[criterion.criterion_key] ?? ""}
                  onChange={(value) =>
                    setAnswer(criterion.criterion_key, value)
                  }
                />
              ))
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            BƯỚC 6 — HỘI NHẬP TỐT
        ====================================================== */}

        {currentStep === 6 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">
              Hội nhập tốt
            </h2>

            {/* NGOẠI NGỮ */}

            
            <div className="mt-8 space-y-5">
              {criteriaError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {criteriaError}
                </p>
              )}
              {criteriaLoading ? (
                <p className="text-sm text-gray-500">Đang tải tiêu chí...</p>
              ) : (
                INTEGRATION_GROUPS.map((group) => {
              const groupCriteria = criteria
                .filter(
                  (criterion) =>
                    criterion.section_key === "integration" &&
                    criterion.integration_group === group.key &&
                    criterion.is_active,
                )
                .sort((a, b) => a.sort_order - b.sort_order);

              if (groupCriteria.length === 0) return null;

              return (
                <div key={group.key} className="space-y-5">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {group.label}
                  </h3>
                  {groupCriteria.map((criterion) => (
                    <DynamicCriterionField
                      key={criterion.id}
                      criterion={criterion}
                      value={answers[criterion.criterion_key] ?? ""}
                      onChange={(value) =>
                        setAnswer(criterion.criterion_key, value)
                      }
                    />
                  ))}
                </div>
              );
            })
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            BƯỚC 7 — TIÊU CHUẨN ƯU TIÊN
        ====================================================== */}

{currentStep === 7 && (
  <section className="rounded-2xl bg-white p-6 shadow-sm">
    <h2 className="text-2xl font-semibold text-gray-900">
      Tiêu chuẩn ưu tiên
    </h2>

    
            <div className="mt-8 space-y-5">
              {criteriaError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {criteriaError}
                </p>
              )}
              {criteriaLoading ? (
                <p className="text-sm text-gray-500">Đang tải tiêu chí...</p>
              ) : (
                criteria
              .filter(
                (criterion) =>
                  criterion.section_key === "priority" &&
                  criterion.is_active,
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((criterion) => (
                <DynamicCriterionField
                  key={criterion.id}
                  criterion={criterion}
                  value={answers[criterion.criterion_key] ?? ""}
                  onChange={(value) =>
                    setAnswer(criterion.criterion_key, value)
                  }
                />
              ))
              )}
            </div>
          </section>
)}

        {/* =====================================================
            NÚT ĐIỀU HƯỚNG
        ====================================================== */}
        
        {showWarning && (
        <p className="mb-4 text-right text-sm font-medium text-red-500">
          Hãy điền đầy đủ thông tin bắt buộc trước khi tiếp tục.
        </p>
      )}
        
        <div className="flex items-center justify-between">
          <div className="menu-btn-wrapper menu-btn-wrapper-footer">
          <button
            type="button"
            onClick={previousStep}
            disabled={currentStep === 1}
            className={`menu-btn menu-btn-footer ${
              currentStep === 1
                ? "menu-btn-disabled"
                : "menu-btn-white"
            }`}
          >
            ← Quay lại
          </button>
          </div>

          {currentStep < totalSteps ? (
            <div className="menu-btn-wrapper menu-btn-wrapper-footer">
            <button
              type="button"
              onClick={nextStep}
              className="menu-btn menu-btn-blue"
            >
              Tiếp tục →
            </button>
            </div>
          ) : (
            <div className="menu-btn-wrapper menu-btn-wrapper-footer">
            <button
              type="button"
              onClick={finishForm}
              className="menu-btn menu-btn-green"
            >
              Hoàn tất
            </button>
            </div>
          )}

        </div>

      </div>
    </main>
  );
}