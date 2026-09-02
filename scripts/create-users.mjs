import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Thiếu biến môi trường Supabase.");
}

const supabaseAdmin = createClient(
  supabaseUrl,
  secretKey
);

function formatPassword(date) {
  const [year, month, day] = date.split("-");

  return `${day}${month}${year}`;
}

async function main() {
    const studentId = process.argv[2];

  if (!studentId) {
    throw new Error("Vui lòng nhập ID sinh viên. Ví dụ: ... 844");
  }

  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select("id, mssv, birth_date")
    .eq("id", studentId)
    .single();

  if (error) {
    throw error;
  }

  console.log(`Tìm thấy sinh viên ID ${student.id}: ${student.mssv}`);

  const email = `${student.mssv}@sv5t.local`;
  const password = formatPassword(student.birth_date);

  console.log(`Đang tạo: ${student.mssv}`);

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    console.error(
      `Không tạo được ${student.mssv}:`,
      authError.message
    );
    return;
  }

  const { error: profileError } = await supabaseAdmin
  .from("profiles")
  .insert({
    id: authData.user.id,
    mssv: student.mssv,
    role: "student",
    must_change_password: true,
  });

    if (profileError) {
    console.error(
        `Tạo Auth thành công nhưng không tạo được profile cho ${student.mssv}:`,
        profileError.message
    );
    return;
    }

    console.log(`Đã tạo tài khoản và profile: ${student.mssv}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});