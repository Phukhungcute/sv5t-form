
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

const supabaseAuth = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function GET(request: Request) {
  try {
    // Xác thực người dùng từ access token
    const token =
      request.headers
        .get("Authorization")
        ?.replace(/^Bearer\s+/i, "") ?? "";

    if (!token) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    // Chỉ admin được xem danh sách
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền quản trị." },
        { status: 403 }
      );
    }

    // Lấy dữ liệu hiển thị từ students
    const { data: students, error: studentsError } =
      await supabaseAdmin
        .from("students")
        .select("mssv, full_name, birth_date, gender, class_name")
        .order("mssv", { ascending: true });

    if (studentsError) throw studentsError;

    // Lấy danh sách tài khoản đã tạo
    const { data: profiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select("mssv, role");

    if (profilesError) throw profilesError;

    const profileByMssv = new Map(
      (profiles ?? [])
        .filter(
          (profile) => typeof profile.mssv === "string"
        )
        .map((profile) => [
          profile.mssv,
          profile.role,
        ])
    );

    const studentsWithoutAccount = (students ?? []).filter(
      (student) => !profileByMssv.has(student.mssv)
    );

    const studentsWithAccount = (students ?? []).filter(
      (student) =>
        profileByMssv.get(student.mssv) === "student"
    );

    return NextResponse.json({
      studentsWithoutAccount,
      studentsWithAccount,
    });
  } catch (error) {
    console.error("STUDENT ACCOUNT LIST ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tải danh sách tài khoản sinh viên." },
      { status: 500 }
    );
  }
}
