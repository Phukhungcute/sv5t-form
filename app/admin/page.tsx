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

type AccountStudent = {
  mssv: string;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  class_name: string | null;
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

    // Danh sách reset mật khẩu
  const [resetListOpen, setResetListOpen] =
    useState(false);

  const [resetSearch, setResetSearch] =
    useState("");

  const [selectedResetMssv, setSelectedResetMssv] =
    useState<string[]>([]);

  async function handleResetSelectedPasswords() {
  setResetMessage("");
  setResetError("");

  if (selectedResetMssv.length === 0) {
    setResetError("Vui lòng chọn ít nhất một sinh viên.");
    return;
  }

  const confirmed = window.confirm(
    `Bạn có chắc muốn reset mật khẩu của ${selectedResetMssv.length} sinh viên về ngày tháng năm sinh không?\n\nSau khi reset, các sinh viên sẽ phải đổi mật khẩu khi đăng nhập.`
  );

  if (!confirmed) return;

  setResetLoading(true);

  try {
    // 1. Lấy access token của admin
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

    // 2. Gọi API một lần cho toàn bộ danh sách được chọn
    const response = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        mssvs: selectedResetMssv,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setResetError(result?.error ?? "Không thể reset mật khẩu.");
      return;
    }

    const results = Array.isArray(result?.results)
      ? result.results as {
          mssv: string;
          fullName: string | null;
          success: boolean;
          message: string;
        }[]
      : [];

    const successCount =
      typeof result?.successCount === "number"
        ? result.successCount
        : results.filter((item) => item.success).length;

    const failedCount =
      typeof result?.failedCount === "number"
        ? result.failedCount
        : results.filter((item) => !item.success).length;

    setResetMessage(
      result?.message ??
        `Hoàn tất: thành công ${successCount}, thất bại ${failedCount}.`
    );

    if (successCount > 0) {
      alert(
        `Đã reset mật khẩu thành công cho ${successCount} sinh viên.`
      );
    }

    // 3. Nếu có sinh viên thất bại, giữ lại những MSSV đó
    const failedMssvs = results
      .filter((item) => !item.success)
      .map((item) => item.mssv);

    setSelectedResetMssv(failedMssvs);

    // 4. Hiển thị chi tiết những trường hợp thất bại
    if (failedMssvs.length > 0) {
      const details = results
        .filter((item) => !item.success)
        .map((item) => `${item.mssv}: ${item.message}`)
        .join("\n");

      setResetError(
        `Có ${failedCount} sinh viên chưa reset thành công:\n${details}`
      );
    }

    // 5. Tải lại danh sách tài khoản
    await loadStudentAccountLists();
  } catch (error) {
    console.error("ADMIN RESET PASSWORD ERROR:", error);

    setResetError(
      "Không thể kết nối đến máy chủ. Nếu request bị gián đoạn, hãy kiểm tra trạng thái tài khoản trước khi thử lại."
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

  // Danh sách tài khoản sinh viên để tạo/xoá
    const [studentsWithoutAccount, setStudentsWithoutAccount] =
      useState<AccountStudent[]>([]);

    const [studentsWithAccount, setStudentsWithAccount] =
      useState<AccountStudent[]>([]);

    // MSSV được chọn
    const [selectedCreateMssv, setSelectedCreateMssv] =
      useState<string[]>([]);

    const [selectedDeleteMssv, setSelectedDeleteMssv] =
      useState<string[]>([]);

    // Thu gọn / mở rộng
    const [createListOpen, setCreateListOpen] =
      useState(false);

    const [deleteListOpen, setDeleteListOpen] =
      useState(false);

    // Tìm kiếm
    const [createSearch, setCreateSearch] = useState("");
    const [deleteSearch, setDeleteSearch] = useState("");

    // Trạng thái tải danh sách
    const [accountListLoading, setAccountListLoading] =
      useState(false);

    const [selectedAccountActionLoading, setSelectedAccountActionLoading] =
      useState(false);

    async function loadStudentAccountLists() {
      setAccountListLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        const response = await fetch(
          "/api/admin/student-account-list",
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
            result.error ?? "Không thể tải danh sách tài khoản."
          );
        }

        setStudentsWithoutAccount(
          result.studentsWithoutAccount ?? []
        );

        setStudentsWithAccount(
          result.studentsWithAccount ?? []
        );
      } catch (error) {
        console.error("LOAD STUDENT ACCOUNT LIST ERROR:", error);

        alert(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách tài khoản."
        );
      } finally {
        setAccountListLoading(false);
      }
    }

    // ==========================================
    // THẺ VÀNG - MAINTENANCE ACCESS
    // ==========================================

    type MaintenanceStudent = {
      mssv: string;
      full_name: string | null;
      birth_date: string | null;
      gender: string | null;
      class_name: string | null;
      maintenance_access: boolean;
    };

    const [maintenanceSearch, setMaintenanceSearch] =
      useState("");

    const [originalMaintenanceAccess, setOriginalMaintenanceAccess] =
      useState<Record<string, boolean>>({});
    
    const [maintenanceMssv, setMaintenanceMssv] =
      useState("");

    const [maintenanceStudents, setMaintenanceStudents] =
      useState<MaintenanceStudent[]>([]);

    const [maintenanceLoading, setMaintenanceLoading] =
      useState(false);

    const [maintenanceListOpen, setMaintenanceListOpen] =
      useState(false);

    const [maintenanceSaving, setMaintenanceSaving] = useState(false);

    // Mode bảo trì
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceToggleLoading, setMaintenanceToggleLoading] =
      useState(false);
    
    // Tải danh sách thẻ vàng
    async function loadMaintenanceStudents() {
      setMaintenanceLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        const response = await fetch("/api/admin/maintenance-access", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "Không thể tải danh sách thẻ vàng."
          );
        }

        const students: MaintenanceStudent[] = result.students ?? [];

        setMaintenanceStudents(students);

        setOriginalMaintenanceAccess(
          Object.fromEntries(
            students.map((student) => [
              student.mssv,
              student.maintenance_access,
            ])
          )
        );
      } catch (error) {
        console.error("LOAD MAINTENANCE STUDENTS ERROR:", error);

        alert(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách thẻ vàng."
        );
      } finally {
        setMaintenanceLoading(false);
      }
    }

    // Toggle trạng thái bảo trì cho SV
    function toggleMaintenanceAccess(mssv: string) {
      setMaintenanceStudents((previous) =>
        previous.map((student) =>
          student.mssv === mssv
            ? {
                ...student,
                maintenance_access: !student.maintenance_access,
              }
            : student
        )
      );
    }

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
    | "revoke_maintenance"
    | "update_maintenance_bulk",
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

      const [editingQA, setEditingQA] = useState<QA | null>(null);
      const [editQAQuestion, setEditQAQuestion] = useState("");
      const [editQAAnswer, setEditQAAnswer] = useState("");

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

      function handleOpenEditQA(qa: QA) {
        setEditingQA(qa);
        setEditQAQuestion(qa.question);
        setEditQAAnswer(qa.answer);
      }

      /* =================================================
        CẬP NHẬT Q&A
      ================================================= */

      async function handleUpdateQA() {
        if (!editingQA) {
          return;
        }

        const question = editQAQuestion.trim();
        const answer = editQAAnswer.trim();

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
          const { error } = await supabase
            .from("qa")
            .update({
              question,
              answer,
            })
            .eq("id", editingQA.id);

          if (error) {
            console.error("UPDATE QA ERROR:", error);
            alert("Không thể cập nhật Q&A. Vui lòng thử lại.");
            return;
          }

          // Cập nhật giao diện ngay sau khi Supabase xác nhận không có lỗi.
          setQaList((prev) =>
            prev.map((qa) =>
              qa.id === editingQA.id
                ? {
                    ...qa,
                    question,
                    answer,
                  }
                : qa
            )
          );

          setEditingQA(null);
          setEditQAQuestion("");
          setEditQAAnswer("");

          alert("Đã cập nhật Q&A thành công.");
        } catch (error: unknown) {
          console.error("UPDATE QA ERROR:", error);
          alert("Không thể kết nối tới máy chủ.");
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

async function saveMaintenanceChanges() {
  if (!adminPassword.trim()) {
    alert("Vui lòng nhập lại mật khẩu quản trị viên.");
    return;
  }

  const changes = maintenanceStudents
    .filter(
      (student) =>
        originalMaintenanceAccess[student.mssv] !==
        student.maintenance_access
    )
    .map((student) => ({
      mssv: student.mssv,
      maintenance_access: student.maintenance_access,
    }));

  if (changes.length === 0) {
    alert("Không có thay đổi nào cần lưu.");
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
          action: "update_maintenance_bulk",
          changes,
          adminPassword,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      alert(
        result.error ??
          "Không thể cập nhật quyền thẻ vàng."
      );
      return;
    }

    alert(result.message);

    // Tải lại trạng thái thực tế từ cơ sở dữ liệu
    await loadMaintenanceAccess();
  } catch (error) {
    console.error(
      "SAVE MAINTENANCE ACCESS ERROR:",
      error
    );

    alert("Không thể kết nối tới máy chủ.");
  } finally {
    setAdminActionLoading(false);
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

    /* =================================================
         Hiển thị trạng thái bảo trì
      ================================================= */

    async function loadMaintenanceStatus() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("Không thể xác thực phiên đăng nhập.");
        }

        const response = await fetch("/api/admin/account-actions", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const result: {
          maintenanceMode?: boolean;
          error?: string;
        } = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "Không thể tải trạng thái bảo trì."
          );
        }

        setMaintenanceMode(result.maintenanceMode ?? false);
      } catch (error: unknown) {
        console.error("LOAD MAINTENANCE STATUS ERROR:", error);

        if (error instanceof Error) {
          console.error(error.message);
        }
      }
    }

    useEffect(() => {
      void loadMaintenanceStatus();
    }, []);

    /* =================================================
         FILTER STUDENTS
      ================================================= */

    const filteredStudentsWithoutAccount = studentsWithoutAccount.filter(
      (student) => {
        const query = createSearch.trim().toLowerCase();

        return (
          !query ||
          student.mssv.toLowerCase().includes(query) ||
          (student.full_name ?? "").toLowerCase().includes(query) ||
          (student.class_name ?? "").toLowerCase().includes(query)
        );
      }
    );

    const filteredStudentsWithAccount = studentsWithAccount.filter(
      (student) => {
        const query = deleteSearch.trim().toLowerCase();

        return (
          !query ||
          student.mssv.toLowerCase().includes(query) ||
          (student.full_name ?? "").toLowerCase().includes(query) ||
          (student.class_name ?? "").toLowerCase().includes(query)
        );
      }
    );

    const filteredStudentsForReset = studentsWithAccount.filter(
      (student) => {
        const query = resetSearch.trim().toLowerCase();

        return (
          !query ||
          student.mssv.toLowerCase().includes(query) ||
          (student.full_name ?? "").toLowerCase().includes(query) ||
          (student.class_name ?? "").toLowerCase().includes(query)
        );
      }
    );

    function toggleSelectedMssv(
      mssv: string,
      selected: string[],
      setSelected: (value: string[]) => void
    ) {
      setSelected(
        selected.includes(mssv)
          ? selected.filter((item) => item !== mssv)
          : [...selected, mssv]
      );
    }

    function toggleAllVisibleMssv(
      visibleMssv: string[],
      selected: string[],
      setSelected: (value: string[]) => void
    ) {
      const allVisibleSelected =
        visibleMssv.length > 0 &&
        visibleMssv.every((mssv) => selected.includes(mssv));

      if (allVisibleSelected) {
        setSelected(
          selected.filter((mssv) => !visibleMssv.includes(mssv))
        );
      } else {
        setSelected(
          [...new Set([...selected, ...visibleMssv])]
        );
      }
    }



    async function runSelectedAccountAction(
      action: "create_selected" | "delete_selected"
    ) {
      const selectedMssv =
        action === "create_selected"
          ? selectedCreateMssv
          : selectedDeleteMssv;

      if (!adminPassword.trim()) {
        alert("Vui lòng nhập lại mật khẩu quản trị viên.");
        return;
      }

      if (selectedMssv.length === 0) {
        alert("Vui lòng chọn ít nhất một sinh viên.");
        return;
      }

      const isCreate = action === "create_selected";
      const actionLabel = isCreate ? "tạo tài khoản" : "xoá tài khoản";

      const confirmed = window.confirm(
        `Bạn đã chọn ${selectedMssv.length} sinh viên để ${actionLabel}.\n\n` +
          (isCreate
            ? "Tài khoản sẽ được tạo theo thông tin sinh viên trong database."
            : "Tài khoản sinh viên và dữ liệu liên quan có thể bị xoá vĩnh viễn.") +
          "\n\nBạn có chắc chắn muốn tiếp tục?"
      );

      if (!confirmed) return;

      setSelectedAccountActionLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
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
            action,
            mssvs: selectedMssv,
            adminPassword,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.error ?? "Không thể thực hiện thao tác.");
          return;
        }

        alert(result.message ?? "Đã xử lý xong.");

        if (isCreate) {
          setSelectedCreateMssv([]);
        } else {
          setSelectedDeleteMssv([]);
        }

        await loadStudentAccountLists();
      } catch (error) {
        console.error("SELECTED ACCOUNT ACTION ERROR:", error);
        alert("Không thể kết nối tới máy chủ.");
      } finally {
        setSelectedAccountActionLoading(false);
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
        await loadStudentAccountLists();
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
                          onClick={() => handleOpenEditQA(qa)}
                          disabled={qaLoading}
                          className="cursor-pointer whitespace-nowrap rounded-lg border-4 border-blue-200 px-2 py-1 text-xl font-medium text-blue-600 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Chỉnh sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQA(qa.id)}
                          disabled={qaLoading}
                          className="cursor-pointer rounded-lg border-4 border-red-200 px-2 py-1 text-xl font-medium text-red-600 transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
            SECTION 5 - CHỈNH SỬA THÔNG ĐIỆP
        ================================================= */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            5. Chỉnh sửa thông điệp
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Quản lý và chỉnh sửa thông điệp hiển thị trên hệ thống dành cho sinh viên.
          </p>

          <div className="mt-5 rounded-xl border border-gray-200 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Thông tin chức năng */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 10h8M8 14h5m-8 6 3.5-3H19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
                    />
                  </svg>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">
                    Thông điệp hệ thống
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Chỉnh sửa nội dung thông báo để cập nhật thông tin đến sinh viên.
                  </p>
                </div>
              </div>

              {/* Nút chuyển trang */}
                <div className="menu-btn-wrapper-inline">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/admin/editmessages";
                    }}
                    className="menu-btn menu-btn-blue"
                  >
                    Chỉnh sửa thông điệp →
                  </button>
                </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SECTION 6 - RESET MẬT KHẨU SINH VIÊN
        ===================================================== */}

        <section className="mt-8 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-red-700">
                6. Reset mật khẩu sinh viên
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Reset mật khẩu của sinh viên về mật khẩu mặc định {" "}
                <span className="font-medium">DDMMYYYY</span>.
                Sau khi reset, sinh viên sẽ phải đổi mật khẩu khi đăng nhập.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextOpen = !resetListOpen;

                setResetListOpen(nextOpen);
                setResetMessage("");
                setResetError("");

                if (nextOpen && studentsWithAccount.length === 0) {
                  void loadStudentAccountLists();
                }
              }}
              className="cursor-pointer inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50"
            >
              {resetListOpen ? "Thu gọn danh sách" : "Chọn sinh viên"}

              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  resetListOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Thông báo kết quả */}
          {resetMessage && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {resetMessage}
            </div>
          )}

          {resetError && (
            <div
              role="alert"
              className="mt-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {resetError}
            </div>
          )}

          {resetListOpen && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              {/* Thanh công cụ */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-800">
                    Danh sách tài khoản sinh viên
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Đã chọn{" "}
                    <span className="font-semibold text-red-600">
                      {selectedResetMssv.length}
                    </span>{" "}
                    sinh viên
                  </p>
                </div>
              </div>

              {/* Tìm kiếm */}
              <div className="mt-4">
                <input
                  type="text"
                  value={resetSearch}
                  onChange={(event) => setResetSearch(event.target.value)}
                  placeholder="Tìm theo MSSV, họ tên hoặc lớp..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {/* Chọn tất cả sinh viên đang hiển thị */}
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudentsForReset.length > 0 &&
                      filteredStudentsForReset.every((student) =>
                        selectedResetMssv.includes(student.mssv)
                      )
                    }
                    onChange={(event) => {
                      toggleAllVisibleMssv(
                        filteredStudentsForReset.map((student) => student.mssv),
                        selectedResetMssv,
                        setSelectedResetMssv
                      );
                    }}
                    disabled={
                      filteredStudentsForReset.length === 0 || resetLoading
                    }
                    className="h-4 w-4 rounded border-gray-300 accent-red-600"
                  />

                  <span>Chọn tất cả kết quả đang hiển thị</span>
                </label>

                <span className="shrink-0 text-xs text-gray-500">
                  {filteredStudentsForReset.length} sinh viên
                </span>
              </div>

              {/* Danh sách sinh viên */}
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                {accountListLoading && studentsWithAccount.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    Đang tải danh sách sinh viên...
                  </div>
                ) : filteredStudentsForReset.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    {studentsWithAccount.length === 0
                      ? "Chưa có sinh viên nào có tài khoản."
                      : "Không tìm thấy sinh viên phù hợp."}
                  </div>
                ) : (
                  <div className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto">
                    {filteredStudentsForReset.map((student) => {
                      const selected = selectedResetMssv.includes(student.mssv);

                      return (
                        <label
                          key={student.mssv}
                          className={`flex cursor-pointer items-start gap-3 px-4 py-4 transition hover:bg-red-50/50 ${
                            selected ? "bg-red-50/70" : "bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              const checked = event.target.checked;

                              setSelectedResetMssv((prev) =>
                                checked
                                  ? [...prev, student.mssv]
                                  : prev.filter((mssv) => mssv !== student.mssv)
                              );
                            }}
                            disabled={resetLoading}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-red-600"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="break-words font-medium text-gray-800">
                                {student.full_name || "Chưa có họ tên"}
                              </p>

                              <span className="w-fit rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                {student.class_name || "Chưa có lớp"}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span>
                                MSSV:{" "}
                                <span className="font-medium text-gray-700">
                                  {student.mssv}
                                </span>
                              </span>

                              <span>
                                Ngày sinh:{" "}
                                {student.birth_date
                                  ? formatDateDisplay(student.birth_date)
                                  : "Chưa có"}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cảnh báo */}
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm leading-6 text-amber-800">
                  <span className="font-semibold">Lưu ý:</span>{" "}
                  Mật khẩu của tất cả sinh viên được chọn sẽ được đặt lại về ngày
                  sinh. Hãy kiểm tra kỹ danh sách trước khi thực hiện.
                </p>
              </div>

              {/* Nút reset */}
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => void loadStudentAccountLists()}
                  disabled={accountListLoading || resetLoading}
                  className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {accountListLoading ? "Đang làm mới..." : "Làm mới danh sách"}
                </button>

                <div className="menu-btn-wrapper-inline">
                  <button
                    type="button"
                    onClick={() => void handleResetSelectedPasswords()}
                    disabled={resetLoading || selectedResetMssv.length === 0}
                    className="menu-btn menu-btn-red disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resetLoading
                      ? "Đang reset mật khẩu..."
                      : `Reset mật khẩu (${selectedResetMssv.length})`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            SECTION 7 - LỆNH QUẢN TRỊ ĐẶC BIỆT
        ===================================================== */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-2xl font-semibold text-gray-900">
            7. Lệnh quản trị đặc biệt
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
              7.1. TẠO TÀI KHOẢN SINH VIÊN
          ================================================ */}

          <div className="mt-8 overflow-hidden rounded-xl border-2 border-blue-300">
            <button
              type="button"
              onClick={() => {
                const nextOpen = !createListOpen;
                setCreateListOpen(nextOpen);

                if (nextOpen && studentsWithoutAccount.length === 0) {
                  void loadStudentAccountLists();
                }
              }}
              aria-expanded={createListOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-3 bg-blue-50 px-5 py-4 text-left transition hover:bg-blue-100"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  7.1. Tạo tài khoản sinh viên
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  {accountListLoading
                    ? "Đang tải danh sách..."
                    : `${studentsWithoutAccount.length} sinh viên chưa có tài khoản`}
                </p>
              </div>

              <ChevronDown
                size={20}
                className={`shrink-0 transition-transform duration-200 ${
                  createListOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {createListOpen && (
              <div className="space-y-4 border-t border-gray-200 p-5">
                <p className="text-sm text-gray-600">
                  Chọn các sinh viên cần tạo tài khoản. Mật khẩu ban đầu được
                  tạo từ ngày sinh theo quy tắc hiện tại của hệ thống.
                </p>

                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Lưu ý: Với số lượng sinh viên đông, việc tạo tài khoản hàng
                  loạt có thể diễn ra lâu hơn các thao tác khác (khoảng 2 → 5 phút)
                  Trong thời gian đó, vui lòng không reload hay thoát trang cho đến
                  khi hộp thoại xuất hiện.
                </div>

                <input
                  type="search"
                  value={createSearch}
                  onChange={(e) => setCreateSearch(e.target.value)}
                  placeholder="Tìm theo MSSV, họ tên hoặc lớp..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudentsWithoutAccount.length > 0 &&
                        filteredStudentsWithoutAccount.every((student) =>
                          selectedCreateMssv.includes(student.mssv)
                        )
                      }
                      onChange={() =>
                        toggleAllVisibleMssv(
                          filteredStudentsWithoutAccount.map((student) => student.mssv),
                          selectedCreateMssv,
                          setSelectedCreateMssv
                        )
                      }
                      disabled={
                        accountListLoading ||
                        selectedAccountActionLoading ||
                        filteredStudentsWithoutAccount.length === 0
                      }
                      className="h-4 w-4 accent-blue-600"
                    />
                    Chọn tất cả đang hiển thị
                  </label>

                  <span className="text-sm text-gray-500">
                    Đã chọn:{" "}
                    <strong className="text-blue-700">
                      {selectedCreateMssv.length}
                    </strong>
                  </span>
                </div>

                {accountListLoading ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Đang tải danh sách sinh viên...
                  </p>
                ) : filteredStudentsWithoutAccount.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    {studentsWithoutAccount.length === 0
                      ? "Tất cả sinh viên hiện đã có tài khoản."
                      : "Không tìm thấy sinh viên phù hợp."}
                  </div>
                ) : (
                  <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                    {filteredStudentsWithoutAccount.map((student) => (
                      <label
                        key={student.mssv}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCreateMssv.includes(student.mssv)}
                          onChange={() =>
                            toggleSelectedMssv(
                              student.mssv,
                              selectedCreateMssv,
                              setSelectedCreateMssv
                            )
                          }
                          disabled={selectedAccountActionLoading}
                          className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-gray-900">
                              {student.full_name || "Chưa có họ tên"}
                            </span>

                            <span className="text-sm font-medium text-blue-700">
                              {student.mssv}
                            </span>
                          </div>

                          <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-gray-500 sm:grid-cols-3">
                            <span>
                              Ngày sinh:{" "}
                              {student.birth_date
                                ? formatDateDisplay(student.birth_date)
                                : "Chưa có"}
                            </span>

                            <span>
                              Giới tính: {student.gender || "Chưa có"}
                            </span>

                            <span>
                              Lớp: {student.class_name || "Chưa có"}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => void loadStudentAccountLists()}
                    disabled={accountListLoading || resetLoading}
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {accountListLoading ? "Đang làm mới..." : "Làm mới danh sách"}
                  </button>

                  <div className="menu-btn-wrapper-inline">
                    <button
                      type="button"
                      onClick={() => void runSelectedAccountAction("create_selected")}
                      disabled={
                        selectedAccountActionLoading ||
                        adminActionLoading ||
                        accountListLoading ||
                        selectedCreateMssv.length === 0
                      }
                      className="menu-btn menu-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {selectedAccountActionLoading
                        ? "Đang tạo tài khoản..."
                        : `Tạo tài khoản (${selectedCreateMssv.length})`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================
              7.2. XOÁ TÀI KHOẢN SINH VIÊN
          ================================================ */}

          <div className="mt-5 overflow-hidden rounded-xl border-2 border-red-300">
            <button
              type="button"
              onClick={() => {
                const nextOpen = !deleteListOpen;
                setDeleteListOpen(nextOpen);

                if (nextOpen && studentsWithAccount.length === 0) {
                  void loadStudentAccountLists();
                }
              }}
              aria-expanded={deleteListOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-3 bg-red-50 px-5 py-4 text-left transition hover:bg-red-100"
            >
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  7.2. Xoá tài khoản sinh viên
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  {accountListLoading
                    ? "Đang tải danh sách..."
                    : `${studentsWithAccount.length} sinh viên có tài khoản`}
                </p>
              </div>

              <ChevronDown
                size={20}
                className={`shrink-0 transition-transform duration-200 ${
                  deleteListOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {deleteListOpen && (
              <div className="space-y-4 border-t border-red-100 p-5">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Cảnh báo: Thao tác này có thể xoá tài khoản đăng nhập, hồ sơ,
                  minh chứng và dữ liệu liên quan của các sinh viên đã chọn.
                  Do đó các tài khoản sẽ không thể được tạo lại khi thực hiện
                  thao tác xoá.
                </div>

                <input
                  type="search"
                  value={deleteSearch}
                  onChange={(e) => setDeleteSearch(e.target.value)}
                  placeholder="Tìm theo MSSV, họ tên hoặc lớp..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudentsWithAccount.length > 0 &&
                        filteredStudentsWithAccount.every((student) =>
                          selectedDeleteMssv.includes(student.mssv)
                        )
                      }
                      onChange={() =>
                        toggleAllVisibleMssv(
                          filteredStudentsWithAccount.map((student) => student.mssv),
                          selectedDeleteMssv,
                          setSelectedDeleteMssv
                        )
                      }
                      disabled={
                        accountListLoading ||
                        selectedAccountActionLoading ||
                        filteredStudentsWithAccount.length === 0
                      }
                      className="h-4 w-4 accent-red-600"
                    />
                    Chọn tất cả đang hiển thị
                  </label>

                  <span className="text-sm text-gray-500">
                    Đã chọn:{" "}
                    <strong className="text-red-700">
                      {selectedDeleteMssv.length}
                    </strong>
                  </span>
                </div>

                {accountListLoading ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Đang tải danh sách sinh viên...
                  </p>
                ) : filteredStudentsWithAccount.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    {studentsWithAccount.length === 0
                      ? "Chưa có tài khoản sinh viên nào để xoá."
                      : "Không tìm thấy sinh viên phù hợp."}
                  </div>
                ) : (
                  <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                    {filteredStudentsWithAccount.map((student) => (
                      <label
                        key={student.mssv}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-red-300 hover:bg-red-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDeleteMssv.includes(student.mssv)}
                          onChange={() =>
                            toggleSelectedMssv(
                              student.mssv,
                              selectedDeleteMssv,
                              setSelectedDeleteMssv
                            )
                          }
                          disabled={selectedAccountActionLoading}
                          className="mt-1 h-4 w-4 shrink-0 accent-red-600"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-gray-900">
                              {student.full_name || "Chưa có họ tên"}
                            </span>

                            <span className="text-sm font-medium text-red-700">
                              {student.mssv}
                            </span>
                          </div>

                          <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-gray-500 sm:grid-cols-3">
                            <span>
                              Ngày sinh:{" "}
                              {student.birth_date
                                ? formatDateDisplay(student.birth_date)
                                : "Chưa có"}
                            </span>

                            <span>
                              Giới tính: {student.gender || "Chưa có"}
                            </span>

                            <span>
                              Lớp: {student.class_name || "Chưa có"}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => void loadStudentAccountLists()}
                    disabled={accountListLoading || resetLoading}
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {accountListLoading ? "Đang làm mới..." : "Làm mới danh sách"}
                  </button>

                  <div className="menu-btn-wrapper-inline">
                    <button
                      type="button"
                      onClick={() => void runSelectedAccountAction("delete_selected")}
                      disabled={
                        selectedAccountActionLoading ||
                        adminActionLoading ||
                        accountListLoading ||
                        selectedDeleteMssv.length === 0
                      }
                      className="menu-btn menu-btn-red disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {selectedAccountActionLoading
                        ? "Đang xoá tài khoản..."
                        : `Xoá tài khoản (${selectedDeleteMssv.length})`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================
              6.3. CẤP / THU HỒI THẺ VÀNG
          ================================================ */}

          <div className="mt-5 overflow-hidden rounded-xl border-2 border-amber-300">
            <button
              type="button"
              onClick={() => {
                const nextOpen = !maintenanceListOpen;

                setMaintenanceListOpen(nextOpen);

                if (nextOpen) {
                  void loadMaintenanceStudents();
                }
              }}
              aria-expanded={maintenanceListOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-3 bg-amber-50 px-5 py-4 text-left transition hover:bg-amber-100"
            >
              <div>
                <h3 className="text-lg font-semibold text-amber-800">
                  6.3. Cấp / thu hồi thẻ vàng
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  {maintenanceLoading
                    ? "Đang tải danh sách..."
                    : `${maintenanceStudents.filter((student) => student.maintenance_access).length} sinh viên đang có thẻ vàng`}
                </p>
              </div>

              <ChevronDown
                size={20}
                className={`shrink-0 transition-transform duration-200 ${
                  maintenanceListOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {maintenanceListOpen && (
              <div className="space-y-4 border-t border-amber-200 p-5">
                <p className="text-sm leading-6 text-gray-600">
                  Bật hoặc tắt thẻ vàng cho từng sinh viên. Các thay đổi chỉ được
                  lưu vào hệ thống sau khi bạn nhấn nút Lưu thay đổi.
                </p>

                <input
                  type="search"
                  value={maintenanceSearch}
                  onChange={(event) => setMaintenanceSearch(event.target.value)}
                  placeholder="Tìm theo MSSV, họ tên hoặc lớp..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />

                {maintenanceLoading ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Đang tải danh sách sinh viên...
                  </p>
                ) : (
                  <>
                    {(() => {
                      const normalizedSearch = maintenanceSearch
                        .trim()
                        .toLocaleLowerCase("vi");

                      const filteredStudents = maintenanceStudents.filter(
                        (student) =>
                          student.mssv.toLocaleLowerCase("vi").includes(normalizedSearch) ||
                          (student.full_name ?? "")
                            .toLocaleLowerCase("vi")
                            .includes(normalizedSearch) ||
                          (student.class_name ?? "")
                            .toLocaleLowerCase("vi")
                            .includes(normalizedSearch)
                      );

                      if (filteredStudents.length === 0) {
                        return (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                            {maintenanceStudents.length === 0
                              ? "Chưa có dữ liệu sinh viên."
                              : "Không tìm thấy sinh viên phù hợp."}
                          </div>
                        );
                      }

                      return (
                        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                          {filteredStudents.map((student) => (
                            <div
                              key={student.mssv}
                              className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 transition hover:border-amber-300 hover:bg-amber-50/50 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="font-semibold text-gray-900">
                                    {student.full_name || "Chưa có họ tên"}
                                  </span>

                                  <span className="text-sm font-medium text-amber-700">
                                    {student.mssv}
                                  </span>
                                </div>

                                <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-gray-500 sm:grid-cols-3">
                                  <span>
                                    Ngày sinh:{" "}
                                    {student.birth_date
                                      ? formatDateDisplay(student.birth_date)
                                      : "Chưa có"}
                                  </span>

                                  <span>
                                    Giới tính: {student.gender || "Chưa có"}
                                  </span>

                                  <span>
                                    Lớp: {student.class_name || "Chưa có"}
                                  </span>
                                </div>

                                <span
                                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    student.maintenance_access
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {student.maintenance_access
                                    ? "★ Đang có thẻ vàng"
                                    : "Chưa có thẻ vàng"}
                                </span>
                              </div>

                              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                                <span className="text-sm font-medium text-gray-600">
                                  {student.maintenance_access ? "Đang bật" : "Đang tắt"}
                                </span>

                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={student.maintenance_access}
                                  aria-label={`Thẻ vàng của ${student.full_name || student.mssv}`}
                                  onClick={() =>
                                    toggleMaintenanceAccess(student.mssv)
                                  }
                                  disabled={maintenanceSaving}
                                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                    student.maintenance_access
                                      ? "bg-amber-500"
                                      : "bg-gray-300"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                      student.maintenance_access
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => void loadMaintenanceStudents()}
                        disabled={maintenanceLoading || maintenanceSaving}
                        className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Làm mới danh sách
                      </button>

                      <div className="menu-btn-wrapper-inline">
                        <button
                          type="button"
                          onClick={() => void saveMaintenanceChanges()}
                          disabled={maintenanceSaving || maintenanceLoading}
                          className="menu-btn menu-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {maintenanceSaving
                            ? "Đang lưu thay đổi..."
                            : "Lưu thay đổi"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </section>

      </div>

      {/* POPUP CHỈNH SỬA Q&A */}
      {editingQA && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditingQA(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-qa-title"
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                id="edit-qa-title"
                className="text-xl font-bold text-gray-900"
              >
                Chỉnh sửa câu hỏi
              </h2>

              <button
                type="button"
                onClick={() => setEditingQA(null)}
                aria-label="Đóng popup"
                className="cursor-pointer rounded-lg px-3 py-1 text-2xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
              <label
                htmlFor="edit-qa-question"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Question
              </label>

              <input
                id="edit-qa-question"
                type="text"
                value={editQAQuestion}
                onChange={(e) => setEditQAQuestion(e.target.value)}
                placeholder="Nhập câu hỏi..."
                disabled={qaLoading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="edit-qa-answer"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Answer
              </label>

              <textarea
                id="edit-qa-answer"
                value={editQAAnswer}
                onChange={(e) => setEditQAAnswer(e.target.value)}
                placeholder="Nhập câu trả lời..."
                rows={6}
                disabled={qaLoading}
                className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingQA(null)}
                disabled={qaLoading}
                className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Huỷ
              </button>

              <button
                type="button"
                onClick={() => void handleUpdateQA()}
                disabled={qaLoading}
                className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {qaLoading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}