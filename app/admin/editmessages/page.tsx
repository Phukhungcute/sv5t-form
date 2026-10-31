"use client";

import { useEffect , useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CriteriaManager from "./CriteriaManager";

type MessageSection = {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: "text" | "criteria" | "file";
};

const messageSections: MessageSection[] = [
  {
    id: "ticker",
    title: "Thông điệp Ticker",
    description:
      "Chỉnh sửa dòng thông điệp chạy trên giao diện hệ thống.",
    icon: "📢",
    type: "text",
  },
  {
    id: "introduction",
    title: "Thông điệp giới thiệu",
    description:
      "Chỉnh sửa nội dung giới thiệu và hướng dẫn dành cho sinh viên.",
    icon: "📝",
    type: "text",
  },
  {
    id: "contact",
    title: "Thông điệp liên hệ",
    description:
      "Quản lý thông tin liên hệ, địa chỉ hỗ trợ và các kênh liên lạc.",
    icon: "📬",
    type: "text",
  },
  {
    id: "criteria",
    title: "Các tiêu chí xét duyệt",
    description:
      "Quản lý nội dung, thứ tự và các tiêu chí dùng trong quá trình xét duyệt.",
    icon: "📋",
    type: "criteria",
  },
  {
    id: "criteria-pdf",
    title: "File PDF tiêu chí",
    description:
      "Tải lên hoặc thay thế file PDF chứa các tiêu chí xét duyệt.",
    icon: "📄",
    type: "file",
  },
  {
    id: "result",
    title: "Thông điệp kết quả",
    description:
        "Chỉnh sửa thông báo hiển thị cho sinh viên khi xem kết quả xét duyệt hồ sơ.",
    icon: "📊",
    type: "text",
    },
];

export default function EditMessagesPage() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="menu-btn-wrapper menu-btn-wrapper-header inline-flex w-fit">
            <button
            onClick={() => router.push("/admin")}
            className="menu-btn menu-btn-white"
          >
            ← Quay lại trang quản trị
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Quản lý thông điệp hệ thống
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
              Chỉnh sửa các thông điệp, nội dung giới thiệu và tài liệu
              được sử dụng trong hệ thống SV5T Form.
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <span className="text-lg">ℹ️</span>

              <p className="text-sm text-blue-800">
                Đây là giao diện quản lý nội dung. Các chức năng lưu và
                cập nhật dữ liệu sẽ được bổ sung sau.
              </p>
            </div>
          </div>
        </div>

        {/* DANH SÁCH CHỨC NĂNG */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Danh sách nội dung
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Chọn một mục để xem khu vực quản lý tương ứng.
          </p>

          <div className="mt-5 space-y-4">
            {messageSections.map((section, index) => {
              const isActive = activeSection === section.id;

              return (
                <div
                  key={section.id}
                  className={`overflow-hidden rounded-xl border transition ${
                    isActive
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {/* THẺ CHỨC NĂNG */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSection(isActive ? null : section.id)
                    }
                    aria-expanded={isActive}
                    className="flex w-full cursor-pointer items-center gap-4 p-5 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                      {section.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {index + 1}. {section.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {section.description}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-lg text-gray-400 transition-transform ${
                        isActive ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  {/* KHU VỰC QUẢN LÝ */}
                  {isActive && (
                    <div className="border-t border-gray-200 p-5">
                      {section.type === "text" && (
                        <div>
                          <label
                            htmlFor={`${section.id}-content`}
                            className="mb-2 block text-sm font-medium text-gray-700"
                          >
                            Nội dung thông điệp
                          </label>

                          <textarea
                            id={`${section.id}-content`}
                            rows={5}
                            placeholder={`Nhập ${section.title.toLowerCase()}...`}
                            disabled
                            className="w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none disabled:cursor-not-allowed"
                          />

                          <p className="mt-2 text-xs text-gray-400">
                            Chức năng chỉnh sửa và lưu nội dung sẽ được
                            triển khai sau.
                          </p>
                        </div>
                      )}

                      {section.type === "criteria" && (
                        <CriteriaManager />
                      )}

                      {section.type === "file" && (
                        <div>
                          <label
                            htmlFor="criteria-pdf"
                            className="mb-2 block text-sm font-medium text-gray-700"
                          >
                            Tệp PDF tiêu chí
                          </label>

                          <input
                            id="criteria-pdf"
                            type="file"
                            accept=".pdf,application/pdf"
                            disabled
                            className="block w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-500 file:mr-4 file:border-0 file:bg-gray-100 file:px-4 file:py-3 file:text-sm file:font-medium"
                          />

                          <p className="mt-2 text-xs text-gray-400">
                            Chức năng tải lên và thay thế tài liệu sẽ được
                            triển khai sau.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FOOTER */}
        <div className="mt-6 text-center text-sm text-gray-400">
          SV5T Form · Quản lý nội dung hệ thống
        </div>
      </div>
    </main>
  );
}