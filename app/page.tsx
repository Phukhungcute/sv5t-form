"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  const [mssv, setMssv] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // ==========================================
      // BƯỚC 1: Tìm email Auth từ MSSV
      // ==========================================

      const { data: email, error: emailError } = await supabase.rpc(
        "get_login_email",
        {
          student_mssv: mssv.trim(),
        }
      );

      if (emailError) {
        console.error("EMAIL ERROR:", emailError);
        setError("Đã xảy ra lỗi. Vui lòng thử lại.");
        return;
      }

      if (!email) {
        setError("MSSV hoặc mật khẩu không đúng.");
        return;
      }

      // ==========================================
      // BƯỚC 2: Đăng nhập Supabase Auth
      // ==========================================

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        console.error("LOGIN ERROR:", loginError);

        setError("MSSV hoặc mật khẩu không đúng.");
        return;
      }

      // ==========================================
      // BƯỚC 3: Lấy thông tin người dùng vừa đăng nhập
      // ==========================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("USER ERROR:", userError);

        setError("Không thể lấy thông tin tài khoản.");
        return;
      }

      // ==========================================
      // BƯỚC 4: Lấy role từ profiles
      // ==========================================

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("mssv, role, must_change_password")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("PROFILE ERROR:", profileError);

        // Nếu không lấy được profile thì đăng xuất
        await supabase.auth.signOut();

        setError("Không tìm thấy thông tin tài khoản.");
        return;
      }

      // ==========================================
      // BƯỚC 5: Chuyển trang theo role
      // ==========================================

      if (profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Tiêu đề */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            SV5T Form
          </h1>

          <p className="mt-2 text-gray-500">
            Hệ thống quản lý hồ sơ sinh viên
          </p>
        </div>

        {/* Form đăng nhập */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* MSSV */}
          <div>
            <label
              htmlFor="mssv"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Mã số sinh viên
            </label>

            <input
              id="mssv"
              name="mssv"
              type="text"
              value={mssv}
              onChange={(e) => setMssv(e.target.value)}
              placeholder="Nhập MSSV"
              autoComplete="username"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              required
            />
          </div>

          {/* Mật khẩu */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Mật khẩu
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              required
            />
          </div>

          {/* Thông báo lỗi */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Nút đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        {/* Ghi chú */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Mật khẩu mặc định là ngày tháng năm sinh
        </p>
      </div>
    </main>
  );
}