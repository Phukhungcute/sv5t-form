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

        router.push("/admin");
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

        router.push("/dashboard");
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

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              required
            />
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