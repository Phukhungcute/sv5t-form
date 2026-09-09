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

type Student = {
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  class_name: string;
};

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
  officialDate: string;

  conductScore: string;
  unionEvaluation: string;
  ethics3: string;
  ethics4: string;
  ethics5: string;
  ethics6: string;
  ethics7: string;

  gpa: string;
  study2: string;
  study3: string;
  study4: string;
  study5: string;
  study6: string;

  physical1: string;
  physical2: string;
  physical3: string;
  physical4: string;

  volunteer1: string;
  volunteer2: string;
  volunteer3: string;
  volunteer4: string;

  foreignLanguage1: string;
  foreignLanguage2: string;
  foreignLanguage3: string;
  skill4: string;
  skill5: string;
  skill6: string;
  skill7: string;
  integration8: string;
  integration9: string;

  priority1: string;
  priority2: string;
  priority3: string;
  priority4: string;
  priority5: string;
  priority6: string;
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

      <p className="mt-2 text-xs text-gray-400">
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

  const [unionHasDate, setUnionHasDate] = useState<boolean | null>(null);
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

    ...answers,
  };
}

function finishForm() {
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
    ethnicity.trim() !== "" &&
    major.trim() !== "" &&
    className.trim() !== "" &&
    faculty.trim() !== "" &&
    phone.trim() !== "" &&
    studentYear !== "" &&
    position.trim() !== "" &&
    unionDate !== "" &&
    email.trim() !== "" &&
    address.trim() !== ""
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

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
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
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
      >
        ← Quay về trang chủ
      </button>
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
  <div className="absolute left-[7.14%] right-[7.14%] top-5 h-1 rounded bg-gray-200" />

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
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
            title={
              isLocked
                ? "Hãy điền đầy đủ thông tin bắt buộc"
                : step
            }
          >
            <div
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
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
                hasDate={unionHasDate}
                setHasDate={setUnionHasDate}
                date={unionDate}
                setDate={setUnionDate}
              />
              
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Ngày vào Đảng
                </label>

                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* a. Dự bị */}
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

                  {/* b. Chính thức */}
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

            {/* Liên hệ */}

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

            <div className="mt-10 border-t border-gray-200 pt-8">

              <h3 className="text-xl font-semibold text-gray-800">
                Tiêu chuẩn khác
              </h3>

              <div className="mt-8 space-y-5">

                <TextField
                  field="ethics3"
                  title={`${STANDARD.ETHIC3.CONTENT}`}
                  description={`${STANDARD.ETHIC3.DESC}`}
                  value={answers.ethics3 ?? ""}
                  onChange={(value) => setAnswer("ethics3", value)}
                />

                <TextField
                  field="ethics4"
                  title={`${STANDARD.ETHIC4.CONTENT}`}
                  description={`${STANDARD.ETHIC4.DESC}`}
                  value={answers.ethics4 ?? ""}
                  onChange={(value) => setAnswer("ethics4", value)}
                />

                <TextField
                  field="ethics5"
                  title={`${STANDARD.ETHIC5.CONTENT}`}
                  description={`${STANDARD.ETHIC5.DESC}`}
                  value={answers.ethics5 ?? ""}
                  onChange={(value) => setAnswer("ethics5", value)}
                />

                <TextField
                  field="ethics6"
                  title={`${STANDARD.ETHIC6.CONTENT}`}
                  description={`${STANDARD.ETHIC6.DESC}`}
                  value={answers.ethics6 ?? ""}
                  onChange={(value) => setAnswer("ethics6", value)}
                />

                <TextField
                  field="ethics7"
                  title={`${STANDARD.ETHIC7.CONTENT}`}
                  description={`${STANDARD.ETHIC7.DESC}`}
                  value={answers.ethics7 ?? ""}
                  onChange={(value) => setAnswer("ethics7", value)}
                />

              </div>
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
                  max="10"
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

                    // Không cho vượt quá 10
                    const num = Number(value);

                    if (num > 10) {
                      return;
                    }

                    setAnswer("gpa", value);
                  }}
                  placeholder="Ví dụ: 8.55"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

            </div>

            <div className="mt-10 border-t border-gray-200 pt-8">

              <h3 className="text-xl font-semibold text-gray-800">
                Tiêu chuẩn khác
              </h3>

              <div className="mt-8 space-y-5">

                <TextField
                  field="study2"
                  title={`${STANDARD.STUDY2.CONTENT}`}
                  description={`${STANDARD.STUDY2.DESC}`}
                  value={answers.study2 ?? ""}
                  onChange={(value) => setAnswer("study2", value)}
                />

                <TextField
                  field="study3"
                  title={`${STANDARD.STUDY3.CONTENT}`}
                  description={`${STANDARD.STUDY3.DESC}`}
                  value={answers.study3 ?? ""}
                  onChange={(value) => setAnswer("study3", value)}
                />

                <TextField
                  field="study4"
                  title={`${STANDARD.STUDY4.CONTENT}`}
                  description={`${STANDARD.STUDY4.DESC}`}
                  value={answers.study4 ?? ""}
                  onChange={(value) => setAnswer("study4", value)}
                />

                <TextField
                  field="study5"
                  title={`${STANDARD.STUDY5.CONTENT}`}
                  description={`${STANDARD.STUDY5.DESC}`}
                  value={answers.study5 ?? ""}
                  onChange={(value) => setAnswer("study5", value)}
                />

                <TextField
                  field="study6"
                  title={`${STANDARD.STUDY6.CONTENT}`}
                  description={`${STANDARD.STUDY6.DESC}`}
                  value={answers.study6 ?? ""}
                  onChange={(value) => setAnswer("study6", value)}
                />

              </div>

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
              <TextField
                field="physical1"
                title={`${STANDARD.PHYSICAL1.CONTENT}`}
                description={`${STANDARD.PHYSICAL1.DESC}`}
                value={answers.physical1 ?? ""}
                onChange={(value) => setAnswer("physical1", value)}
              />

              <TextField
                field="physical2"
                title={`${STANDARD.PHYSICAL2.CONTENT}`}
                description={`${STANDARD.PHYSICAL2.DESC}`}
                value={answers.physical2 ?? ""}
                onChange={(value) => setAnswer("physical2", value)}
              />

              <TextField
                field="physical3"
                title={`${STANDARD.PHYSICAL3.CONTENT}`}
                description={`${STANDARD.PHYSICAL3.DESC}`}
                value={answers.physical3 ?? ""}
                onChange={(value) => setAnswer("physical3", value)}
              />

              <TextField
                field="physical4"
                title={`${STANDARD.PHYSICAL4.CONTENT}`}
                description={`${STANDARD.PHYSICAL4.DESC}`}
                value={answers.physical4 ?? ""}
                onChange={(value) => setAnswer("physical4", value)}
              />
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
              <TextField
                field="volunteer1"
                title={`${STANDARD.VOLUNTEER1.CONTENT}`}
                description={`${STANDARD.VOLUNTEER1.DESC}`}
                value={answers.volunteer1 ?? ""}
                onChange={(value) => setAnswer("volunteer1", value)}
              />

              <TextField
                field="volunteer2"
                title={`${STANDARD.VOLUNTEER2.CONTENT}`}
                description={`${STANDARD.VOLUNTEER2.DESC}`}
                value={answers.volunteer2 ?? ""}
                onChange={(value) => setAnswer("volunteer2", value)}
              />

              <TextField
                field="volunteer3"
                title={`${STANDARD.VOLUNTEER3.CONTENT}`}
                description={`${STANDARD.VOLUNTEER3.DESC}`}
                value={answers.volunteer3 ?? ""}
                onChange={(value) => setAnswer("volunteer3", value)}
              />

              <TextField
                field="volunteer4"
                title={`${STANDARD.VOLUNTEER4.CONTENT}`}
                description={`${STANDARD.VOLUNTEER4.DESC}`}
                value={answers.volunteer4 ?? ""}
                onChange={(value) => setAnswer("volunteer4", value)}
              />
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

            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-800">
                Về ngoại ngữ
              </h3>

              <div className="mt-5 space-y-5">
                <TextField
                  field="foreignLanguage1"
                  title={`${STANDARD.FOREIGNLANGUAGE1.CONTENT}`}
                  description={`${STANDARD.FOREIGNLANGUAGE1.DESC}`}
                  value={answers.foreignLanguage1 ?? ""}
                  onChange={(value) => setAnswer("foreignLanguage1", value)}
                />
                
                <div className="rounded-xl border border-gray-200 p-5">
                    <div className="mt-5">
                        <label className="mb-2 block font-medium leading-7 text-gray-700">
                            {STANDARD.FOREIGNLANGUAGE2.CONTENT}
                          <span className="ml-1 text-sm text-gray-500">
                            {STANDARD.FOREIGNLANGUAGE2.DESC}
                          </span>
                        </label>

                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          value={answers.foreignLanguage2 ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;

                            // Cho phép xóa ô
                            if (value === "") {
                              setAnswer("foreignLanguage2", "");
                              return;
                            }

                            // Chỉ cho số và tối đa 2 số sau dấu .
                            if (!/^\d*\.?\d{0,2}$/.test(value)) {
                              return;
                            }

                            // Không cho vượt quá 10
                            const num = Number(value);

                            if (num > 10) {
                              return;
                            }

                            setAnswer("foreignLanguage2", value);
                          }}
                          placeholder="Ví dụ: 7.56"
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                </div>

                <TextField
                  field="foreignLanguage3"
                  title={`${STANDARD.FOREIGNLANGUAGE3.CONTENT}`}
                  description={`${STANDARD.FOREIGNLANGUAGE3.DESC}`}
                  value={answers.foreignLanguage3 ?? ""}
                  onChange={(value) => setAnswer("foreignLanguage3", value)}
                />
              </div>
            </div>

            {/* KỸ NĂNG */}

            <div className="mt-10 border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-800">
                Về kỹ năng
              </h3>

              <div className="mt-5 space-y-5">
                <TextField
                  field="skill4"
                  title={`${STANDARD.SKILL4.CONTENT}`}
                  description={`${STANDARD.SKILL4.DESC}`}
                  value={answers.skill4 ?? ""}
                  onChange={(value) => setAnswer("skill4", value)}
                />

                <TextField
                  field="skill5"
                  title={`${STANDARD.SKILL5.CONTENT}`}
                  description={`${STANDARD.SKILL5.DESC}`}
                  value={answers.skill5 ?? ""}
                  onChange={(value) => setAnswer("skill5", value)}
                />

                <TextField
                  field="skill6"
                  title={`${STANDARD.SKILL6.CONTENT}`}
                  description={`${STANDARD.SKILL6.DESC}`}
                  value={answers.skill6 ?? ""}
                  onChange={(value) => setAnswer("skill6", value)}
                />

                <TextField
                  field="skill7"
                  title={`${STANDARD.SKILL7.CONTENT}`}
                  description={`${STANDARD.SKILL7.DESC}`}
                  value={answers.skill7 ?? ""}
                  onChange={(value) => setAnswer("skill7", value)}
                />
              </div>
            </div>

            {/* HỘI NHẬP */}

            <div className="mt-10 border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-800">
                Về hoạt động hội nhập
              </h3>

              <div className="mt-5 space-y-5">
                <TextField
                  field="integration8"
                  title={`${STANDARD.INTEGRATION8.CONTENT}`}
                  description={`${STANDARD.INTEGRATION8.DESC}`}
                  value={answers.integration8 ?? ""}
                  onChange={(value) => setAnswer("integration8", value)}
                />

                <TextField
                  field="integration9"
                  title={`${STANDARD.INTEGRATION9.CONTENT}`}
                  description={`${STANDARD.INTEGRATION9.DESC}`}
                  value={answers.integration9 ?? ""}
                  onChange={(value) => setAnswer("integration9", value)}
                />
              </div>
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
      <TextField
        field="priority1"
        title={`${STANDARD.PRIORITY1.CONTENT}`}
        description={`${STANDARD.PRIORITY1.DESC}`}
        value={answers.priority1 ?? ""}
        onChange={(value) => setAnswer("priority1", value)}
      />

      <TextField
        field="priority2"
        title={`${STANDARD.PRIORITY2.CONTENT}`}
        description={`${STANDARD.PRIORITY2.DESC}`}
        value={answers.priority2 ?? ""}
        onChange={(value) => setAnswer("priority2", value)}
      />

      <TextField
        field="priority3"
        title={`${STANDARD.PRIORITY3.CONTENT}`}
        description={`${STANDARD.PRIORITY3.DESC}`}
        value={answers.priority3 ?? ""}
        onChange={(value) => setAnswer("priority3", value)}
      />

      <TextField
        field="priority4"
        title={`${STANDARD.PRIORITY4.CONTENT}`}
        description={`${STANDARD.PRIORITY4.DESC}`}
        value={answers.priority4 ?? ""}
        onChange={(value) => setAnswer("priority4", value)}
      />

      <TextField
        field="priority5"
        title={`${STANDARD.PRIORITY5.CONTENT}`}
        description={`${STANDARD.PRIORITY5.DESC}`}
        value={answers.priority5 ?? ""}
        onChange={(value) => setAnswer("priority5", value)}
      />

      <TextField
        field="priority6"
        title={`${STANDARD.PRIORITY6.CONTENT}`}
        description={`${STANDARD.PRIORITY6.DESC}`}
        value={answers.priority6 ?? ""}
        onChange={(value) => setAnswer("priority6", value)}
      />
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
        
        <div className="mt-8 flex items-center justify-between">

          <button
            type="button"
            onClick={previousStep}
            disabled={currentStep === 1}
            className={`cursor-pointer rounded-lg px-6 py-3 font-medium transition ${
              currentStep === 1
                ? "cursor-not-allowed bg-gray-200 text-gray-400"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            ← Quay lại
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Tiếp tục →
            </button>
          ) : (
            <button
              type="button"
              onClick={finishForm}
              className="cursor-pointer rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
            >
              Hoàn tất
            </button>
          )}

        </div>

      </div>
    </main>
  );
}