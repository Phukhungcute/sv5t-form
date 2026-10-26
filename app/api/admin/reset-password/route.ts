import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabasePublishableKey || !serviceRoleKey) {
  throw new Error("Thiếu biến môi trường Supabase.");
}

// Chỉ dùng để xác thực access token.
const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey
);

// Chỉ sử dụng ở server.
const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

type ResetResult = {
  mssv: string;
  fullName: string | null;
  success: boolean;
  message: string;
};

function formatPassword(birthDate: string): string | null {
  // Chỉ chấp nhận ngày sinh dạng YYYY-MM-DD.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  // Kiểm tra ngày hợp lệ, bao gồm cả năm nhuận.
  const date = new Date(Date.UTC(y, m - 1, d));

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }

  return `${day}${month}${year}`;
}

function normalizeMssv(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const mssv = value.trim();

  return mssv || null;
}

export async function POST(request: Request) {
  try {
    // =================================================
    // 1. XÁC THỰC ACCESS TOKEN
    // =================================================

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token không hợp lệ." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user) {
      console.error("RESET PASSWORD USER ERROR:", userError);

      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    // =================================================
    // 2. KIỂM TRA QUYỀN ADMIN
    // =================================================

    const { data: adminProfile, error: adminProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (
      adminProfileError ||
      !adminProfile ||
      adminProfile.role !== "admin"
    ) {
      if (adminProfileError) {
        console.error(
          "RESET PASSWORD ADMIN PROFILE ERROR:",
          adminProfileError
        );
      }

      return NextResponse.json(
        { error: "Bạn không có quyền thực hiện thao tác này." },
        { status: 403 }
      );
    }

    // =================================================
    // 3. ĐỌC VÀ KIỂM TRA DANH SÁCH MSSV
    // =================================================

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Dữ liệu gửi lên không hợp lệ." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Dữ liệu gửi lên không hợp lệ." },
        { status: 400 }
      );
    }

    const payload = body as {
      mssv?: unknown;
      mssvs?: unknown;
    };

    let requestedMssvs: string[];

    if (Array.isArray(payload.mssvs)) {
      // Reset nhiều sinh viên.
      if (payload.mssvs.length === 0) {
        return NextResponse.json(
          { error: "Vui lòng chọn ít nhất một sinh viên." },
          { status: 400 }
        );
      }

      // Giới hạn số lượng để tránh một request quá lớn.
      if (payload.mssvs.length > 100) {
        return NextResponse.json(
          {
            error:
              "Mỗi lần chỉ được reset tối đa 100 sinh viên.",
          },
          { status: 400 }
        );
      }

      const normalized = payload.mssvs.map(normalizeMssv);

      if (normalized.some((mssv) => mssv === null)) {
        return NextResponse.json(
          { error: "Danh sách MSSV chứa dữ liệu không hợp lệ." },
          { status: 400 }
        );
      }

      requestedMssvs = normalized as string[];
    } else {
      // Tương thích với API cũ: { mssv: "..." }.
      const mssv = normalizeMssv(payload.mssv);

      if (!mssv) {
        return NextResponse.json(
          { error: "Vui lòng nhập MSSV." },
          { status: 400 }
        );
      }

      requestedMssvs = [mssv];
    }

    // Loại bỏ MSSV trùng lặp.
    requestedMssvs = [...new Set(requestedMssvs)];

    // =================================================
    // 4. LẤY THÔNG TIN SINH VIÊN
    // =================================================

    const { data: students, error: studentsError } =
      await supabaseAdmin
        .from("students")
        .select("mssv, full_name, birth_date")
        .in("mssv", requestedMssvs);

    if (studentsError) {
      console.error("RESET PASSWORD STUDENTS ERROR:", studentsError);

      return NextResponse.json(
        { error: "Không thể lấy danh sách sinh viên." },
        { status: 500 }
      );
    }

    const studentMap = new Map(
      (students ?? []).map((student) => [student.mssv, student])
    );

    // =================================================
    // 5. LẤY PROFILE TƯƠNG ỨNG
    // =================================================

    const { data: profiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, mssv, role")
        .in("mssv", requestedMssvs);

    if (profilesError) {
      console.error("RESET PASSWORD PROFILES ERROR:", profilesError);

      return NextResponse.json(
        { error: "Không thể lấy thông tin tài khoản sinh viên." },
        { status: 500 }
      );
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.mssv, profile])
    );

    // =================================================
    // 6. RESET TỪNG TÀI KHOẢN
    // =================================================

    const results: ResetResult[] = [];

    // Thực hiện tuần tự để hạn chế số thao tác đồng thời.
    for (const mssv of requestedMssvs) {
      const student = studentMap.get(mssv);

      if (!student) {
        results.push({
          mssv,
          fullName: null,
          success: false,
          message: "Không tìm thấy sinh viên.",
        });

        continue;
      }

      const profile = profileMap.get(mssv);

      if (!profile) {
        results.push({
          mssv,
          fullName: student.full_name,
          success: false,
          message: "Sinh viên chưa có tài khoản hệ thống.",
        });

        continue;
      }

      if (profile.role !== "student") {
        results.push({
          mssv,
          fullName: student.full_name,
          success: false,
          message: "Tài khoản không phải tài khoản sinh viên.",
        });

        continue;
      }

      if (!student.birth_date) {
        results.push({
          mssv,
          fullName: student.full_name,
          success: false,
          message: "Sinh viên chưa có ngày sinh.",
        });

        continue;
      }

      const password = formatPassword(student.birth_date);

      if (!password) {
        results.push({
          mssv,
          fullName: student.full_name,
          success: false,
          message: "Ngày sinh không hợp lệ.",
        });

        continue;
      }

      // 6.1. Cập nhật mật khẩu.
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(
          profile.id,
          { password }
        );

      if (updateError) {
        console.error(
          `RESET PASSWORD AUTH ERROR (${mssv}):`,
          updateError
        );

        results.push({
          mssv,
          fullName: student.full_name,
          success: false,
          message: "Không thể cập nhật mật khẩu.",
        });

        continue;
      }

      // 6.2. Đánh dấu bắt buộc đổi mật khẩu.
      const { data: updatedProfile, error: mustChangeError } =
        await supabaseAdmin
          .from("profiles")
          .update({ must_change_password: true })
          .eq("id", profile.id)
          .select("id")
          .maybeSingle();

      if (mustChangeError || !updatedProfile) {
        console.error(
          `RESET PASSWORD PROFILE UPDATE ERROR (${mssv}):`,
          mustChangeError
        );

        results.push({
          mssv,
          fullName: student.full_name,
          success: false,
          message:
            "Mật khẩu đã được reset nhưng trạng thái bắt buộc đổi mật khẩu chưa được cập nhật.",
        });

        continue;
      }

      console.log(
        `ADMIN RESET PASSWORD: ${mssv} (${student.full_name})`
      );

      results.push({
        mssv,
        fullName: student.full_name,
        success: true,
        message: `Đã reset mật khẩu cho ${mssv}.`,
      });
    }

    // =================================================
    // 7. TRẢ KẾT QUẢ
    // =================================================

    const successCount = results.filter(
      (result) => result.success
    ).length;

    const failedCount = results.length - successCount;

    return NextResponse.json({
      success: failedCount === 0,
      message:
        failedCount === 0
          ? `Đã reset mật khẩu thành công cho ${successCount} sinh viên.`
          : `Đã reset thành công ${successCount}/${results.length} sinh viên. Có ${failedCount} trường hợp thất bại.`,
      total: results.length,
      successCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi reset mật khẩu." },
      { status: 500 }
    );
  }
}