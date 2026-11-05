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
  type: "text" | "criteria" | "file" | "maintenance";
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
    title: "File PDF tiêu chí và biểu mẫu",
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
  {
    id: "maintenance",
    title: "Thông điệp bảo trì",
    description:
      "Thiết lập thời gian bảo trì và bật hoặc tắt thông báo trên trang đăng nhập.",
    icon: "🛠️",
    type: "maintenance",
  },
];

export default function EditMessagesPage() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<string | null>(null);

  // ==========================================
  // THÔNG ĐIỆP BẢO TRÌ
  // ==========================================

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  const [startTime, setStartTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [endDate, setEndDate] = useState("");

  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  useEffect(() => {
    async function loadMaintenanceSettings() {
      setMaintenanceLoading(true);

      try {
        const response = await fetch(
          "/api/admin/maintenance-message"
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Không thể tải cấu hình bảo trì."
          );
        }

        const settings = result.settings;

        setMaintenanceEnabled(
          settings.maintenance_message_enabled ?? false
        );

        setStartTime(
          settings.maintenance_start_time?.slice(0, 5) ?? ""
        );

        setStartDate(
          settings.maintenance_start_date ?? ""
        );

        setEndTime(
          settings.maintenance_end_time?.slice(0, 5) ?? ""
        );

        setEndDate(
          settings.maintenance_end_date ?? ""
        );
      } catch (error) {
        console.error("LOAD MAINTENANCE SETTINGS ERROR:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Không thể tải cấu hình bảo trì."
        );
      } finally {
        setMaintenanceLoading(false);
      }
    }

    loadMaintenanceSettings();
  }, []);

  async function handleToggleMaintenance(enabled: boolean) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      const response = await fetch(
        "/api/admin/maintenance-message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "toggle",
            enabled,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể cập nhật trạng thái.");
      }

      setMaintenanceEnabled(enabled);
      alert(result.message);
    } catch (error) {
      console.error("TOGGLE MAINTENANCE MESSAGE ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái."
      );
    }
  }

  async function handleSaveMaintenance() {
    // Kiểm tra dữ liệu đầu vào
    if (!startTime || !startDate || !endTime || !endDate) {
      alert("Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc.");
      return;
    }

    // So sánh theo định dạng YYYY-MM-DDTHH:mm
    const start = `${startDate}T${startTime}`;
    const end = `${endDate}T${endTime}`;

    if (start >= end) {
      alert(
        "Thời gian bắt đầu phải sớm hơn thời gian kết thúc."
      );
      return;
    }

    setMaintenanceSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      const response = await fetch(
        "/api/admin/maintenance-message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "save",
            startTime,
            startDate,
            endTime,
            endDate,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không thể lưu thời gian bảo trì.");
      }

      alert(result.message);
    } catch (error) {
      console.error("SAVE MAINTENANCE MESSAGE ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Không thể lưu thời gian bảo trì."
      );
    } finally {
      setMaintenanceSaving(false);
    }
  }

  const DEFAULT_TICKER_MESSAGE =
  "Sinh viên Thành phố vươn mình thời đại số, chủ động làm chủ công nghệ, phát huy sức trẻ và bản lĩnh sáng tạo, tự tin vươn mình tiến vào kỷ nguyên mới.";

  const [tickerMessage, setTickerMessage] = useState("");
  const [tickerLoading, setTickerLoading] = useState(true);
  const [tickerSaving, setTickerSaving] = useState(false);
  const [tickerStatus, setTickerStatus] = useState("");

  useEffect(() => {
  async function fetchTickerMessage() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "ticker_message")
      .maybeSingle();

    if (error) {
      console.error("FETCH TICKER MESSAGE ERROR:", error);
      setTickerMessage(DEFAULT_TICKER_MESSAGE);
    } else {
      setTickerMessage(
        typeof data?.value === "string" && data.value.trim()
          ? data.value
          : DEFAULT_TICKER_MESSAGE,
      );
    }

    setTickerLoading(false);
  }

  fetchTickerMessage();
}, []);

