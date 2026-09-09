import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabasePublishableKey || !serviceRoleKey) {
  throw new Error("Thiếu biến môi trường Supabase.");
}

// Client dùng để kiểm tra session của admin.
// Không dùng Service Role Key cho bước này.
const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey
);

// Client này CHỈ chạy ở server và chứa Service Role Key.
const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

function formatPassword(birthDate: string) {
  const [year, month, day] = birthDate.split("-");
  return `${day}${month}${year}`;
}

export async function POST(request: Request) {
  try {
    // =================================================
    // 1. LẤY ACCESS TOKEN CỦA NGƯỜI ĐANG GỌI API
    // =================================================

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7);

    // =================================================
    // 2. KIỂM TRA TOKEN + ROLE ADMIN
    // =================================================

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

    const { data: adminProfile, error: adminProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      adminProfileError ||
      !adminProfile ||
      adminProfile.role !== "admin"
    ) {
      console.warn(
        "RESET PASSWORD FORBIDDEN:",
        user.id
      );

      return NextResponse.json(
        { error: "Bạn không có quyền thực hiện thao tác này." },
        { status: 403 }
      );
    }

    // =================================================
    // 3. LẤY MSSV
    // =================================================

    const body = await request.json();
    const mssv = String(body?.mssv ?? "").trim();

    if (!mssv) {
      return NextResponse.json(
        { error: "Vui lòng nhập MSSV." },
        { status: 400 }
      );
    }

    // =================================================
    // 4. TÌM SINH VIÊN
    // =================================================

    const { data: student, error: studentError } =
      await supabaseAdmin
        .from("students")
        .select("mssv, full_name, birth_date")
        .eq("mssv", mssv)
        .single();

    if (studentError || !student) {
      console.error("RESET PASSWORD STUDENT ERROR:", studentError);

      return NextResponse.json(
        { error: "Không tìm thấy sinh viên với MSSV này." },
        { status: 404 }
      );
    }

    // =================================================
    // 5. TÌM PROFILE CỦA SINH VIÊN
    // =================================================

    const { data: studentProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("mssv", student.mssv)
        .single();

    if (profileError || !studentProfile) {
      console.error("RESET PASSWORD PROFILE ERROR:", profileError);

      return NextResponse.json(
        { error: "Sinh viên chưa có tài khoản hệ thống." },
        { status: 404 }
      );
    }

    if (studentProfile.role !== "student") {
      return NextResponse.json(
        { error: "Tài khoản này không phải tài khoản sinh viên." },
        { status: 400 }
      );
    }

    // =================================================
    // 6. RESET PASSWORD VỀ NGÀY SINH
    // =================================================

    const password = formatPassword(student.birth_date);

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(
        studentProfile.id,
        {
          password,
        }
      );

    if (updateError) {
      console.error("RESET PASSWORD AUTH ERROR:", updateError);

      return NextResponse.json(
        { error: "Không thể reset mật khẩu." },
        { status: 500 }
      );
    }

    // Sau khi admin reset, bắt sinh viên đổi mật khẩu lại.
    const { error: mustChangeError } =
      await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", studentProfile.id);

    if (mustChangeError) {
      console.error(
        "RESET PASSWORD PROFILE UPDATE ERROR:",
        mustChangeError
      );

      // Mật khẩu đã reset thành công, nên trả về lỗi riêng
      // để admin biết phần must_change_password chưa cập nhật.
      return NextResponse.json(
        {
          error:
            "Đã reset mật khẩu nhưng không thể cập nhật trạng thái đổi mật khẩu.",
        },
        { status: 500 }
      );
    }

    console.log(
      `ADMIN RESET PASSWORD: ${student.mssv} (${student.full_name})`
    );

    return NextResponse.json({
      success: true,
      message: `Đã reset mật khẩu cho ${student.mssv}.`,
      student: {
        mssv: student.mssv,
        fullName: student.full_name,
      },
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi reset mật khẩu." },
      { status: 500 }
    );
  }
}
