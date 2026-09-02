"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Student = {
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  class_name: string;
};

type TextFieldProps = {
  title: string;
  description?: string;
  placeholder?: string;
};

function TextField({
  title,
  description,
  placeholder = "Để trống nếu không có...",
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
};

function DateOption({ title }: DateOptionProps) {
  const [hasDate, setHasDate] = useState<boolean | null>(null);

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
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      )}
    </div>
  );
}

export default function SubmitPage() {
  const router = useRouter();

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
  const major = "Giáo dục Tiểu học";
  const className = student?.class_name ?? ""
  const faculty = "Giáo dục Tiểu học";
  const [phone, setPhone] = useState("");
  const [studentYear, setStudentYear] = useState("");
  const [position, setPosition] = useState("");
  const [unionDate, setUnionDate] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  const [probationHasDate, setProbationHasDate] = useState<boolean | null>(null);
  const [probationDate, setProbationDate] = useState("");
  const [officialHasDate, setOfficialHasDate] = useState<boolean | null>(null);
  
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
          Gửi hồ sơ
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
                  value={faculty}
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
                  value={major}
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

              <DateOption title="Ngày vào Đoàn" />
              
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
                  value={getOfficialDate(probationDate)}
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
                    1. Điểm rèn luyện năm học 2025 - 2026
                    <span className="ml-1 text-sm text-gray-500">
                      (Không ghi xếp loại)
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="Nhập điểm rèn luyện"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="mb-3 block font-medium leading-7 text-gray-700">
                    2. Phân tích chất lượng Đoàn viên năm học 2025 - 2026
                    <span className="ml-1 text-sm text-gray-500">
                      (đối với Hội viên là Đoàn viên)
                    </span>
                  </label>

                  <select className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
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
                  title="3. Là thành viên chính thức đội thi tìm hiểu về chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh từ cấp khoa trở lên"
                />

                <TextField
                  title="4. Có tham luận, bài viết được trình bày tại các diễn đàn học thuật về các môn khoa học Mác - Lênin, tư tưởng Hồ Chí Minh từ cấp khoa trở lên"
                  description="Ghi rõ tên tham luận, diễn đàn, cấp và thời gian tổ chức."
                />

                <TextField
                  title="5. Đạt danh hiệu “Thanh niên tiên tiến làm theo lời Bác” các cấp, Sao tháng “Thanh niên SGU nghĩ đúng – sống đẹp” hoặc là điển hình được biểu dương trong việc thực hiện “Đẩy mạnh học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh” từ cấp khoa trở lên"
                  description="Ghi rõ danh hiệu, cấp tổ chức và thời gian tuyên dương."
                />

                <TextField
                  title="6. Có hành động dũng cảm cứu người bị nạn, bắt cướp, giúp người neo đơn, người nghèo hoặc người gặp khó khăn, hoạn nạn trong tình trạng nguy hiểm và cấp thiết được khen thưởng, biểu dương từ trường, cấp xã, phường trở lên hoặc được nêu gương trên các phương tiện truyền thông đại chúng"
                  description="Ghi rõ nội dung, hình thức khen thưởng hoặc biểu dương, cấp tổ chức và thời gian."
                />

                <TextField
                  title="7. Tham gia các chương trình hoặc cuộc thi tìm hiểu về lịch sử, truyền thống của Đảng, Nhà nước, chủ quyền biển đảo và tổ chức Đoàn Thanh niên, Hội Sinh viên,... được tổ chức từ cấp khoa trở lên"
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
                  1. Điểm trung bình chung học tập năm học 2025 - 2026
                  <span className="ml-1 text-sm text-gray-500">
                    (Không ghi xếp loại)
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  placeholder="Ví dụ: 8.50"
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
                  title="2. Có đề tài nghiên cứu khoa học sinh viên hoặc khóa luận Tốt nghiệp trong năm học được hội đồng khoa học từ cấp khoa trở lên nghiệm thu đánh giá"
                />

                <TextField
                  title="3. Có ít nhất 01 bài viết về lĩnh vực chuyên môn đang theo học, đăng tải trên các sản phẩm của các cơ quan truyền thông uy tín hoặc các bài báo, tạp chí khoa học chuyên ngành của trường hoặc có bài tham luận tham gia các hội thảo khoa học cấp khoa trở lên"
                  description="Ghi rõ tên bài viết, tên - số báo hoặc tạp chí và ngày phát hành."
                />

                <TextField
                  title="4. Đạt giải thưởng trong nghiên cứu khoa học, giải thưởng trong các cuộc thi học thuật và ý tưởng sáng tạo từ cấp khoa trở lên"
                  description="Ghi rõ tên cuộc thi, đơn vị tổ chức, xếp loại, xếp hạng và giải thưởng đạt được."
                />

                <TextField
                  title="5. Đạt giải khuyến khích trở lên trong các cuộc thi chuyên môn cấp Thành do các hiệp hội ngành nghề, các trường đại học, học viện, các cơ quan thông tấn hoặc báo chí tổ chức"
                  description="Ghi rõ tên cuộc thi, đơn vị tổ chức, xếp loại, xếp hạng và giải thưởng đạt được."
                />

                <TextField
                  title="6. Tham gia và có chứng nhận hoạt động tích cực ít nhất 01 CLB về học thuật từ cấp khoa trở lên"
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
        title="1. Tham gia các hoạt động sát hạch thể lực và đạt danh hiệu “Sinh viên khỏe”; “Thanh niên khỏe” từ cấp trường trở lên"
        description="Ví dụ: Giấy chứng nhận “Sinh viên khỏe” năm 2025, Khoa Toán – Ứng dụng."
      />

      <TextField
        title="2. Đạt giải khuyến khích trở lên trong các hội thao từ cấp khoa trở lên"
        description="Ghi rõ tên hội thao, đơn vị tổ chức và giải thưởng đạt được."
      />

      <TextField
        title="3. Là thành viên đội tuyển cấp trường các môn thể dục thể thao"
        description="Ghi rõ tên đội tuyển và cấp."
      />

      <TextField
        title="4. Đối với những sinh viên khuyết tật, tiêu chuẩn về thể lực bao gồm tập thể dục hằng ngày và rèn luyện ít nhất 01 môn thể thao dành cho người khuyết tật"
        description="Ghi rõ tên môn thể thao và thời gian tập luyện."
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
        title="1. Được khen thưởng từ cấp trường trở lên về hoạt động tình nguyện"
        description="Ghi rõ hình thức, nội dung và cấp khen thưởng."
      />

      <TextField
        title="2. Tham gia và được cấp giấy chứng nhận hoàn thành một trong các chiến dịch, chương trình tình nguyện"
        description="Ghi rõ tên chiến dịch hoặc chương trình và thời gian tham gia."
      />

      <TextField
        title="3. Tham gia ít nhất 05 ngày hoạt động tình nguyện trong năm"
        description="Ghi rõ số ngày thực tế tham gia các hoạt động tình nguyện cộng đồng."
      />

      <TextField
        title="4. Tham gia các hoạt động đặc biệt do Nhà trường huy động"
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
          title="1. Các chứng chỉ ngoại ngữ đã đạt"
          description="Ghi rõ tên chứng chỉ, ngoại ngữ, mức trình độ, đơn vị cấp và thời gian cấp."
        />

        <TextField
          title="2. Điểm trung bình các học phần Ngoại ngữ"
          description="Không bao gồm môn Ngoại ngữ chuyên ngành."
        />

        <TextField
          title="3. Tham gia và đạt giải khuyến khích trở lên các cuộc thi Ngoại ngữ từ cấp khoa trở lên"
          description="Ghi rõ tên cuộc thi, đơn vị tổ chức, xếp loại, xếp hạng và giải thưởng đạt được."
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
          title="4. Tham gia và có giấy chứng nhận hoàn thành ít nhất 01 khóa trang bị kỹ năng thực hành xã hội từ cấp khoa trở lên"
          description="Ghi rõ số lượng, nội dung kỹ năng và xếp loại nếu có."
        />

        <TextField
          title="5. Tham gia và có giấy chứng nhận hoàn thành ít nhất 01 hoạt động trang bị kỹ năng đúng với chuyên ngành của sinh viên"
          description="Ghi rõ số lượng, nội dung kỹ năng và xếp loại nếu có."
        />

        <TextField
          title="6. Được Đoàn Thanh niên - Hội Sinh viên từ cấp trường trở lên khen thưởng về thành tích xuất sắc trong công tác Đoàn, phong trào thanh niên hoặc công tác Hội, phong trào sinh viên"
          description="Ghi rõ hình thức, nội dung và cấp khen thưởng."
        />

        <TextField
          title="7. Đạt thành tích trong các cuộc thi về kỹ năng từ cấp khoa trở lên"
          description="Ghi rõ tên cuộc thi, đơn vị tổ chức, xếp loại, xếp hạng và giải thưởng đạt được."
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
          title="8. Tham gia tích cực ít nhất 01 hoạt động về hội nhập do cấp khoa trở lên tổ chức"
          description="Ghi rõ tên hoạt động, đơn vị tổ chức, địa điểm, thời gian tổ chức và vai trò khi tham gia."
        />

        <TextField
          title="9. Tham gia ít nhất 01 hoạt động giao lưu quốc tế"
          description="Ghi rõ tên hoạt động, đơn vị tổ chức, địa điểm, thời gian tổ chức, giao lưu với ai và vai trò khi tham gia."
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
        title="1. Có đề tài nghiên cứu khoa học sinh viên trong năm học được hội đồng khoa học từ cấp khoa trở lên nghiệm thu đánh giá từ 8.0 điểm hoặc loại Tốt trở lên"
      />

      <TextField
        title="2. Đạt chứng chỉ tiếng Anh trình độ B1 hoặc tương đương B1 hoặc chứng chỉ ngoại ngữ khác ở trình độ tương đương trở lên"
        description="Không xét thời hạn của chứng chỉ. Đối với sinh viên chuyên ngành Ngoại ngữ, chứng chỉ được áp dụng với môn Ngoại ngữ 2."
      />

      <TextField
        title="3. Được khen thưởng từ cấp trường trở lên về hoạt động tình nguyện hoặc tham gia hiến máu tình nguyện"
      />

      <TextField
        title="4. Được nêu gương, khen thưởng tại địa phương hoặc đơn vị trên các phương tiện truyền thông đại chúng vì là thanh niên tiêu biểu trên các lĩnh vực"
      />

      <TextField
        title="5. Tham gia và đạt giải ba trở lên trong các cuộc thi từ cấp trường trở lên"
        description="Ghi rõ tên cuộc thi, thời gian, đơn vị tổ chức và giải thưởng đạt được."
      />

      <TextField
        title="6. Các thành tích nổi bật trong công tác Đoàn – Hội cấp khoa trở lên"
        description="Ghi rõ nội dung và cấp khen thưởng."
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