async function handleSaveTicker() {
  setTickerSaving(true);
  setTickerStatus("");

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Không xác định được tài khoản đăng nhập.");
    }

    const newMessage = tickerMessage.trim();

    const { error } = await supabase
      .from("site_settings")
      .update({
        value: newMessage,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("key", "ticker_message");

    if (error) throw error;

    setTickerMessage(newMessage);
    setTickerStatus(
      newMessage
        ? "Đã lưu thông điệp Ticker thành công!"
        : "Đã xóa thông điệp tùy chỉnh. Ticker sẽ sử dụng thông điệp mặc định.",
    );
  } catch (error) {
    console.error("SAVE TICKER MESSAGE ERROR:", error);
    setTickerStatus(
      error instanceof Error
        ? error.message
        : "Không thể lưu thông điệp.",
    );
  } finally {
    setTickerSaving(false);
  }
}

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

                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-amber-600">
                              ⚠️ Thông điệp sẽ được hiển thị công khai trên giao diện hệ thống.
                            </p>

                            <p className="mb-3 text-xs text-gray-400">
                              ℹ️ Để trống nội dung và lưu nếu muốn sử dụng thông điệp mặc định.
                            </p>
                          </div>

                          {section.id === "ticker" ? (
                            <>
                              <textarea
                                id="ticker-content"
                                rows={5}
                                value={tickerMessage}
                                onChange={(e) => {
                                  setTickerMessage(e.target.value);
                                  setTickerStatus("");
                                }}
                                placeholder={DEFAULT_TICKER_MESSAGE}
                                disabled={tickerLoading || tickerSaving}
                                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                              />

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-gray-400">
                                  {tickerMessage.length} ký tự
                                </p>

                                <button
                                  type="button"
                                  onClick={handleSaveTicker}
                                  disabled={tickerLoading || tickerSaving}
                                  className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {tickerSaving
                                    ? "Đang lưu..."
                                    : "Lưu thông điệp"}
                                </button>
                              </div>

                              {tickerStatus && (
                                <p
                                  className={`mt-3 text-sm ${
                                    tickerStatus.includes("thành công")
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {tickerStatus}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <textarea
                                id={`${section.id}-content`}
                                rows={5}
                                placeholder={`Nhập ${section.title.toLowerCase()}...`}
                                disabled
                                className="w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none disabled:cursor-not-allowed"
                              />

                              <p className="mt-2 text-xs text-gray-400">
                                Chức năng chỉnh sửa và lưu nội dung sẽ được triển khai sau.
                              </p>
                            </>
                          )}
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

                      {section.type === "maintenance" && (
                        <div className="space-y-6">

                          {/* TRẠNG THÁI THÔNG ĐIỆP */}

                          <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                Hiển thị thông điệp bảo trì
                              </p>

                              <p className="mt-1 text-sm text-gray-600">
                                Bật để hiển thị thông báo bảo trì trên trang đăng nhập.
                              </p>

                              <p className="mt-2 text-xs font-medium">
                                Trạng thái:{" "}
                                <span
                                  className={
                                    maintenanceEnabled
                                      ? "text-green-600"
                                      : "text-gray-500"
                                  }
                                >
                                  {maintenanceEnabled ? "ĐANG BẬT" : "ĐANG TẮT"}
                                </span>
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={maintenanceLoading}
                              onClick={() =>
                                handleToggleMaintenance(!maintenanceEnabled)
                              }
                              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                maintenanceEnabled
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                              aria-label={
                                maintenanceEnabled
                                  ? "Tắt thông điệp bảo trì"
                                  : "Bật thông điệp bảo trì"
                              }
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                  maintenanceEnabled
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          {/* THỜI GIAN BẢO TRÌ */}

                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Thời gian bảo trì
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              Thiết lập thời gian bắt đầu và kết thúc bảo trì hệ thống.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                            {/* BẮT ĐẦU */}

                            <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                              <h4 className="font-medium text-gray-800">
                                Thời gian bắt đầu
                              </h4>

                              <div>
                                <label className="mb-1.5 block text-sm text-gray-600">
                                  Ngày bắt đầu
                                </label>

                                <input
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  disabled={maintenanceLoading || maintenanceSaving}
                                  className="cursor-pointer w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-sm text-gray-600">
                                  Giờ bắt đầu
                                </label>

                                <input
                                  type="time"
                                  value={startTime}
                                  onChange={(e) => setStartTime(e.target.value)}
                                  disabled={maintenanceLoading || maintenanceSaving}
                                  className="cursor-pointer w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                                />
                              </div>
                            </div>

                            {/* KẾT THÚC */}

                            <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                              <h4 className="font-medium text-gray-800">
                                Thời gian kết thúc
                              </h4>

                              <div>
                                <label className="mb-1.5 block text-sm text-gray-600">
                                  Ngày kết thúc
                                </label>

                                <input
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  disabled={maintenanceLoading || maintenanceSaving}
                                  className="cursor-pointer w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-sm text-gray-600">
                                  Giờ kết thúc
                                </label>

                                <input
                                  type="time"
                                  value={endTime}
                                  onChange={(e) => setEndTime(e.target.value)}
                                  disabled={maintenanceLoading || maintenanceSaving}
                                  className="cursor-pointer w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                                />
                              </div>
                            </div>
                          </div>

                          {/* NÚT LƯU */}

                          <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-gray-500">
                              Việc bật/tắt thông điệp được lưu ngay lập tức.
                              Thay đổi thời gian cần nhấn nút xác nhận.
                            </p>

                            <button
                              type="button"
                              onClick={handleSaveMaintenance}
                              disabled={maintenanceLoading || maintenanceSaving}
                              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {maintenanceSaving
                                ? "Đang lưu..."
                                : "Xác nhận thời gian"}
                            </button>
                          </div>

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