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

// Lấy thông tin sinh viên từ bảng students
const { data: students, error: studentsError } =
  await supabaseAdmin
    .from("students")
    .select("mssv, full_name, birth_date, gender, class_name")
    .order("mssv", { ascending: true });

if (studentsError) throw studentsError;

// Lấy thông tin tài khoản từ profiles
const { data: profiles, error: profilesError } =
  await supabaseAdmin
    .from("profiles")
    .select("mssv, role, must_change_password");

if (profilesError) throw profilesError;

// Ánh xạ MSSV với thông tin tài khoản
const profileByMssv = new Map<
  string,
  {
    role: string;
    must_change_password: boolean | null;
  }
>();

for (const profile of profiles ?? []) {
  if (typeof profile.mssv === "string") {
    profileByMssv.set(profile.mssv, {
      role: profile.role,
      must_change_password: profile.must_change_password,
    });
  }
}

// Sinh viên chưa có tài khoản
const studentsWithoutAccount = (students ?? []).filter(
  (student) => !profileByMssv.has(student.mssv)
);

// Sinh viên đã có tài khoản, kèm trạng thái đổi mật khẩu
const studentsWithAccount = (students ?? [])
  .filter(
    (student) =>
      profileByMssv.get(student.mssv)?.role === "student"
  )
  .map((student) => ({
    ...student,
    must_change_password:
      profileByMssv.get(student.mssv)?.must_change_password ?? null,
  }));

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