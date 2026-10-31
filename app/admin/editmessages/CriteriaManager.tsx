"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACADEMIC_YEAR } from "@/lib/constants";

import {
  CRITERION_INPUT_TYPES,
  REVIEW_LEVELS,
  REVIEW_LEVEL_CODES,
  REVIEW_SECTIONS,
  type CriterionInputType,
  type ReviewCriterion,
  type ReviewCriterionInput,
  type ReviewLevel,
  type ReviewSection,
} from "@/lib/review-criteria";

import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

type CriterionManagerForm = {
  section_key: ReviewSection;
  content: string;
  description: string;
  input_type: CriterionInputType;
};

const emptyForm: CriterionManagerForm = {
  section_key: "ethics",
  content: "",
  description: "",
  input_type: "text",
};

export default function CriteriaManager() {
  const [reviewLevel, setReviewLevel] =
    useState<ReviewLevel>("faculty");

  const [criteria, setCriteria] = useState<ReviewCriterion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [expandedSection, setExpandedSection] =
    useState<ReviewSection | null>("ethics");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [form, setForm] =
    useState<CriterionManagerForm>(emptyForm);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] =
    useState<string>("");

  const academicYear = ACADEMIC_YEAR.replace(/\s/g, "");

  const sectionCriteria = useMemo(() => {
    return REVIEW_SECTIONS.map((section) => ({
      ...section,
      items: criteria
        .filter((item) => item.section_key === section.key)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [criteria]);

  const callApi = useCallback(
    async (
      url: string,
      method: "GET" | "POST" | "PATCH" | "DELETE",
      body?: unknown,
    ): Promise<Response> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      return fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    },
    [],
  );

  const loadCriteria = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        academic_year: academicYear,
        review_level: reviewLevel,
      });

      const response = await callApi(
        `/api/admin/review-criteria?${params.toString()}`,
        "GET",
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Không thể tải tiêu chí.");
      }

      setCriteria(result.data ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi tải dữ liệu.",
      );
    } finally {
      setLoading(false);
    }
  }, [academicYear, reviewLevel, callApi]);

  useEffect(() => {
    void loadCriteria();
  }, [loadCriteria]);

  function startCreate(sectionKey: ReviewSection): void {
    setEditingId(null);
    setForm({
      ...emptyForm,
      section_key: sectionKey,
    });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function startEdit(item: ReviewCriterion): void {
    setEditingId(item.id);

    setForm({
        section_key: item.section_key,
        content: item.content,
        description: item.description,
        input_type: item.input_type,
    });

    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
    }

  function closeForm(): void {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveCriterion(): Promise<void> {

    const payload: ReviewCriterionInput = {
      academic_year: academicYear,
      review_level: reviewLevel,
      section_key: form.section_key,
      content: form.content.trim(),
      description: form.description.trim(),
      input_type: form.input_type,
    };

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await callApi(
        "/api/admin/review-criteria",
        editingId ? "PATCH" : "POST",
        editingId
          ? { action: "update", id: editingId, ...payload }
          : { action: "create", ...payload },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Không thể lưu tiêu chí.");
      }

      closeForm();
      setSuccessMessage(
        editingId
          ? "Đã cập nhật tiêu chí."
          : "Đã thêm tiêu chí mới.",
      );

      await loadCriteria();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu dữ liệu.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCriterion(item: ReviewCriterion): Promise<void> {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tiêu chí "${item.label}" (${item.criterion_key})?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await callApi(
        "/api/admin/review-criteria",
        "DELETE",
        { id: item.id },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Không thể xóa tiêu chí.");
      }

      setSuccessMessage(`Đã xóa ${item.criterion_key}.`);
      await loadCriteria();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể xóa tiêu chí.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCriterion(item: ReviewCriterion): Promise<void> {
    setSaving(true);
    setErrorMessage("");

    try {
      const response = await callApi(
        "/api/admin/review-criteria",
        "PATCH",
        {
          action: "toggle",
          id: item.id,
          is_active: !item.is_active,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Không thể thay đổi trạng thái.");
      }

      await loadCriteria();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi trạng thái.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveCriterion(
    sectionKey: ReviewSection,
    itemId: string,
    direction: -1 | 1,
  ): Promise<void> {
    const items = criteria
      .filter((item) => item.section_key === sectionKey)
      .sort((a, b) => a.sort_order - b.sort_order);

    const currentIndex = items.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return;
    }

    const reordered = [...items];

    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];

    const updatedItems = reordered.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await callApi(
        "/api/admin/review-criteria",
        "PATCH",
        {
          action: "reorder",
          items: updatedItems,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Không thể đổi thứ tự.");
      }

      await loadCriteria();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể đổi thứ tự.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Chọn cấp xét duyệt */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3">
          <p className="font-semibold text-gray-900">
            Cấp xét duyệt
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Chọn bộ tiêu chí cần quản lý trong năm học {ACADEMIC_YEAR}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["faculty", "university"] as ReviewLevel[]).map((level) => {
            const active = reviewLevel === level;

            return (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setReviewLevel(level);
                  closeForm();
                }}
                className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    active ? "text-blue-700" : "text-gray-400"
                  }`}
                >
                  {REVIEW_LEVEL_CODES[level]}
                </span>

                <p className="mt-1 font-semibold text-gray-900">
                  {REVIEW_LEVELS[level]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trạng thái */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Danh sách sáu nhóm */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Đang tải danh sách tiêu chí...
        </div>
      ) : (
        <div className="space-y-3">
          {sectionCriteria.map((section, sectionIndex) => {
            const expanded = expandedSection === section.key;

            return (
              <div
                key={section.key}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(expanded ? null : section.key)
                  }
                  aria-expanded={expanded}
                  className="cursor-pointer flex w-full items-center gap-3 p-4 text-left transition hover:bg-gray-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                    {sectionIndex + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-900">
                      {section.label}
                    </span>

                    <span className="mt-0.5 block text-xs text-gray-500">
                      {section.items.length} tiêu chí
                    </span>
                  </span>

                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-gray-400 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-gray-200 p-4">
                    <button
                    type="button"
                      onClick={() => startCreate(section.key)}
                      className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                      <Plus size={16} />
                    Thêm tiêu chí
                    </button>

                    {/* Biểu mẫu nằm ngay trong section đang thao tác */}
                    {showForm && form.section_key === section.key && (
                    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-gray-900">
                            {editingId ? "Chỉnh sửa tiêu chí" : "Thêm tiêu chí mới"}
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                            Mã và số thứ tự sẽ được hệ thống tự động tạo.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={closeForm}
                            className="cursor-pointer rounded-lg p-2 text-gray-500 transition hover:bg-white hover:text-gray-800"
                            aria-label="Đóng biểu mẫu"
                        >
                            <X size={18} />
                        </button>
                        </div>

                        <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Nội dung tiêu chí
                        </label>

                        <textarea
                            rows={3}
                            value={form.content}
                            onChange={(event) =>
                            setForm((previous) => ({
                                ...previous,
                                content: event.target.value,
                            }))
                            }
                            disabled={saving}
                            placeholder="Nhập nội dung tiêu chí..."
                            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                        />
                        </div>

                        <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Ghi chú / Mô tả
                        </label>

                        <textarea
                            rows={2}
                            value={form.description}
                            onChange={(event) =>
                            setForm((previous) => ({
                                ...previous,
                                description: event.target.value,
                            }))
                            }
                            disabled={saving}
                            placeholder="Ví dụ: Điểm trung bình hệ 10, trên 7.5"
                            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                        />
                        </div>

                        <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Kiểu dữ liệu sinh viên nhập
                        </label>

                        <select
                            value={form.input_type}
                            onChange={(event) =>
                            setForm((previous) => ({
                                ...previous,
                                input_type: event.target.value as CriterionInputType,
                            }))
                            }
                            disabled={saving}
                            className="cursor-pointer w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                            {CRITERION_INPUT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                            ))}
                        </select>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={closeForm}
                            disabled={saving}
                            className="menu-btn menu-btn-white menu-btn-inline cursor-pointer"
                        >
                            <X size={16} className="mr-1 inline" />
                            Hủy
                        </button>

                        <button
                            type="button"
                            onClick={() => void saveCriterion()}
                            disabled={saving}
                            className="menu-btn menu-btn-blue menu-btn-inline cursor-pointer"
                        >
                            <Save size={16} className="mr-1 inline" />
                            {saving ? "Đang lưu..." : "Lưu tiêu chí"}
                        </button>
                        </div>
                    </div>
                    )}

                    {section.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                        <p className="text-sm font-medium text-gray-700">
                          Chưa có tiêu chí
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Nhấn “Thêm tiêu chí” để bắt đầu cấu hình.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {section.items.map((item, index) => (
                          <div
                            key={item.id}
                            className={`rounded-lg border p-4 ${
                              item.is_active
                                ? "border-gray-200 bg-white"
                                : "border-gray-200 bg-gray-50 opacity-60"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {index + 1}.
                                  </span>

                                  <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
                                    {item.criterion_key}
                                  </span>

                                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                    {CRITERION_INPUT_TYPES.find(
                                      (type) => type.value === item.input_type,
                                    )?.label ?? item.input_type}
                                  </span>

                                  {!item.is_active && (
                                    <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                                      Đang ẩn
                                    </span>
                                  )}
                                </div>

                                <p className="mt-2 text-sm leading-6 text-gray-700">
                                  {item.content}
                                </p>

                                {item.description && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void moveCriterion(section.key, item.id, -1)
                                  }
                                  disabled={saving || index === 0}
                                  title="Di chuyển lên"
                                  className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30"
                                >
                                  <ChevronUp size={17} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void moveCriterion(section.key, item.id, 1)
                                  }
                                  disabled={
                                    saving || index === section.items.length - 1
                                  }
                                  title="Di chuyển xuống"
                                  className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30"
                                >
                                  <ChevronDown size={17} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  disabled={saving}
                                  title="Chỉnh sửa"
                                  className="cursor-pointer rounded-md p-2 text-blue-600 transition hover:bg-blue-50 disabled:opacity-30"
                                >
                                  <Pencil size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void toggleCriterion(item)}
                                  disabled={saving}
                                  title={item.is_active ? "Ẩn tiêu chí" : "Hiện tiêu chí"}
                                  className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-30"
                                >
                                  {item.is_active ? "Ẩn" : "Hiện"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void deleteCriterion(item)}
                                  disabled={saving}
                                  title="Xóa"
                                  className="cursor-pointer rounded-md p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-30"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}