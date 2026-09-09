"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type LoginMode = "student" | "admin";

export default function Home() {
  const router = useRouter();

  const [loginMode, setLoginMode] =
    useState<LoginMode>("student");

  const [mssv, setMssv] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      let loginEmail = "";

      // ==========================================
      // BƯỚC 1: XÁC ĐỊNH EMAIL ĐĂNG NHẬP
      // ==========================================

      if (loginMode === "student") {
        /*
          Sinh viên:
          MSSV → RPC → Email Auth
        */

        const {
          data: authEmail,
          error: emailError,
        } = await supabase.rpc(
          "get_login_email",
          {
            student_mssv: mssv.trim(),
          }
        );

        if (emailError) {
          console.error(
            "EMAIL ERROR:",
            emailError
          );

          setError(
            "Đã xảy ra lỗi. Vui lòng thử lại."
          );

          return;
        }

        if (!authEmail) {
          setError(
            "MSSV hoặc mật khẩu không đúng."
          );

          return;
        }

        loginEmail = authEmail;
      } else {
        /*
          Admin:
          Email được nhập trực tiếp.
        */

        if (!email.trim()) {
          setError(
            "Vui lòng nhập email quản trị."
          );

          return;
        }

        loginEmail = email.trim();
      }

      // ==========================================
      // BƯỚC 2: ĐĂNG NHẬP SUPABASE AUTH
      // ==========================================

      const {
        error: loginError,
      } =
        await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

      if (loginError) {
        console.error(
          "LOGIN ERROR:",
          loginError
        );

        setError(
          loginMode === "admin"
            ? "Email hoặc mật khẩu không đúng."
            : "MSSV hoặc mật khẩu không đúng."
        );

        return;
      }

      // ==========================================
      // BƯỚC 3: LẤY USER
      // ==========================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "USER ERROR:",
          userError
        );

        setError(
          "Không thể lấy thông tin tài khoản."
        );

        return;
      }

      // ==========================================
      // BƯỚC 4: LẤY ROLE
      // ==========================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "mssv, role, must_change_password"
        )
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error(
          "PROFILE ERROR:",
          profileError
        );

        await supabase.auth.signOut();

        setError(
          "Không tìm thấy thông tin tài khoản."
        );

        return;
      }

      // ==========================================
      // BƯỚC 5: KIỂM TRA ROLE
      // ==========================================

      if (loginMode === "admin") {
        /*
          Đang ở tab Admin nhưng account
          không phải admin.
        */

        if (profile.role !== "admin") {
          await supabase.auth.signOut();

          setError(
            "Tài khoản này không có quyền quản trị."
          );

          return;
        }

        router.replace("/admin");
      } else {
        /*
          Đang ở tab Sinh viên nhưng account
          không phải student.
        */

        if (profile.role === "admin") {
          await supabase.auth.signOut();

          setError(
            "Vui lòng đăng nhập bằng tab Quản trị viên."
          );

          return;
        }

        // ========================================
        // KIỂM TRA MUST CHANGE PASSWORD
        // ========================================

        if (profile.must_change_password) {
          router.replace("/change-password");
          return;
        }

        router.replace("/dashboard");
      }
    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      setError(
        "Đã xảy ra lỗi. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        {/* ========================================
            TIÊU ĐỀ
        ======================================== */}

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            SV5T Form
          </h1>

          <p className="mt-2 text-gray-500">
            Hệ thống quản lý hồ sơ sinh viên
          </p>
        </div>

        {/* ========================================
            TAB ĐĂNG NHẬP
        ======================================== */}

        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">

          {/* Sinh viên */}

          <button
            type="button"
            onClick={() => {
              setLoginMode("student");
              setError("");
            }}
            disabled={loading}
            className={`flex-1 cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium transition ${
              loginMode === "student"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sinh viên
          </button>

          {/* Admin */}

          <button
            type="button"
            onClick={() => {
              setLoginMode("admin");
              setError("");
            }}
            disabled={loading}
            className={`flex-1 cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium transition ${
              loginMode === "admin"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Quản trị viên
          </button>

        </div>

        {/* ========================================
            FORM
        ======================================== */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* ======================================
              ADMIN → EMAIL
          ====================================== */}

          {loginMode === "admin" && (
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email quản trị
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Nhập email"
                autoComplete="username"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                required
              />
            </div>
          )}

          {/* ======================================
              STUDENT → MSSV
          ====================================== */}

          {loginMode === "student" && (
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
                onChange={(e) =>
                  setMssv(e.target.value)
                }
                placeholder="Nhập MSSV"
                autoComplete="username"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                required
              />
            </div>
          )}

          {/* ======================================
              MẬT KHẨU
          ====================================== */}

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Mật khẩu
            </label>

            <div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                  aria-label={
                    showPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                >
                  {showPassword ? (
                    // Mắt bị gạch — đang hiện mật khẩu
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3l18 18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.584 10.587a2 2 0 002.829 2.829"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.88 5.09A10.77 10.77 0 0112 4.5c5.25 0 9.27 4.5 10.5 7.5a11.83 11.83 0 01-4.05 4.83"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.228 6.228C4.44 7.45 3.2 9.18 1.5 12c1.23 3 5.25 7.5 10.5 7.5 1.61 0 3.09-.36 4.37-.99"
                      />
                    </svg>
                  ) : (
                    // Mắt — đang che mật khẩu
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="2.75"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ======================================
              THÔNG BÁO LỖI
          ====================================== */}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ======================================
              NÚT ĐĂNG NHẬP
          ====================================== */}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>

        </form>

        {/* ========================================
            GHI CHÚ
        ======================================== */}

        {loginMode === "student" && (
          <p className="mt-6 text-center text-sm text-gray-500">
            Mật khẩu mặc định là ngày tháng năm sinh
          </p>
        )}

        {loginMode === "admin" && (
          <p className="mt-6 text-center text-sm text-gray-500">
            Sử dụng email và mật khẩu quản trị được cấp
          </p>
        )}

      </div>
    </main>
  );
}