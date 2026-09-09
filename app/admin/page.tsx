"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACADEMIC_YEAR } from "@/lib/constants";
import { ADMIN_NAMES } from "@/lib/constants";

type StudentStats = {
  total: number;
  submitted: number;
  pending: number;
  passed: number;
  failed: number;
  consider: number;
};

type ScheduleSettings = {
  start_date: string;

  submission_days: number;
  review1_days: number;
  addition_days: number;
  review2_days: number;
  result_days: number;

  submission_enabled: boolean;
  addition_enabled: boolean;
  result_enabled: boolean;
};

function ScheduleDaysRow({
  title,
  label,
  value,
  enabled,
  onToggle,
  onSave,
}: {
  title: string;
  label: string;
  value: number;
  enabled?: boolean;
  onToggle?: () => void;
  onSave: (value: number) => void;
}) {
  const [inputValue, setInputValue] =
    useState(String(value));
  
  // Trạng thái thống kê mặc định
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    pending: 0,
    passed: 0,
    failed: 0,
    consider: 0,
  });

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">

        <div>
          <h3 className="font-bold text-gray-800">
            {title}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {label}
          </p>
        </div>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${
              enabled
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {enabled ? "Bật" : "Tắt"}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">

        <input
          type="number"
          min="1"
          step="1"
          value={inputValue}
          onChange={(e) =>
            setInputValue(e.target.value)
          }
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={() =>
            onSave(Number(inputValue))
          }
          className="cursor-pointer rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
        >
          Xác nhận
        </button>
      </div>
    </div>
  );
}

function formatDateDisplay(dateString: string) {
  const [year, month, day] =
    dateString.slice(0, 10).split("-");

  return `${day}/${month}/${year}`;
}

export default function AdminPage() {
  const router = useRouter();

  const [stats, setStats] = useState<StudentStats>({
    total: 0,
    submitted: 0,
    pending: 0,
    passed: 0,
    failed: 0,
    consider: 0,
  });

  async function handleLogout() {
  await supabase.auth.signOut();
  router.push("/");
}

  const [resetMssv, setResetMssv] =
    useState("");

  const [resetLoading, setResetLoading] =
    useState(false);

  const [resetMessage, setResetMessage] =
    useState("");

  const [resetError, setResetError] =
    useState("");

  async function handleResetPassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setResetMessage("");
    setResetError("");

    const mssv = resetMssv.trim();

    if (!mssv) {
      setResetError("Vui lòng nhập MSSV.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn reset mật khẩu của sinh viên ${mssv} về ngày tháng năm sinh không?`
    );

    if (!confirmed) return;

    setResetLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setResetError(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mssv }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setResetError(
          result?.error ??
            "Không thể reset mật khẩu."
        );
        return;
      }

      setResetMessage(
        result?.message ??
          `Đã reset mật khẩu cho ${mssv}.`
      );

      setResetMssv("");
    } catch (error) {
      console.error(
        "ADMIN RESET PASSWORD ERROR:",
        error
      );

      setResetError(
        "Không thể kết nối đến máy chủ."
      );
    } finally {
      setResetLoading(false);
    }
  }

  const [schedule, setSchedule] =
    useState<ScheduleSettings | null>(null);

  const [startDateInput, setStartDateInput] =
    useState("");

  const [scheduleLoading, setScheduleLoading] =
    useState(true);

  async function loadSchedule() {
  setScheduleLoading(true);

  const { data, error } = await supabase
    .from("schedule_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("SCHEDULE ERROR:", error);
    return;
  }

  setSchedule(data);

setStartDateInput(
  formatDateInput(data.start_date)
);

setScheduleLoading(false);
} 

  function formatDateInput(
    dateString: string
  ) {
    return dateString.slice(0, 10);
  }

