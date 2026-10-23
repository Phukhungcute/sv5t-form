"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    FACULTY_NAME,
    FACULTY_NAME_NORMAL,
    ACADEMIC_YEAR,
    buildSchedule,
    type ScheduleSettings,
    isWithinPeriod,
    getDateAfter,
} from "@/lib/constants";
import { APP_VERSION } from "@/lib/version"
import FloatingBubbles from "@/components/FloatingBubbles";
import MobileBubbles from "@/components/MobileBubbles";
import NewsTicker from "@/components/NewsTicker";
import DisableBrowserZoom from "@/components/DisableBrowserZoom";
import { Sun, Cloud, MoonStar, Star , Bell , House , Phone } from "lucide-react";

type Student = {
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  class_name: string;
};

export default function Dashboard() {
  const router = useRouter();

  async function handleLogout() {
  await supabase.auth.signOut();
  router.push("/");
}

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const [showPasswordSuccess, setShowPasswordSuccess] =
  useState(false);
  const [hidingPasswordSuccess, setHidingPasswordSuccess] =
  useState(false);

  const [schedule, setSchedule] =
  useState<ScheduleSettings | null>(null);

  async function loadSchedule() {

  const {
    data,
    error,
  } = await supabase
    .from("schedule_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error(
      "SCHEDULE ERROR:",
      error
    );

    return;
  }

  setSchedule(data);
}

  const SCHEDULE =
    schedule
      ? buildSchedule(schedule)
      : null;

        useEffect(() => {
        // Chờ Dashboard load xong
        if (loading) {
          return;
        }

        const success =
          sessionStorage.getItem(
            "passwordChangedSuccess"
          );

        if (success !== "true") {
          return;
        }

        // Xóa ngay để hiệu ứng chỉ chạy một lần
        sessionStorage.removeItem(
          "passwordChangedSuccess"
        );

        // Cho Dashboard render hoàn chỉnh trước
        const timer = setTimeout(() => {
          setShowPasswordSuccess(true);

          // Confetti
          confetti({
            particleCount: 120,
            spread: 80,
            origin: {
              y: 0.15,
            },
          });
        }, 100);

        return () => {
          clearTimeout(timer);
        };
      }, [loading]);

      useEffect(() => {
        if (!showPasswordSuccess) {
          return;
        }

        const timer = setTimeout(() => {
          // Bắt đầu animation đi lên
          setHidingPasswordSuccess(true);

          // Chờ animation chạy xong rồi mới xóa popup
          setTimeout(() => {
            setShowPasswordSuccess(false);
            setHidingPasswordSuccess(false);
          }, 500);
        }, 4000);

        return () => {
          clearTimeout(timer);
        };
      }, [showPasswordSuccess]);
  
      useEffect(() => {
    async function loadStudent() {
      try {
        // ==========================================
        // 1. Lấy tài khoản đang đăng nhập
        // ==========================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/");
          return;
        }

        // ==========================================
        // 2. Lấy MSSV từ profiles
        // ==========================================

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("mssv, role, must_change_password")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
          console.error("PROFILE ERROR:", profileError);
          router.push("/");
          return;
        }

        // Không cho admin vào dashboard sinh viên
        if (profile.role !== "student") {
          router.push("/admin");
          return;
        }

        if (
          profile.role === "student" &&
          profile.must_change_password
        ) {
          router.replace("/change-password");
          return false;
        }

        // ==========================================
        // 3. Lấy thông tin sinh viên từ students
        // ==========================================

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

        setStudent(studentData);
      } catch (error) {
        console.error("DASHBOARD ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
    loadSchedule();
  }, [router]);

  const submissionOpen =
    schedule
      ? schedule.submission_enabled &&
        isWithinPeriod(
          schedule.start_date,
          getDateAfter(
            schedule.start_date,
            schedule.submission_days
          ).toISOString()
        )
      : false;

  const additionOpen =
    schedule
      ? schedule.addition_enabled &&
        isWithinPeriod(
          getDateAfter(
            schedule.start_date,
            schedule.submission_days +
              schedule.review1_days
          ).toISOString(),
          getDateAfter(
            schedule.start_date,
            schedule.submission_days +
              schedule.review1_days +
              schedule.addition_days
          ).toISOString()
        )
      : false;

  const resultOpen =
    schedule
      ? schedule.result_enabled &&
        isWithinPeriod(
          getDateAfter(
            schedule.start_date,
            schedule.submission_days +
              schedule.review1_days +
              schedule.addition_days +
              schedule.review2_days
          ).toISOString(),
          getDateAfter(
            schedule.start_date,
            schedule.submission_days +
              schedule.review1_days +
              schedule.addition_days +
              schedule.review2_days +
              schedule.result_days
          ).toISOString()
        )
      : false;

  const infoSectionRef = useRef<HTMLElement>(null);
  const [infoHeight, setInfoHeight] = useState(0);

  useLayoutEffect(() => {
  if (!infoSectionRef.current) return;

  setInfoHeight(infoSectionRef.current.offsetHeight);
}, [student]);

  const [activeTab, setActiveTab] = useState<
  "home" | "introduction" | "notifications" | "contact"
>("home");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

useEffect(() => {
  const updateTime = () => {
    setCurrentTime(new Date());
  };

  updateTime();

  const timer = window.setInterval(updateTime, 1000);

  return () => window.clearInterval(timer);
}, []);

const vietnamHour = currentTime
  ? Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(currentTime)
    )
  : 12;

