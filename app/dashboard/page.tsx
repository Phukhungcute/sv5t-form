"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              SV5T Form {ACADEMIC_YEAR}
            </h1>

            <p className="mt-1 text-gray-500">
              Hệ thống quản lý hồ sơ SV5T
            </p>
          </div>

          <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium text-gray-800">
              {student?.full_name}
            </p>
            <p className="text-sm text-gray-500">
              MSSV: {student?.mssv}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Đăng xuất
          </button>
        </div>
        </header>

        {/* Welcome */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">
            Xin chào, {student.full_name} 👋
          </h2>

          <p className="mt-2 text-gray-600">
            Chào mừng bạn đến với hệ thống quản lý hồ sơ sinh viên.
          </p>
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
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Thông tin sinh viên
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">
                Mã số sinh viên
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {student.mssv}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Họ và tên
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {student.full_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Ngày sinh
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {new Date(student.birth_date).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Giới tính
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {student.gender}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Lớp
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {student.class_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
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
            <h3 className="text-xl font-semibold text-gray-900">
              Gửi hồ sơ
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
                  Coming soon
                </p>
              )}

            <button
              onClick={() => {
                if (!submissionOpen) {
                  alert("Đang ngoài thời gian nộp hồ sơ.");
                  return;
                }

                router.push("/dashboard/submit");
              }}
              className={`cursor-pointer mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 ${
                !submissionOpen
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              Gửi hồ sơ
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">
              Tạo minh chứng
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
                  Coming soon
                </p>
              )}

            <button
              onClick={() => {
                if (!submissionOpen) {
                  alert("Đang ngoài thời gian nộp minh chứng.");
                  return;
                }

                router.push("/dashboard/proof");
              }}
              className={`cursor-pointer mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 ${
                !submissionOpen
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              Tạo minh chứng
            </button>
          </div>

          {/* Chỉnh sửa */}
          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">
              Yêu cầu chỉnh sửa
            </h3>

            <p className="mt-2 text-gray-600">
              Yêu cầu chỉnh sửa, bổ sung hồ sơ (nếu có).
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
                  Coming soon
                </p>
              )}

            <button
              onClick={() => {
                if (!additionOpen) {
                  alert("Đang ngoài thời gian xem yêu cầu.");
                  return;
                }

                router.push("/dashboard/request");
              }}
              className={`cursor-pointer mt-5 w-full rounded-lg bg-orange-400 px-4 py-3 font-medium text-white transition hover:bg-orange-300 ${
                !additionOpen
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              Xem yêu cầu
            </button>
          </div>

          {/* Chỉnh sửa hồ sơ */}
          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">
              Chỉnh sửa hồ sơ
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
                  Coming soon
                </p>
              )}

            <button
              onClick={() => {
                if (!additionOpen) {
                  alert("Đang ngoài thời gian chỉnh sửa hồ sơ.");
                  return;
                }

                router.push("/dashboard/editsubmit");
              }}
              className={`cursor-pointer mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 ${
                !additionOpen
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              Chỉnh sửa
            </button>
          </div>

          {/* Chỉnh sửa hồ sơ */}
          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">
              Bổ sung minh chứng
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
                  Coming soon
                </p>
              )}

            <button
              onClick={() => {
                if (!additionOpen) {
                  alert("Đang ngoài thời gian chỉnh sửa minh chứng.");
                  return;
                }

                router.push("/dashboard/editproof");
              }}
              className={`cursor-pointer mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 ${
                !additionOpen
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              Chỉnh sửa
            </button>
          </div>

          {/* Kết quả */}
          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">
              Xem kết quả
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
                  Coming soon
                </p>
              )}

            <button
              onClick={() => {
                if (!resultOpen) {
                  alert("Đang ngoài thời gian xem kết quả.");
                  return;
                }

                router.push("/dashboard/result");
              }}
              className={`cursor-pointer mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 ${
                !resultOpen
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              Xem kết quả
            </button>
          </div>     

        </section>
      </div>
    </main>
  );
}