async function updateStartDate(value: string) {
  if (!value) return;

  const vietnamDate =
    `${value}T00:00:00+07:00`;

  const { error } = await supabase
    .from("schedule_settings")
    .update({
      start_date: vietnamDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error(
      "UPDATE START DATE ERROR:",
      error
    );

    alert(
      "Không thể cập nhật ngày bắt đầu."
    );

    return;
  }

  // Cập nhật UI ngay lập tức
  setSchedule((prev) =>
    prev
      ? {
          ...prev,
          start_date: vietnamDate,
        }
      : prev
  );

  alert("Đã cập nhật ngày bắt đầu.");
}

async function updateDays(
  field:
    | "submission_days"
    | "review1_days"
    | "addition_days"
    | "review2_days"
    | "result_days",
  value: number
) {
  if (!schedule) return;

  if (!Number.isInteger(value) || value < 0) {
    alert("Vui lòng nhập số nguyên không âm.");
    return;
  }

  const { data, error } = await supabase
    .from("schedule_settings")
    .update({
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    console.error(
      "UPDATE SCHEDULE ERROR:",
      error
    );

    alert("Không thể cập nhật lịch trình.");
    return;
  }

  setSchedule(data);

  alert("Đã cập nhật.");
}

async function toggleSchedule(
  field:
    | "submission_enabled"
    | "addition_enabled"
    | "result_enabled"
) {
  if (!schedule) return;

  const newValue = !schedule[field];

  const { data, error } = await supabase
    .from("schedule_settings")
    .update({
      [field]: newValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    console.error(
      "TOGGLE SCHEDULE ERROR:",
      error
    );

    alert("Không thể thay đổi trạng thái.");
    return;
  }

  setSchedule(data);
}

  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] =
  useState("Quản trị viên");

  /* =====================================================
     CHECK ADMIN
  ===================================================== */

  useEffect(() => {
  async function loadAdmin() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/");
        return;
      }

      setAdminName(
        ADMIN_NAMES[user.email ?? ""] ??
          "Quản trị viên"
      );

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        router.push("/");
        return;
      }

      if (profile.role === "admin") {
        await loadSchedule();

      /* =================================================
         LOAD STUDENTS
      ================================================= */

      const {
        data: students,
        error: studentError,
      } = await supabase
        .from("students")
        .select("mssv");

      if (studentError) {
        console.error(
          "ADMIN STUDENT ERROR:",
          studentError
        );
        return;
      }

      /* =================================================
         LOAD SUBMISSIONS
      ================================================= */

      const {
        data: submissionData,
        error: submissionError,
      } = await supabase
        .from("submissions")
        .select("mssv, version, status")
        .order("version", {
          ascending: false,
        });

      if (submissionError) {
        console.error(
          "SUBMISSION STATS ERROR:",
          submissionError
        );
        return;
      }

      /* =================================================
         TỔNG SỐ SINH VIÊN
      ================================================= */

      const total = students?.length ?? 0;

      /* =================================================
         CHỈ GIỮ SUBMISSION MỚI NHẤT CỦA MỖI MSSV
      ================================================= */

      const latestSubmissions = new Map<
        string,
        (typeof submissionData)[number]
      >();

      for (
        const submission of submissionData ?? []
      ) {
        if (
          !latestSubmissions.has(
            submission.mssv
          )
        ) {
          latestSubmissions.set(
            submission.mssv,
            submission
          );
        }
      }

      /* =================================================
         ĐÃ NỘP / CHƯA NỘP
      ================================================= */

      const submitted =
        latestSubmissions.size;

      const pending = Math.max(
        total - submitted,
        0
      );

      /* =================================================
         ĐẠT / KHÔNG ĐẠT / XEM XÉT
      ================================================= */

      let passed = 0;
      let failed = 0;
      let consider = 0;

      for (
        const submission of
          latestSubmissions.values()
      ) {
        switch (submission.status) {
          case "passed":
            passed++;
            break;

          case "failed":
            failed++;
            break;

          case "consider":
            consider++;
            break;
        }
      }

      /* =================================================
         SET STATS
      ================================================= */

      setStats({
        total,
        submitted,
        pending,
        passed,
        failed,
        consider,
      });
     }

    } catch (error) {
      console.error(
        "ADMIN LOAD ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  loadAdmin();
}, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">

        {/* =================================================
           TITLE
        ================================================= */}

        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              SV5T Form {ACADEMIC_YEAR}
            </h1>

            <p className="mt-1 text-gray-500">
              Hệ thống quản lý hồ sơ SV5T
            </p>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900">
            Xin chào, {adminName} 👋
          </h2>

          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Đăng xuất
          </button>
        </header>

        {/* =================================================
           SECTION 1 - DUYỆT HỒ SƠ
        ================================================= */}

        <section
          onClick={() =>
            router.push(
              "/admin/submissions"
            )
          }
          className="mb-6 cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                1. Duyệt hồ sơ
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Xem danh sách và đánh giá hồ sơ
                Sinh viên 5 Tốt.
              </p>
            </div>

            <div className="text-3xl text-gray-400">
              →
            </div>

          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Tổng sinh viên
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.total}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Đã nộp
              </p>

              <p className="mt-1 text-2xl font-bold text-green-600">
                {stats.submitted}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Chưa nộp
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-500">
                {stats.pending}
              </p>
            </div>

          </div>
        </section>

        {/* =================================================
           SECTION 2 - THỐNG KÊ
        ================================================= */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            2. Thống kê
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Thống kê tình hình xét duyệt hồ sơ.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">
                Đạt
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {stats.passed}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">
                Không đạt
              </p>

              <p className="mt-2 text-3xl font-bold text-red-600">
                {stats.failed}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">
                Xem xét
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-500">
                {stats.consider}
              </p>
            </div>

          </div>

        </section>

        {/* =================================================
           SECTION 3 - QUẢN LÝ LỊCH TRÌNH
        ================================================= */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            3. Quản lý lịch trình
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Thiết lập thời gian và trạng thái hiển thị
            cho sinh viên.
          </p>

          {scheduleLoading || !schedule ? (
            <p className="mt-6 text-sm text-gray-500">
              Đang tải lịch trình...
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">

              {/* ======================================
                  NGÀY BẮT ĐẦU
              ====================================== */}

              <div className="rounded-xl border border-gray-200 p-5">

                <h3 className="font-bold text-gray-800">
                  Ngày bắt đầu
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Ngày bắt đầu nộp hồ sơ: {formatDateDisplay(startDateInput)}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) =>
                      setStartDateInput(e.target.value)
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      updateStartDate(startDateInput)
                    }
                    className="cursor-pointer rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    Xác nhận
                  </button>

                  <span className="text-xs text-gray-400">
                    VN
                  </span>
                </div>

              </div>


              {/* ======================================
                  GỬI HỒ SƠ
              ====================================== */}

              <ScheduleDaysRow
                title="Gửi hồ sơ"
                label="Số ngày gửi hồ sơ:"
                value={schedule.submission_days}
                enabled={
                  schedule.submission_enabled
                }
                onToggle={() =>
                  toggleSchedule(
                    "submission_enabled"
                  )
                }
                onSave={(value) =>
                  updateDays(
                    "submission_days",
                    value
                  )
                }
              />


              {/* ======================================
                  DUYỆT LẦN 1
              ====================================== */}

              <ScheduleDaysRow
                title="Duyệt hồ sơ lần 1"
                label="Số ngày duyệt hồ sơ lần 1:"
                value={schedule.review1_days}
                onSave={(value) =>
                  updateDays(
                    "review1_days",
                    value
                  )
                }
              />


              {/* ======================================
                  CHỈNH SỬA
              ====================================== */}

              <ScheduleDaysRow
                title="Chỉnh sửa hồ sơ"
                label="Số ngày chỉnh sửa hồ sơ:"
                value={schedule.addition_days}
                enabled={
                  schedule.addition_enabled
                }
                onToggle={() =>
                  toggleSchedule(
                    "addition_enabled"
                  )
                }
                onSave={(value) =>
                  updateDays(
                    "addition_days",
                    value
                  )
                }
              />


              {/* ======================================
                  DUYỆT LẦN 2
              ====================================== */}

              <ScheduleDaysRow
                title="Duyệt hồ sơ lần 2"
                label="Số ngày duyệt hồ sơ lần 2:"
                value={schedule.review2_days}
                onSave={(value) =>
                  updateDays(
                    "review2_days",
                    value
                  )
                }
              />


              {/* ======================================
                  KẾT QUẢ
              ====================================== */}

              <ScheduleDaysRow
                title="Kết quả"
                label="Số ngày xem kết quả:"
                value={schedule.result_days}
                enabled={
                  schedule.result_enabled
                }
                onToggle={() =>
                  toggleSchedule(
                    "result_enabled"
                  )
                }
                onSave={(value) =>
                  updateDays(
                    "result_days",
                    value
                  )
                }
              />

            </div>
          )}

        </section>

        {/* =================================================
           SECTION 4 - RESET MẬT KHẨU SINH VIÊN
        ================================================= */}

        <section className="mt-8 rounded-2xl bg-red-100 p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            4. Reset mật khẩu sinh viên
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Reset mật khẩu về ngày tháng năm sinh của sinh viên.
            Sau khi reset, sinh viên sẽ được yêu cầu đổi mật khẩu.
          </p>

          <form
            onSubmit={handleResetPassword}
            className="mt-5 max-w-xl"
          >
            <label
              htmlFor="reset-mssv"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Mã số sinh viên
            </label>

            <div className="flex gap-2">
              <input
                id="reset-mssv"
                type="text"
                value={resetMssv}
                onChange={(e) =>
                  setResetMssv(e.target.value)
                }
                placeholder="Nhập MSSV cần reset"
                disabled={resetLoading}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                required
              />

              <button
                type="submit"
                disabled={resetLoading}
                className="cursor-pointer rounded-lg bg-red-600 px-5 py-3 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetLoading
                  ? "Đang reset..."
                  : "Reset mật khẩu"}
              </button>
            </div>

            {resetError && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {resetError}
              </div>
            )}

            {resetMessage && (
              <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {resetMessage}
              </div>
            )}
          </form>

        </section>

      </div>
    </main>
  );
}