const isDaytime = vietnamHour >= 6 && vietnamHour < 18;

const vietnamTime = currentTime
  ? new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(currentTime)
  : "--:--:--";
    
  // ==========================================
  // Loading
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải thông tin sinh viên...
        </p>
      </main>
    );
  }

  // ==========================================
  // Không tìm thấy sinh viên
  // ==========================================

  if (!student) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-red-600">
            Không thể tải thông tin sinh viên.
          </p>

          <button
            onClick={() => router.push("/")}
            className="cursor-pointer mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
    <DisableBrowserZoom />
    <main className="min-h-screen bg-white p-6">
      
      {showPasswordSuccess && (
          <div
            className="
              fixed
              inset-x-0
              top-5
              z-50
              flex
              justify-center
              px-4
            "
          >
            <div
              className={`
                w-full
                max-w-md
                ${
                  hidingPasswordSuccess
                    ? "animate-[slideUp_0.5s_ease-in]"
                    : "animate-[slideDown_0.5s_ease-out]"
                }
              `}
            >
              <div
                className="
                  flex
                  items-center
                  gap-4
                  rounded-2xl
                  border
                  border-green-200
                  bg-white
                  px-5
                  py-4
                  shadow-xl
                "
              >
                <div className="text-3xl">
                  🎉
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    Đổi mật khẩu thành công!
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Mật khẩu của bạn đã được cập nhật.
                  </p>
                </div>

                <div className="text-3xl">
                  🎊
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="mx-auto max-w-5xl">

        {/* HEADER — DESKTOP */}
        <div className="hidden md:flex flex-col items-start">
          <FloatingBubbles/>
        {/* Ảnh tiêu đề */}
        {infoHeight > 0 && (
          <div
            style={{ height: "200px" }}
          >
            <img
              src="/images/Title.jpg"
              alt="Title SV5T"
              className="h-full w-auto object-contain"
            />
          </div>
        )}

          {/* Ribbon */}
          <nav className="flex w-full max-w-5xl justify-start overflow-hidden bg-sv5t-blue shadow-md">
            {/* Trang chủ */}
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`
                cursor-pointer
                px-6
                py-3
                font-semibold
                text-white
                transition
                ${
                  activeTab === "home"
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <House className="h-5 w-5 shrink-0" fill="currentColor"/>
                <span>TRANG CHỦ</span>
              </span>
            </button>

            {/* Giới thiệu */}
            <button
              type="button"
              onClick={() => setActiveTab("introduction")}
              className={`
                cursor-pointer
                border-l
                border-white/20
                px-6
                py-3
                font-semibold
                text-white
                transition
                ${
                  activeTab === "introduction"
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Star className="h-5 w-5 shrink-0" fill="currentColor"/>
                <span>GIỚI THIỆU VỀ PHONG TRÀO "SINH VIÊN 5 TỐT"</span>
              </span>
            </button>

            {/* Thông báo */}
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`
                cursor-pointer
                border-l
                border-white/20
                px-6
                py-3
                font-semibold
                text-white
                transition
                ${
                  activeTab === "notifications"
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5 shrink-0" fill="currentColor"/>
                <span>THÔNG BÁO</span>
              </span>
            </button>

            {/* LIÊN HỆ */}
            <button
              type="button"
              onClick={() => setActiveTab("contact")}
              className={`
                cursor-pointer
                px-6
                py-3
                font-semibold
                text-white
                transition
                ${
                  activeTab === "contact"
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Phone className="h-5 w-5 shrink-0" fill="currentColor"/>
                <span>LIÊN HỆ</span>
              </span>
            </button>
          </nav>
        </div>
        
        {/* HEADER — PHONE */}
        <div className="block md:hidden">
          <MobileBubbles />
        <div className="relative h-[140px] w-full overflow-hidden md:hidden">
          <img
            src="/images/Title.jpg"
            alt="Title SV5T"
            className="absolute left-1/2 top-1/2 h-full w-full max-w-none -translate-x-[140px] -translate-y-1/2 scale-[1] object-cover object-left"
          />
        </div>
        {/* Ribbon */}
          <nav className="relative z-30 w-full max-w-5xl bg-sv5t-blue shadow-md md:hidden">
            {/* Nút Menu luôn giữ nguyên */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-menu"
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              {/* Biểu tượng ba gạch chuyển động thành dấu X */}
              <span className="text-2xl leading-none" aria-hidden="true">
                ☰
              </span>

              <span>MENU</span>
            </button>

            {/* Vùng menu trượt xuống */}
            <div
              id="mobile-nav-menu"
              aria-hidden={!isMobileMenuOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                isMobileMenuOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                {[
                  { id: "home", label:
                    (
                      <>
                      <span className="flex items-center gap-2">
                        <House className="h-5 w-5 shrink-0" fill="currentColor"/>
                        <span>TRANG CHỦ</span>
                      </span>
                      </>
                    ),
                  },
                  {
                    id: "introduction",
                    label:
                    (
                      <>
                      <span className="flex items-center gap-2">
                        <Star className="h-5 w-5 shrink-0" fill="currentColor" />
                        <span>GIỚI THIỆU VỀ PHONG TRÀO "SINH VIÊN 5 TỐT"</span>
                      </span>
                      </>
                    ),
                  },
                  { id: "notifications", label:
                    (
                      <>
                      <span className="flex items-center gap-2">
                        <Bell className="h-5 w-5 shrink-0" fill="currentColor" />
                        <span>THÔNG BÁO</span>
                      </span>
                      </>
                    ),
                      },
                  { id: "contact", label:
                    (
                      <>
                      <span className="flex items-center gap-2">
                        <Phone className="h-5 w-5 shrink-0" fill="currentColor"/>
                        <span>LIÊN HỆ"</span>
                      </span>
                      </>
                    ),
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    tabIndex={isMobileMenuOpen ? 0 : -1}
                    onClick={() => {
                      setActiveTab(
                        item.id as
                          | "home"
                          | "introduction"
                          | "notifications"
                          | "contact",
                      );
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full border-t border-white/20 px-5 py-3 text-left font-semibold text-white transition-colors duration-200 ${
                      activeTab === item.id
                        ? "bg-white/20"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>

      {/* Tiêu điểm */}
      <div className="mb-8 mt-4">
        <NewsTicker />
      </div>

        {/* Trang chủ */}
      {activeTab === "home" && (
        <>
      {/* Welcome */}              
        <section
          className={`relative isolate mt-4 mb-8 overflow-hidden rounded-2xl border p-6 shadow-sm ${
            isDaytime
              ? "border-cyan-100 bg-gradient-to-br from-cyan-50 via-sky-100 to-blue-100"
              : "border-indigo-800/50 bg-gradient-to-br from-blue-950 via-indigo-950 to-indigo-900"
          }`}
        >
          {/* Background ngày/đêm — chỉ hiện trên desktop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden md:block"
          >
            {isDaytime ? (
              <>
                {/* Ánh sáng mặt trời */}
                <div className="absolute -right-10 -top-16 size-48 rounded-full bg-yellow-200/30 blur-3xl" />

                {/* Mặt trời */}
                <div className="absolute right-10 top-5 flex w-24 flex-col items-center gap-1 md:right-2 md:w-28">
                  <Sun
                    className="size-10 text-amber-400/90 md:size-12"
                    strokeWidth={1.5}
                  />

                  <span
                    className={`whitespace-nowrap text-xs font-semibold tabular-nums ${
                      isDaytime ? "text-sky-800" : "text-indigo-100"
                    }`}
                  >
                    {vietnamTime}
                  </span>
                </div>

                {/* Mây phía trên */}
                <Cloud className="absolute left-[15%] top-4 size-14 text-white/80" strokeWidth={1.5} />
                <Cloud className="absolute left-[42%] top-8 size-10 text-white/70" strokeWidth={1.5} />
                <Cloud className="absolute left-[67%] top-3 size-14 text-white/80" strokeWidth={1.5} />

                {/* Mây phía dưới */}
                <Cloud className="absolute left-[30%] top-20 size-12 text-white/50" strokeWidth={1.5} />
                <Cloud className="absolute right-[24%] top-24 size-12 text-white/50" strokeWidth={1.5} />
              </>
            ) : (
              <>
                {/* Quầng sáng mặt trăng */}
                <div className="absolute -right-10 -top-16 size-48 rounded-full bg-indigo-300/10 blur-3xl" />

                {/* Mặt trăng */}
                <div className="absolute right-10 top-5 flex w-24 flex-col items-center gap-1 md:right-2 md:w-28">
                  <MoonStar
                    className="size-10 text-amber-100/90 md:size-12"
                    strokeWidth={1.4}
                  />

                  <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-indigo-100">
                    {vietnamTime}
                  </span>
                </div>

                {/* Các ngôi sao */}
                <Star className="absolute left-[12%] top-5 size-3 fill-current text-indigo-100/80" />
                <Star className="absolute left-[30%] top-12 size-2 fill-current text-white/70" />
                <Star className="absolute left-[44%] top-4 size-3 fill-current text-white/80" />
                <Star className="absolute left-[61%] top-16 size-2 fill-current text-indigo-100/80" />
                <Star className="absolute right-[25%] top-8 size-2 fill-current text-white/70" />
                <Star className="absolute left-[20%] top-24 size-2 fill-current text-white/60" />
                <Star className="absolute right-[38%] top-24 size-3 fill-current text-indigo-100/70" />
                <Star className="absolute right-[12%] top-20 size-2 fill-current text-white/70" />
              </>
            )}
          </div>

          {/* Desktop */}
          <div className="relative z-10 hidden w-full items-center justify-between md:flex">
            {/* Bên trái */}
            <div>
              <h2
                className={`text-2xl font-semibold ${
                  isDaytime ? "text-sv5t-blue" : "text-slate-50"
                }`}
              >
                Xin chào, {student.full_name}!
              </h2>

              <p
                className={`mt-2 ${
                  isDaytime ? "text-gray-600" : "text-indigo-200"
                }`}
              >
                {isDaytime
                  ? "Chúc bạn một ngày tốt lành!"
                  : "Chúc bạn có một buổi tối bình yên."}
              </p>
            </div>

            {/* Bên phải */}
            <div className="mr-24 flex items-center gap-4">
              <div className="text-right">
                <p
                  className={`font-medium ${
                    isDaytime ? "text-sv5t-blue" : "text-slate-100"
                  }`}
                >
                  {student?.full_name}
                </p>

                <p
                  className={`text-sm ${
                    isDaytime ? "text-gray-500" : "text-indigo-200"
                  }`}
                >
                  MSSV: {student?.mssv}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 active:translate-y-0.5 ${
                  isDaytime
                    ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
                    : "border-rose-300/30 text-rose-200 hover:border-rose-300/60 hover:bg-rose-300/10"
                }`}
              >
                Đăng xuất
              </button>
            </div>
          </div>

          {/* Giao diện Mobile*/}
          <div className="relative z-10 block md:hidden">
            <div className="flex flex-col gap-5">
              <div>
                <h2
                className={`text-2xl font-semibold ${
                  isDaytime ? "text-sv5t-blue" : "text-slate-50"
                }`}
                >
                  Xin chào,
                </h2>

                <h2
                className={`text-2xl font-semibold ${
                  isDaytime ? "text-sv5t-blue" : "text-slate-50"
                }`}
                >
                  {student.full_name}!
                </h2>

                <p
                  className={`mt-2 ${
                    isDaytime ? "text-gray-500" : "text-indigo-200"
                  }`}
                >
                  {isDaytime
                    ? "Chúc bạn một ngày tốt lành!"
                    : "Chúc bạn có một buổi tối bình yên."}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className={`font-medium ${
                      isDaytime ? "text-sv5t-blue" : "text-slate-100"
                    }`}
                  >
                    {student?.full_name}
                  </p>

                  <p
                    className={`text-sm ${
                      isDaytime ? "text-gray-500" : "text-indigo-200"
                    }`}
                  >
                    MSSV: {student?.mssv}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="cursor-pointer whitespace-nowrap rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </section>


              <div className="mb-8 flex justify-center">
              {infoHeight > 0 && (
                <div
                  className="overflow-hidden rounded-2xl bg-white shadow"
                  style={{ height: `${infoHeight}px` }}
                >
                  <img
                    src="/images/Announcement1.jpg"
                    alt="Banner SV5T"
                    className="h-full w-auto object-contain"
                  />
                </div>
              )}
            </div>

              {/* Thông tin sinh viên */}
              <section
                ref={infoSectionRef}
                className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="font-svn-internation text-sv5t-blue mb-5 text-5xl font-semibold">
                  THÔNG TIN SINH VIÊN
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-gray-500">
                      Mã số sinh viên
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {student.mssv}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Họ và tên
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {student.full_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Ngày sinh
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {new Date(student.birth_date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Giới tính
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {student.gender}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Lớp
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {student.class_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Khoa
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {FACULTY_NAME_NORMAL}
                    </p>
                  </div>
                </div>
              </section>

              {/* Menu */}
              <section className="grid gap-6 md:grid-cols-3">

                {/* Gửi hồ sơ */}
                <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="font-svn-internation text-sv5t-blue text-3xl font-semibold text-gray-900">
                    GỬI HỒ SƠ
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Điền và gửi hồ sơ của bạn đến hệ thống.
                  </p>

                  {submissionOpen ? (
                    <p className="mt-4 text-sm font-medium text-green-600">
                      ● Đang mở
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      ● Đang đóng
                    </p>
                  )}

                  {SCHEDULE?.submission?.enabled ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Hạn gửi: {SCHEDULE?.submission.start} {"-"}{" "}
                        {SCHEDULE?.submission.end}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ
                        {/* Coming Soon */}
                      </p>
                    )}

                  <div className="menu-btn-wrapper">
                  <button
                    onClick={() => {
                      if (!submissionOpen) {
                        alert("Đang ngoài thời gian nộp hồ sơ.");
                        return;
                      }

                      router.push("/dashboard/submit");
                    }}
                    className={`menu-btn menu-btn-blue ${
                      !submissionOpen
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Gửi hồ sơ
                  </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="font-svn-internation text-sv5t-blue text-3xl font-semibold text-gray-900">
                    TẠO MINH CHỨNG
                  </h3>

                  {/* Minh chứng */}
                  <p className="mt-2 text-gray-600">
                    Tạo và gửi minh chứng của bạn đến hệ thống.
                  </p>

                  {submissionOpen ? (
                    <p className="mt-4 text-sm font-medium text-green-600">
                      ● Đang mở
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      ● Đang đóng
                    </p>
                  )}

                  {SCHEDULE?.submission?.enabled ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Hạn gửi: {SCHEDULE?.submission.start} {"-"}{" "}
                        {SCHEDULE?.submission.end}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ
                        {/* Coming Soon */}
                      </p>
                    )}
                  
                  <div className="menu-btn-wrapper">
                  <button
                    onClick={() => {
                      if (!submissionOpen) {
                        alert("Đang ngoài thời gian nộp minh chứng.");
                        return;
                      }

                      router.push("/dashboard/proof");
                    }}
                    className={`menu-btn menu-btn-blue ${
                      !submissionOpen
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Tạo minh chứng
                  </button>
                  </div>
                </div>

                {/* Chỉnh sửa */}
                <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="font-svn-internation text-sv5t-orange text-3xl font-semibold text-gray-900">
                    XEM YÊU CẦU CHỈNH SỬA
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Xem yêu cầu chỉnh sửa, bổ sung hồ sơ từ Hội đồng xét chọn.
                  </p>

                  {additionOpen ? (
                    <p className="mt-4 text-sm font-medium text-green-600">
                      ● Đang mở
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      ● Đang đóng
                    </p>
                  )}

                  {SCHEDULE?.addition?.enabled ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Hạn xem: {SCHEDULE?.addition.start} {"-"}{" "}
                        {SCHEDULE?.addition.end}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ
                        {/* Coming Soon */}
                      </p>
                    )}

                  <div className="menu-btn-wrapper">
                    <button
                      onClick={() => {
                        if (!additionOpen) {
                          alert("Đang ngoài thời gian xem yêu cầu.");
                          return;
                        }

                        router.push("/dashboard/request");
                      }}
                      className={`menu-btn menu-btn-yellow ${
                        !additionOpen
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      }`}
                    >
                      Xem yêu cầu
                    </button>
                  </div>
                </div>

                {/* Chỉnh sửa hồ sơ */}
                <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="font-svn-internation text-sv5t-blue text-3xl font-semibold text-gray-900">
                    CHỈNH SỬA HỒ SƠ
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Chỉnh sửa thông tin hồ sơ đã gửi trong thời gian cho phép.
                  </p>

                  {additionOpen ? (
                    <p className="mt-4 text-sm font-medium text-green-600">
                      ● Đang mở
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      ● Đang đóng
                    </p>
                  )}

                  {SCHEDULE?.addition?.enabled ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Hạn chỉnh sửa: {SCHEDULE?.addition.start} {"-"}{" "}
                        {SCHEDULE?.addition.end}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ
                        {/* Coming Soon */}
                      </p>
                    )}
                  
                  <div className="menu-btn-wrapper">
                  <button
                    onClick={() => {
                      if (!additionOpen) {
                        alert("Đang ngoài thời gian chỉnh sửa hồ sơ.");
                        return;
                      }

                      router.push("/dashboard/editsubmit");
                    }}
                    className={`menu-btn menu-btn-blue ${
                      !additionOpen
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Chỉnh sửa
                  </button>
                  </div>
                </div>

                {/* Bổ sung hồ sơ */}
                <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="font-svn-internation text-sv5t-blue text-3xl font-semibold text-gray-900">
                    BỔ SUNG MINH CHỨNG
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Bổ sung thông tin minh chứng đã gửi trong thời gian cho phép.
                  </p>

                  {additionOpen ? (
                    <p className="mt-4 text-sm font-medium text-green-600">
                      ● Đang mở
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      ● Đang đóng
                    </p>
                  )}
                  
                  {SCHEDULE?.addition?.enabled ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Hạn bổ sung: {SCHEDULE?.addition.start} {"-"}{" "}
                        {SCHEDULE?.addition.end}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ
                        {/* Coming Soon */}
                      </p>
                    )}

                  <div className="menu-btn-wrapper">
                  <button
                    onClick={() => {
                      if (!additionOpen) {
                        alert("Đang ngoài thời gian chỉnh sửa minh chứng.");
                        return;
                      }

                      router.push("/dashboard/editproof");
                    }}
                    className={`menu-btn menu-btn-blue ${
                      !additionOpen
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Bổ sung
                  </button>
                  </div>
                </div>

                {/* Kết quả */}
                <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                  <h3 className="font-svn-internation text-sv5t-green text-3xl font-semibold text-gray-900">
                    XEM KẾT QUẢ
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Theo dõi trạng thái và kết quả hồ sơ của bạn.
                  </p>

                  {resultOpen ? (
                    <p className="mt-4 text-sm font-medium text-green-600">
                      ● Đã có kết quả
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-gray-500">
                      ● Chưa có kết quả
                    </p>
                  )}

                    {SCHEDULE?.result?.enabled ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Kết quả: {SCHEDULE.result.start} {"-"}{" "}
                        {SCHEDULE.result.end}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">
                        ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ
                        {/* Coming Soon */}
                      </p>
                    )}

                  <div className="menu-btn-wrapper">
                  <button
                    onClick={() => {
                      if (!resultOpen) {
                        alert("Đang ngoài thời gian xem kết quả.");
                        return;
                      }

                      router.push("/dashboard/result");
                    }}
                    className={`menu-btn menu-btn-green ${
                      !resultOpen
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    Xem kết quả
                  </button>
                  </div>
                </div>     

              </section>
        </>
      )}

      {activeTab === "introduction" && (
        <>
            <h2 className="text-xl font-semibold text-gray-900">
              Đây là một test page
            </h2>
        </>
      )}

      {activeTab === "notifications" && (
        <>
            <h2 className="text-xl font-semibold text-gray-900">
              Hiện chưa có thông báo.
            </h2>
        </>
      )}

      {activeTab === "contact" && (
        <>
          {/* Liên hệ hỗ trợ */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  LIÊN HỆ HỖ TRỢ
                </h3>

                <p className="mt-1 text-gray-500">
                  Nếu gặp vấn đề trong quá trình sử dụng hệ thống, hãy liên hệ BCH Liên Chi hội Sinh viên khoa hoặc Ban Chủ nhiệm Câu lạc bộ "Sinh viên 5 tốt" khoa Giáo dục Tiểu học.
                </p>
              </div>

              <div className="font-medium text-sv5t-blue">
                <div>
                  Email:{" "}
                  <p className="font-medium text-gray-800">
                    Liên Chi hội Sinh viên khoa: <span className="font-normal">hsv.gdth@sgu.edu.vn</span>
                  </p>
                  <p className="font-medium text-gray-800">
                    Câu lạc bộ "Sinh viên 5 tốt": <span className="font-normal">sv5t.gdth.sgu@gmail.com</span>
                  </p>
                </div>

                <div className="mt-5">
                  Số điện thoại:{" "}
                  <div className="font-normal">
                    <>
                      <div className="hidden md:block">
                        {/* Giao diện desktop hiện tại */}
                        <p className="text-gray-800">
                          <span>090.673.9434</span> (Đ/c Trần Thanh Tâm - Liên Chi hội Trưởng LCH SV khoa)
                        </p>
                        <p className="text-gray-800">
                          <span>078.599.6575</span> (Đ/c Trần Phương Trường Thư - Liên Chi hội Phó LCH SV khoa, Phó Chủ nhiệm CLB)
                        </p>
                        <p className="text-gray-800">
                          <span>098.732.7862</span> (Đ/c Nguyễn Dương Nam - Liên Chi hội Phó LCH SV khoa)
                        </p>
                        <p className="text-gray-800">
                          <span>087.913.9129</span> (Đ/c Võ Minh Quyền - Chủ nhiệm CLB)
                        </p>
                        <p className="text-gray-800">
                          <span>034.829.6097</span> (Đ/c Thái Kiên Giang - Phó Chủ nhiệm CLB)
                        </p>
                      </div>

                      <div className="block md:hidden">
                        {/* Giao diện mobile */}
                        <p className="text-gray-800">
                          090.673.9434
                        </p>
                        <p className="text-gray-800">
                          👉 Đ/c Trần Thanh Tâm - Liên Chi hội Trưởng LCH SV khoa
                        </p>

                        <p className="text-gray-800">
                          <span>078.599.6575</span>
                        </p>
                        <p className="text-gray-800">
                          👉 Đ/c Trần Phương Trường Thư - Liên Chi hội Phó LCH SV khoa, Phó Chủ nhiệm CLB
                        </p>

                        <p className="text-gray-800">
                          <span>098.732.7862</span>
                        </p>
                        <p className="text-gray-800">
                          👉 Đ/c Nguyễn Dương Nam - Liên Chi hội Phó LCH SV khoa
                        </p>

                        <p className="text-gray-800">
                          <span>087.913.9129</span>
                        </p>
                        <p className="text-gray-800">
                          👉 Đ/c Võ Minh Quyền - Chủ nhiệm CLB
                        </p>

                        <p className="text-gray-800">
                          <span>034.829.6097</span>
                        </p>
                        <p className="text-gray-800">
                          👉 Đ/c Thái Kiên Giang - Phó Chủ nhiệm CLB
                        </p>

                      </div>
                    </>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
        
        {/* Help Center */}
        <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Cần trợ giúp?
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Tìm câu trả lời, hướng dẫn và các quy định liên quan đến hồ sơ SV5T.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <button
              onClick={() => router.push("/dashboard/qa")}
              className="cursor-pointer group rounded-xl border border-gray-200 p-5 text-left transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  ❓
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Câu hỏi thường gặp</h3>
                  <p className="mt-1 text-sm text-gray-500">Q&A về hệ thống và hồ sơ</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => alert("Tính năng chưa hoàn thiện!")} /*router.push("/dashboard/introduction")}*/
              className="cursor-pointer group rounded-xl border border-gray-200 p-5 text-left transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  📖
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Giới thiệu</h3>
                  <p className="mt-1 text-sm text-gray-500">Tổng quan về hệ thống</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/dashboard/guide")}
              className="cursor-pointer group rounded-xl border border-gray-200 p-5 text-left transition hover:-translate-y-0.5 active:translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  📄
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Hướng dẫn xét chọn</h3>
                  <p className="mt-1 text-sm text-gray-500">Quy định về bộ tiêu chí SV5T</p>
                </div>
              </div>
            </button>
          </div>

        </section>

        {/* Footer */}
        <footer className="mb-5 mt-8 border-t border-gray-200 py-6 text-center">
          <p className="mt-1 text-xs text-gray-500">
            © {new Date().getFullYear()} • Cổng Thông Tin SV5T • Phiên bản {APP_VERSION}
          </p>
          <p className="mt-1 text-xs text-gray-500 hidden md:block">
            D.Đ.P & LCH SV khoa Giáo dục Tiểu học • All rights reserved
          </p>
          <h1 className="mt-1 text-xs text-gray-500 block md:hidden">
            <p>D.Đ.P & LCH SV khoa Giáo dục Tiểu học</p>
            <p>All rights reserved</p>
          </h1>
        </footer>

      </div>
    </main>
    </>
  );
}