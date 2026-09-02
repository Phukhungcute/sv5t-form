"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
            .select("mssv, role")
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
  }, [router]);

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
              SV5T Form
            </h1>

            <p className="mt-1 text-gray-500">
              Hệ thống quản lý hồ sơ sinh viên
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
                {"Giáo dục Tiểu học"}
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

            <p className="mt-4 text-sm font-medium text-green-600">
              ● Đang mở
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Hạn gửi: 30/09/2026
            </p>

            <button
              onClick={() => router.push("/dashboard/submit")}
              className="cursor-pointer mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Gửi hồ sơ
            </button>
          </div>

          {/* Chỉnh sửa hồ sơ */}
          <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900">
              Chỉnh sửa hồ sơ
            </h3>

            <p className="mt-2 text-gray-600">
              Cập nhật thông tin hồ sơ đã gửi.
              <br />
              <br />
            </p>

            <p className="mt-4 text-sm font-medium text-green-600">
              ● Đang mở
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Hạn chỉnh sửa: 05/10/2026
            </p>

            <button
              onClick={() => router.push("/dashboard/edit")}
              className="cursor-pointer mt-5 w-full rounded-lg border border-blue-600 px-4 py-3 font-medium text-blue-600 transition hover:bg-blue-50"
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

            <p className="mt-4 text-sm font-medium text-gray-500">
              ● Chưa có kết quả
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Kết quả sẽ được cập nhật sau.
            </p>

            <button
              onClick={() => router.push("/dashboard/result")}
              className="cursor-pointer mt-5 w-full rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-300"
            >
              Xem kết quả
            </button>
          </div>

        </section>
      </div>
    </main>
  );
}