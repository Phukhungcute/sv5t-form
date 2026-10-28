import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Xác thực người dùng
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

    // 2. Kiểm tra quyền admin
    const { data: adminProfile, error: adminError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (adminError) throw adminError;

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền quản trị." },
        { status: 403 }
      );
    }

    // 3. Lấy danh sách sinh viên
    const { data: students, error: studentsError } =
      await supabaseAdmin
        .from("students")
        .select(
          "mssv, full_name, birth_date, gender, class_name"
        )
        .order("mssv", { ascending: true });

    if (studentsError) throw studentsError;

    // 4. Lấy trạng thái quyền từ profiles
    const { data: profiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select("mssv, maintenance_access")
        .eq("role", "student");

    if (profilesError) throw profilesError;

    // Map trạng thái theo MSSV
    const maintenanceAccessByMssv = new Map<string, boolean>(
      (profiles ?? [])
        .filter(
          (profile) => typeof profile.mssv === "string"
        )
        .map((profile) => [
          profile.mssv as string,
          profile.maintenance_access === true,
        ])
    );

    // 5. Ghép dữ liệu sinh viên và quyền thẻ vàng
    const result = (students ?? []).map((student) => ({
      ...student,
      maintenance_access:
        maintenanceAccessByMssv.get(student.mssv) ?? false,
    }));

    return NextResponse.json({ students: result });
  } catch (error) {
    console.error("MAINTENANCE ACCESS LIST ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tải danh sách quyền thẻ vàng." },
      { status: 500 }
    );
  }
}