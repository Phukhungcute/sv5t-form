"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checking, setChecking] =
    useState(true);

  const [error, setError] = useState("");

  // ==========================================
  // KIỂM TRA USER
  // ==========================================

  useEffect(() => {
    async function checkUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/");
          return;
        }

        // Lấy profile để kiểm tra
        // must_change_password

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "mssv, role, must_change_password"
          )
          .eq("id", session.user.id)
          .single();

        if (profileError || !profile) {
          console.error(
            "CHANGE PASSWORD PROFILE ERROR:",
            profileError
          );

          await supabase.auth.signOut();

          router.replace("/");
          return;
        }

        // Không phải student
        if (profile.role !== "student") {
          router.replace("/dashboard");
          return;
        }

        // Đã đổi mật khẩu rồi
        if (!profile.must_change_password) {
          router.replace("/dashboard");
          return;
        }

        console.log(
          "MUST CHANGE PASSWORD:",
          profile.mssv
        );
      } catch (error) {
        console.error(
          "CHECK CHANGE PASSWORD ERROR:",
          error
        );

        router.replace("/");
      } finally {
        setChecking(false);
      }
    }

    checkUser();
  }, [router]);

  // ==========================================
  // ĐỔI MẬT KHẨU
  // ==========================================

  async function handleChangePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    // ========================================
    // CHECK PASSWORD
    // ========================================

    if (newPassword.length < 6) {
      setError(
        "Mật khẩu mới phải có ít nhất 6 ký tự."
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Mật khẩu xác nhận không trùng khớp."
      );

      return;
    }

    setLoading(true);

    try {
      // ==========================================
      // LẤY SESSION HIỆN TẠI
      // ==========================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log(
        "CHANGE PASSWORD SESSION:",
        session
      );

      console.log(
        "CHANGE PASSWORD SESSION ERROR:",
        sessionError
      );

      if (sessionError || !session) {
        console.error(
          "NO SESSION:",
          sessionError
        );

        setError(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );

        return;
      }

      // ==========================================
      // GỌI API
      // ==========================================

      const response = await fetch(
        "/api/auth/change-password",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "CHANGE PASSWORD API ERROR:",
          result
        );

        setError(
          result.error ||
            "Không thể đổi mật khẩu."
        );

        return;
      }

      // ========================================
      // THÀNH CÔNG
      // ========================================

      console.log(
        "CHANGE PASSWORD SUCCESS"
      );

      router.replace("/dashboard");
    } catch (error) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        error
      );

      setError(
        "Đã xảy ra lỗi. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOADING KIỂM TRA SESSION
  // ==========================================

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-500">
          Đang kiểm tra tài khoản...
        </div>
      </main>
    );
  }

  // ==========================================
  // GIAO DIỆN
  // ==========================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        {/* ======================================
            TIÊU ĐỀ
        ====================================== */}

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Đổi mật khẩu
          </h1>

          <p className="mt-2 text-gray-500">
            Đây là lần đăng nhập đầu tiên.
            <br />
            Vui lòng đổi mật khẩu trước khi tiếp tục.
          </p>
        </div>

        {/* ======================================
            FORM
        ====================================== */}

        <form
          onSubmit={handleChangePassword}
          className="space-y-5"
        >

          {/* ====================================
              MẬT KHẨU MỚI
          ==================================== */}

          <div>
            <label
              htmlFor="newPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Mật khẩu mới
            </label>

            <div className="relative">
              <input
                id="newPassword"
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="Nhập mật khẩu mới"
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(
                    (prev) => !prev
                  )
                }
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
                aria-label={
                  showNewPassword
                    ? "Ẩn mật khẩu"
                    : "Hiện mật khẩu"
                }
              >
                {showNewPassword ? (
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

          {/* ====================================
              NHẬP LẠI MẬT KHẨU
          ==================================== */}

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Nhập lại mật khẩu mới
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (prev) => !prev
                  )
                }
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
                aria-label={
                  showConfirmPassword
                    ? "Ẩn mật khẩu"
                    : "Hiện mật khẩu"
                }
              >
                {showConfirmPassword ? (
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

          {/* ====================================
              LỖI
          ==================================== */}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ====================================
              NÚT
          ==================================== */}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Đang đổi mật khẩu..."
              : "Đổi mật khẩu"}
          </button>

        </form>

        {/* ======================================
            GHI CHÚ
        ====================================== */}

        <p className="mt-6 text-center text-sm text-gray-500">
          Lưu ý: Bạn chỉ được đổi mật khẩu 1 lần. Để reset mật khẩu vui lòng liên hệ với
          fanpage page Đoàn Hội khoa Giáo dục Tiểu học trong thời gian xét duyệt hồ sơ.
        </p>

      </div>
    </main>
  );
}