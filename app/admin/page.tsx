"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACADEMIC_YEAR } from "@/lib/constants";
import { ADMIN_NAMES } from "@/lib/constants";
import { ArrowUp , ArrowDown , ChevronDown } from "lucide-react";
import { motion } from "motion/react";

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
          className="cursor-pointer rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600  transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
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

type QA = {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  sort_order: number | null;
};

type MaintenanceStudent = {
  mssv: string;
  full_name: string;
};

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

  async function handleResetPassword() {
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
        result?.error ?? "Không thể reset mật khẩu."
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

  // Quyền cực hạn của admin
    const [adminPassword, setAdminPassword] = useState("");
    const [adminActionLoading, setAdminActionLoading] = useState(false);

    const [accountMssv, setAccountMssv] = useState("");
    const [deleteMssv, setDeleteMssv] = useState("");
    const [cohortKey, setCohortKey] = useState(""); 

    // ==========================================
    // THẺ VÀNG - MAINTENANCE ACCESS
    // ==========================================

    const [maintenanceMssv, setMaintenanceMssv] =
      useState("");

    const [maintenanceStudents, setMaintenanceStudents] =
      useState<MaintenanceStudent[]>([]);

    const [maintenanceLoading, setMaintenanceLoading] =
      useState(false);

    const [maintenanceListOpen, setMaintenanceListOpen] =
      useState(false);

    // Mode bảo trì
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceToggleLoading, setMaintenanceToggleLoading] =
      useState(false);

    /* =====================================================
      QUYỀN ADMIN CỰC HẠN
    ===================================================== */

  async function runAdminAction(
  action:
    | "create"
    | "delete"
    | "create_all"
    | "delete_cohort"
    | "grant_maintenance"
    | "revoke_maintenance",
  targetMssv?: string
) {
  const maintenanceTargetMssv =
  (targetMssv ?? maintenanceMssv).trim();
  
  if (!adminPassword.trim()) {
    alert(
      "Vui lòng nhập lại mật khẩu quản trị viên."
    );
    return;
  }

  if (action === "create" && !accountMssv.trim()) {
    alert("Vui lòng nhập MSSV.");
    return;
  }

  if (action === "delete" && !deleteMssv.trim()) {
    alert("Vui lòng nhập MSSV.");
    return;
  }

  if (
    action === "delete_cohort" &&
    !cohortKey.trim()
  ) {
    alert("Vui lòng nhập khóa.");
    return;
  }

  if (
    (action === "grant_maintenance" ||
      action === "revoke_maintenance") &&
    !maintenanceTargetMssv
  ) {
    alert("Vui lòng nhập MSSV.");
    return;
  }

  setAdminActionLoading(true);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert("Phiên đăng nhập đã hết hạn.");
      router.push("/");
      return;
    }

    const response = await fetch(
      "/api/admin/account-actions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action,
          mssv:
            action === "create"
              ? accountMssv.trim()
              : action === "delete"
              ? deleteMssv.trim()
              : action === "grant_maintenance" ||
                action === "revoke_maintenance"
              ? maintenanceTargetMssv
              : undefined,
          cohortKey:
            action === "delete_cohort"
              ? cohortKey.trim()
              : undefined,
          adminPassword,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      alert(
        result.error ??
          "Không thể thực hiện thao tác."
      );
      return;
    }

    alert(result.message);

    if (action === "create") {
      setAccountMssv("");
    }

    if (action === "delete") {
      setDeleteMssv("");
    }

    if (action === "delete_cohort") {
      setCohortKey("");
    }

    if (
      action === "grant_maintenance" ||
      action === "revoke_maintenance"
    ) {
      setMaintenanceMssv("");
      await loadMaintenanceAccess();
    }

    // Nếu vừa xoá tài khoản, load lại danh sách
    if (
      action === "delete" ||
      action === "delete_cohort" ||
      action === "create" ||
      action === "create_all"
    ) {
      window.location.reload();
    }
  } catch (error) {
    console.error(
      "ADMIN ACTION ERROR:",
      error
    );

    alert(
      "Không thể kết nối tới máy chủ."
    );
  } finally {
    setAdminActionLoading(false);
  }
}
      const [qaList, setQaList] = useState<QA[]>([]);
      const [qaQuestion, setQaQuestion] = useState("");
      const [qaAnswer, setQaAnswer] = useState("");
      const [qaLoading, setQaLoading] = useState(false);
      const [qaListOpen, setQaListOpen] = useState(false);

      async function loadQA() {
        const { data, error } = await supabase
          .from("qa")
          .select("id, question, answer, created_at, sort_order")
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });

        if (error) {
          console.error("LOAD ADMIN QA ERROR:", error);
          return;
        }

        setQaList(data ?? []);
      }

      /* =================================================
         DI CHUYỂN Q&A
      ================================================= */
      
      async function moveQA(index: number, direction: -1 | 1) {
        const targetIndex = index + direction;

        // Không vượt quá đầu hoặc cuối danh sách
        if (targetIndex < 0 || targetIndex >= qaList.length) {
          return;
        }

        // Đổi vị trí hai câu hỏi trong danh sách
        const reordered = [...qaList];
        [reordered[index], reordered[targetIndex]] = [
          reordered[targetIndex],
          reordered[index],
        ];

        // Cập nhật giao diện ngay
        const previousList = qaList;
        setQaList(reordered);

        try {
          // Lưu lại thứ tự mới vào Supabase
          const results = await Promise.all(
            reordered.map((qa, position) =>
              supabase
                .from("qa")
                .update({ sort_order: position + 1 })
                .eq("id", qa.id)
            )
          );

          const failed = results.some((result) => result.error);

          if (failed) {
            console.error(
              "UPDATE QA ORDER ERROR:",
              results.filter((result) => result.error)
            );

            await loadQA();
            alert("Không thể cập nhật thứ tự câu hỏi. Vui lòng thử lại.");
            return;
          }

          // Cập nhật sort_order trong state sau khi lưu thành công
          setQaList(
            reordered.map((qa, position) => ({
              ...qa,
              sort_order: position + 1,
            }))
          );
        } catch (error) {
          console.error("MOVE QA ERROR:", error);
          setQaList(previousList);
          alert("Không thể kết nối tới máy chủ.");
        }
      }

      /* =================================================
         THÊM Q&A
      ================================================= */

      async function handleAddQA() {
        const question = qaQuestion.trim();
        const answer = qaAnswer.trim();

        if (!question) {
          alert("Vui lòng nhập Question.");
          return;
        }

        if (!answer) {
          alert("Vui lòng nhập Answer.");
          return;
        }

        setQaLoading(true);

        try {
          const { data, error } = await supabase
            .from("qa")
            .insert({
              question,
              answer,
              sort_order: qaList.length + 1,
            })
            .select()
            .single();

          if (error) {
            console.error("ADD QA ERROR:", error);
            alert("Không thể thêm Q&A.");
            return;
          }

          setQaList((prev) => [...prev, data]);

          setQaQuestion("");
          setQaAnswer("");

          alert("Đã thêm Q&A.");
        } finally {
          setQaLoading(false);
        }
      }

      /* =================================================
         XOÁ Q&A
      ================================================= */

      async function handleDeleteQA(id: number) {
        const confirmed = window.confirm(
          "Bạn có chắc muốn xoá câu hỏi này không?"
        );

        if (!confirmed) return;

        setQaLoading(true);

        try {
          const { error } = await supabase
            .from("qa")
            .delete()
            .eq("id", id);

          if (error) {
            console.error("DELETE QA ERROR:", error);
            alert("Không thể xoá Q&A.");
            return;
          }

          setQaList((prev) =>
            prev.filter((qa) => qa.id !== id)
          );

          alert("Đã xoá Q&A.");
        } finally {
          setQaLoading(false);
        }
      }

  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] =
  useState("Quản trị viên");

  async function loadMaintenanceAccess() {
  setMaintenanceLoading(true);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setMaintenanceStudents([]);
      return;
    }

    const response = await fetch(
      "/api/admin/account-actions",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ?? "Không thể tải danh sách thẻ vàng."
      );
    }

    setMaintenanceStudents(result.students ?? []);
  } catch (error) {
    console.error("LOAD MAINTENANCE ACCESS ERROR:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách thẻ vàng."
    );
  } finally {
    setMaintenanceLoading(false);
  }
}

      /* =================================================
         TOGGLE Trạng thái bảo trì
      ================================================= */

    async function toggleMaintenance() {
      const nextMode = !maintenanceMode;

      const confirmed = window.confirm(
        nextMode
          ? "Bạn có chắc chắn muốn BẮT ĐẦU BẢO TRÌ? Sinh viên sẽ bị hạn chế truy cập khi chế độ bảo trì được áp dụng."
          : "Bạn có chắc chắn muốn GỠ BẢO TRÌ và mở lại quyền truy cập?"
      );

      if (!confirmed) return;

      setMaintenanceToggleLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          alert("Phiên đăng nhập đã hết hạn.");
          router.push("/");
          return;
        }

        const response = await fetch("/api/admin/account-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "set_maintenance",
            maintenanceMode: nextMode,
            adminPassword: adminPassword,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.error ?? "Không thể cập nhật trạng thái bảo trì.");
          return;
        }

        setMaintenanceMode(result.maintenanceMode ?? false);
        alert(result.message);
      } catch (error) {
        console.error("TOGGLE MAINTENANCE ERROR:", error);
        alert("Không thể kết nối tới máy chủ.");
      } finally {
        setMaintenanceToggleLoading(false);
      }
    }


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
        await loadQA();
        await loadMaintenanceAccess();
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
    <main className="min-h-screen bg-orange-50 px-6 py-10">
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
            className="cursor-pointer rounded-lg border-4 border-red-200 px-4 py-2 text-xl font-medium text-red-600 transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
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
          className="mb-6 cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0.5 hover:shadow-md"
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

          <div className="mt-5 flex flex-col items-center gap-8 md:flex-row">

            {/* ==========================================
                THỐNG KÊ ĐẠT / KHÔNG ĐẠT
            ========================================== */}

            <div className="flex flex-1 gap-4">

              <div className="flex-1 rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">
                  Đạt
                </p>

                <p className="mt-2 text-3xl font-bold text-green-600">
                  {stats.passed}
                </p>
              </div>

              <div className="flex-1 rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">
                  Không đạt
                </p>

                <p className="mt-2 text-3xl font-bold text-red-600">
                  {stats.failed}
                </p>
              </div>

            </div>

            {/* ==========================================
                BIỂU ĐỒ TRÒN
            ========================================== */}

            <div className="flex w-full flex-1 items-center justify-center gap-8 md:w-auto">

              {(() => {
                const passed = stats.passed;
                const failed = stats.failed;
                const total = passed + failed;

                const passedPercent =
                  total > 0
                    ? (passed / total) * 100
                    : 0;

                const failedPercent =
                  total > 0
                    ? (failed / total) * 100
                    : 0;

                return (
                  <>
                    {/* PIE CHART */}

                    <div
                      className="relative h-40 w-40 shrink-0 rounded-full"
                      style={{
                        background:
                          total === 0
                            ? "#e5e7eb"
                            : `conic-gradient(
                                #16a34a 0% ${passedPercent}%,
                                #dc2626 ${passedPercent}% 100%
                              )`,
                      }}
                    >
                      {/* Lỗ tròn ở giữa → donut chart */}
                      <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {total}
                          </p>

                          <p className="text-xs text-gray-500">
                            hồ sơ
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CHÚ THÍCH */}

                    <div className="space-y-3">

                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-green-600" />

                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Đạt
                          </p>

                          <p className="text-sm text-gray-500">
                            {passedPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-600" />

                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Không đạt
                          </p>

                          <p className="text-sm text-gray-500">
                            {failedPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                    </div>
                  </>
                );
              })()}

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
                    className="cursor-pointer rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600  transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
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
            SECTION 4 - QUẢN LÝ Q&A
        ================================================= */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            4. Quản lý câu hỏi thường gặp
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Thêm hoặc xoá các câu hỏi và câu trả lời hiển thị
            trên trang Q&A của sinh viên.
          </p>

          {/* ==========================================
              THÊM Q&A
          ========================================== */}

          <div className="mt-6 rounded-xl border border-gray-200 p-5">

            <h3 className="text-lg font-semibold text-gray-800">
              Thêm câu hỏi
            </h3>

            {/* QUESTION */}

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Question
              </label>

              <input
                type="text"
                value={qaQuestion}
                onChange={(e) =>
                  setQaQuestion(e.target.value)
                }
                placeholder="Nhập câu hỏi..."
                disabled={qaLoading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              />
            </div>

            {/* ANSWER */}

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Answer
              </label>

              <textarea
                value={qaAnswer}
                onChange={(e) =>
                  setQaAnswer(e.target.value)
                }
                placeholder="Nhập câu trả lời..."
                rows={6}
                disabled={qaLoading}
                className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              />
            </div>

            <div className="flex justify-end">
              <div className="menu-btn-wrapper menu-btn-wrapper-footer">
              <button
                type="button"
                onClick={handleAddQA}
                disabled={qaLoading}
                className="menu-btn menu-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                {qaLoading
                  ? "Đang xử lý..."
                  : "Thêm Q&A"}
              </button>
              </div>
            </div>

          </div>

          {/* ==========================================
              DANH SÁCH Q&A
          ========================================== */}

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setQaListOpen((prev) => !prev)}
              aria-expanded={qaListOpen}
              className="cursor-pointer flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left text-lg font-semibold transition hover:bg-gray-100"
            >
              <div>
              <span className="font-semibold">Danh sách các câu hỏi</span>

              <p className="mt-1 text-lg text-gray-500">
                {qaLoading ? (
                  "Đang tải danh sách..."
                ) : (
                  <>
                    Số câu hỏi hiện tại:{" "}
                    <span className="font-bold text-red-600">
                      {qaList.length}
                    </span>
                  </>
                )}
              </p>
              </div>

              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${
                  qaListOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {qaListOpen && (
              <div className="border-t border-gray-200 p-4">
                {qaList.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                Chưa có câu hỏi nào.
              </div>
            ) : (
              <div className="space-y-3">                
                {qaList.map((qa, index) => (
                  <motion.div
                    key={qa.id}
                    layout
                    transition={{
                      layout: {
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      },
                    }}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-400">
                          Câu hỏi #{index + 1}
                        </p>

                        <p className="mt-1 font-semibold text-gray-800">
                          {qa.question}
                        </p>

                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-500">
                          {qa.answer}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveQA(index, -1)}
                          disabled={qaLoading || index === 0}
                          title="Đẩy câu hỏi lên"
                          aria-label="Đẩy câu hỏi lên"
                          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveQA(index, 1)}
                          disabled={qaLoading || index === qaList.length - 1}
                          title="Đẩy câu hỏi xuống"
                          aria-label="Đẩy câu hỏi xuống"
                          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQA(qa.id)}
                          disabled={qaLoading}
                          className="cursor-pointer rounded-lg border-4 border-red-200 px-4 py-2 text-xl font-medium text-red-600 transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Xoá
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
              </div>
            )}
          </div>

        </section>

        {/* =================================================
           SECTION 5 - RESET MẬT KHẨU SINH VIÊN
        ================================================= */}

        <section className="mt-8 rounded-2xl bg-red-100 p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            5. Reset mật khẩu sinh viên
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Reset mật khẩu về ngày tháng năm sinh của sinh viên.
            Sau khi reset, sinh viên sẽ được yêu cầu đổi mật khẩu.
          </p>

          <div className="mt-5 max-w-xl">
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

            <div className="menu-btn-wrapper-inline">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="menu-btn menu-btn-red disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetLoading
                ? "Đang reset..."
                : "Reset mật khẩu"}
            </button>
            </div>
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
        </div>

        </section>

        {/* =====================================================
            SECTION 6 — LỆNH QUẢN TRỊ ĐẶC BIỆT
        ===================================================== */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-semibold text-gray-900">
            6. Lệnh quản trị đặc biệt
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Các thao tác bên dưới có thể tạo hoặc xoá dữ liệu
            tài khoản. Vui lòng xác thực lại mật khẩu quản trị
            trước khi thực hiện.
          </p>

          {/* ================================================
              XÁC THỰC ADMIN
          ================================================ */}

          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-md">
              <label className="mb-2 block text-center font-medium text-gray-700">
                Xác nhận mật khẩu quản trị viên
              </label>

              <input
                type="password"
                value={adminPassword}
                onChange={(e) =>
                  setAdminPassword(e.target.value)
                }
                placeholder="Nhập lại mật khẩu quản trị viên"
                autoComplete="current-password"
                spellCheck={false}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              <p className="mt-2 text-center text-xs text-gray-500">
                Mật khẩu phải được nhập trước khi thực thi các lệnh quản trị bên dưới
              </p>
            </div>
          </div>

          {/* ================================================
              1. TẠO 1 TÀI KHOẢN
          ================================================ */}

          <div className="mt-8 rounded-xl border border-gray-200 p-5">

            <h3 className="text-lg font-semibold text-gray-800">
              5.1. Tạo tài khoản sinh viên
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Nhập MSSV để tạo tài khoản theo thông tin trong
              bảng sinh viên.
            </p>

            <div className="mt-4 flex gap-3">

              <input
                type="text"
                value={accountMssv}
                onChange={(e) =>
                  setAccountMssv(e.target.value)
                }
                placeholder="Nhập MSSV"
                spellCheck={false}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              <div className="menu-btn-wrapper-inline">
              <button
                type="button"
                disabled={adminActionLoading}
                onClick={() =>
                  runAdminAction("create")
                }
                className="menu-btn menu-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adminActionLoading
                  ? "Đang xử lý..."
                  : "Tạo tài khoản"}
              </button>
              </div>

            </div>
          </div>

          {/* ================================================
              2. XOÁ 1 TÀI KHOẢN
          ================================================ */}

          <div className="mt-5 rounded-xl border border-gray-200 p-5">

            <h3 className="text-lg font-semibold text-gray-800">
              5.2. Xoá tài khoản sinh viên
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Xoá tài khoản Auth, profile, hồ sơ và minh chứng
              của MSSV được nhập.
            </p>

            <div className="mt-4 flex gap-3">

              <input
                type="text"
                value={deleteMssv}
                onChange={(e) =>
                  setDeleteMssv(e.target.value)
                }
                placeholder="Nhập MSSV"
                spellCheck={false}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />

              <div className="menu-btn-wrapper-inline">
              <button
                type="button"
                disabled={adminActionLoading}
                onClick={() => {
                  if (
                    !confirm(
                      `Bạn có chắc chắn muốn xoá toàn bộ dữ liệu của MSSV ${deleteMssv}?`
                    )
                  ) {
                    return;
                  }

                  runAdminAction("delete");
                }}
                className="menu-btn menu-btn-red disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adminActionLoading
                  ? "Đang xử lý..."
                  : "Xoá tài khoản"}
              </button>
              </div>

            </div>
          </div>

          {/* ================================================
              3. TẠO HÀNG LOẠT
          ================================================ */}

          <div className="mt-5 rounded-xl border border-gray-200 p-5">

            <h3 className="text-lg font-semibold text-gray-800">
              5.3. Tạo tài khoản hàng loạt
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Tạo tài khoản cho tất cả sinh viên trong database
              có ngày sinh. Mật khẩu mặc định được tạo từ ngày sinh.
            </p>

            <div className="flex justify-start">
            <div className="menu-btn-wrapper menu-btn-wrapper-footer">
            <button
              type="button"
              disabled={adminActionLoading}
              onClick={() => {
                if (
                  !confirm(
                    "Bạn có chắc chắn muốn tạo tài khoản hàng loạt cho tất cả sinh viên có ngày sinh?"
                  )
                ) {
                  return;
                }

                runAdminAction("create_all");
              }}
              className="menu-btn menu-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adminActionLoading
                ? "Đang xử lý..."
                : "Tạo tài khoản hàng loạt"}
            </button>
            </div>
            </div>

            <p className="mt-1 text-sl text-red-500">
              Lưu ý: Với số lượng sinh viên đông, việc tạo tài khoản hàng loạt
              có thể diễn ra lâu hơn các thao tác khác (khoảng 2 → 5 phút)
              Trong thời gian đó, vui lòng không reload hay thoát trang cho
              đến khi hộp thoại xuất hiện.
            </p>

          </div>

          {/* ================================================
              4. XOÁ HÀNG LOẠT THEO KHÓA
          ================================================ */}

          <div className="mt-5 rounded-xl border-2 border-red-300 bg-red-50 p-5">

            <h3 className="text-lg font-semibold text-red-700">
              5.4. XOÁ TÀI KHOẢN HÀNG LOẠT THEO KHÓA 
            </h3>

            <p className="mt-1 text-sm text-red-600">
              CẢNH BÁO: Thao tác này sẽ xoá tài khoản Auth,
              profile, hồ sơ, minh chứng và các dữ liệu liên quan
              của tất cả sinh viên thuộc khóa được chọn.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Ví dụ:
              <span className="font-medium">
                {" "}DGT1234 → khóa 23
              </span>,
              <span className="font-medium">
                {" "}DGT1213 → khóa 21
              </span>,
              <span className="font-medium">
                {" "}DGT1252 → khóa 25
              </span>.
            </p>

            <div className="mt-4 flex gap-3">

              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={cohortKey}
                onChange={(e) =>
                  setCohortKey(
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="Nhập khóa, VD: 23"
                spellCheck={false}
                className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />

              <div className="menu-btn-wrapper-inline">
              <button
                type="button"
                disabled={adminActionLoading}
                onClick={() => {
                  if (
                    !confirm(
                      `CẢNH BÁO NGUY HIỂM!\n\nTất cả tài khoản và dữ liệu của khóa ${cohortKey} sẽ bị xoá.\n\nBạn có chắc chắn muốn tiếp tục?`
                    )
                  ) {
                    return;
                  }

                  runAdminAction("delete_cohort");
                }}
                className="menu-btn menu-btn-red disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adminActionLoading
                  ? "Đang xử lý..."
                  : "XOÁ TOÀN BỘ KHÓA"}
              </button>
              </div>

            </div>

          </div>

          {/* ================================================
              5.5. CẤP / THU HỒI THẺ VÀNG
          ================================================ */}

          <div className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">

            <h3 className="text-lg font-semibold text-amber-800">
              5.5. CẤP / THU HỒI THẺ VÀNG VÀ KÍCH HOẠT BẢO TRÌ
            </h3>

            <p className="mt-1 text-sm text-amber-700">
              Cấp quyền truy cập trong thời gian bảo trì cho các
              sinh viên được lựa chọn. Thao tác yêu cầu xác thực
              lại mật khẩu quản trị viên.
            </p>

            {/* CẤP THẺ VÀNG */}

            <div className="mt-4">
              <label
                htmlFor="maintenance-mssv"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Mã số sinh viên
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">

                <input
                  id="maintenance-mssv"
                  type="text"
                  value={maintenanceMssv}
                  onChange={(e) =>
                    setMaintenanceMssv(e.target.value)
                  }
                  placeholder="Nhập MSSV cần cấp thẻ vàng"
                  spellCheck={false}
                  disabled={adminActionLoading}
                  className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:bg-gray-100"
                />

                <div className="menu-btn-wrapper-inline">
                  <button
                    type="button"
                    disabled={
                      adminActionLoading ||
                      !maintenanceMssv.trim()
                    }
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Bạn có chắc muốn cấp thẻ vàng cho sinh viên ${maintenanceMssv.trim()}?`
                        )
                      ) {
                        return;
                      }

                      runAdminAction("grant_maintenance");
                    }}
                    className="menu-btn menu-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adminActionLoading
                      ? "Đang xử lý..."
                      : "Cấp thẻ vàng"}
                  </button>
                </div>

              </div>
            </div>

            {/* DANH SÁCH THẺ VÀNG CÓ THỂ THU GỌN */}

            <div className="mt-6 overflow-hidden rounded-xl border border-amber-200 bg-white">

              <button
                type="button"
                onClick={() =>
                  setMaintenanceListOpen((prev) => !prev)
                }
                aria-expanded={maintenanceListOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left transition hover:bg-gray-50"
              >

                <div>
                  <h4 className="font-semibold text-gray-900">
                    Danh sách sinh viên có thẻ vàng
                  </h4>

                  <p className="mt-1 text-sm text-gray-500">
                    {maintenanceLoading
                      ? "Đang tải danh sách..."
                      : `${maintenanceStudents.length} sinh viên được cấp quyền`}
                  </p>
                </div>

                <span
                  className={`inline-flex transition-transform duration-200 ${
                    maintenanceListOpen ? "rotate-180" : ""
                  }`}
                >
                  <ChevronDown
                    size={18}
                    className={`transition-transform duration-200 ${
                      maintenanceListOpen ? "rotate-180" : ""
                    }`}
                  />
                </span>

              </button>
              
              {maintenanceListOpen && (
                <div className="border-t border-amber-100 p-4">

                  {maintenanceLoading ? (
                    <p className="py-4 text-center text-sm text-gray-500">
                      Đang tải danh sách thẻ vàng...
                    </p>
                  ) : maintenanceStudents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      Chưa có sinh viên nào được cấp thẻ vàng.
                    </div>
                  ) : (
                    <div className="space-y-3">

                      {maintenanceStudents.map((student) => (
                        <div
                          key={student.mssv}
                          className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">
                              {student.full_name}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              MSSV: {student.mssv}
                            </p>

                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              <span aria-hidden="true">★</span>
                              Thẻ vàng
                            </span>
                          </div>

                          <div className="menu-btn-wrapper-inline">
                            <button
                              type="button"
                              disabled={adminActionLoading}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Bạn có chắc muốn thu hồi thẻ vàng của ${student.full_name} (${student.mssv})?`
                                  )
                                ) {
                                  return;
                                }

                                runAdminAction(
                                  "revoke_maintenance",
                                  student.mssv
                                );
                              }}
                              className="menu-btn menu-btn-red disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {adminActionLoading
                                ? "Đang xử lý..."
                                : "Thu hồi thẻ"}
                            </button>
                          </div>

                        </div>
                      ))}

                    </div>
                  )}

                </div>
              )}

            </div>

            <p className="mt-3 text-xs leading-5 text-amber-800">
              Lưu ý: Admin mặc định được miễn chế độ bảo trì theo
              role. Danh sách trên chỉ hiển thị sinh viên có
              maintenance_access = TRUE.
            </p>
            
            <div
              className={`mt-5 rounded-xl border p-5 ${
                maintenanceMode
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="mb-4 text-center">
                <p
                  className={`text-sm font-semibold ${
                    maintenanceMode ? "text-green-800" : "text-amber-800"
                  }`}
                >
                  {maintenanceMode
                    ? "CHẾ ĐỘ BẢO TRÌ ĐANG BẬT"
                    : "CHẾ ĐỘ BẢO TRÌ ĐANG TẮT"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {maintenanceMode
                    ? "Hệ thống đang ở chế độ bảo trì."
                    : "Bật chế độ này khi cần tạm ngưng quyền truy cập thông thường."}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleMaintenance}
                disabled={maintenanceToggleLoading}
                className={`w-full cursor-pointer rounded-xl px-5 py-5 text-lg font-extrabold tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
                  maintenanceMode
                    ? "bg-green-700 hover:bg-green-800"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {maintenanceToggleLoading
                  ? "ĐANG CẬP NHẬT..."
                  : maintenanceMode
                  ? "GỠ BẢO TRÌ"
                  : "BẮT ĐẦU BẢO TRÌ"}
              </button>
            </div>


          </div>

        </section>

      </div>
    </main>
  );
}