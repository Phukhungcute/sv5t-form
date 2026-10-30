import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* =====================================================
   SUPABASE CLIENTS
===================================================== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabasePublishableKey || !serviceRoleKey) {
  throw new Error("Thiếu biến môi trường Supabase.");
}

// Chỉ sử dụng Service Role Key ở phía server.
const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Client dùng để xác thực người dùng và mật khẩu.
const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/* =====================================================
   TYPES
===================================================== */

type ImportStudentInput = {
  mssv: string;
  full_name: string;
  birth_date: string;
  gender: string;
  classname?: string;
  class_name?: string;
};

type ImportLog = {
  mssv: string;
  status: "success" | "duplicate" | "failed";
  message: string;
};

type ImportStudentResult = {
  success: boolean;
  message: string;
  created: number;
  skipped: number;
  failed: number;
  logs: ImportLog[];
};

/* =====================================================
   HELPERS
===================================================== */

// Kiểm tra ngày theo định dạng YYYY-MM-DD.
// Không chấp nhận ngày không tồn tại như 2004-02-30.
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Chuẩn hóa dữ liệu đầu vào.
function normalizeStudent(input: ImportStudentInput) {
  return {
    mssv: input.mssv.trim(),
    full_name: input.full_name.trim(),
    birth_date: input.birth_date.trim(),
    gender: input.gender.trim(),
    class_name: (
      input.class_name ??
      input.classname ??
      ""
    ).trim(),
  };
}

function isValidStudentInput(
  input: ReturnType<typeof normalizeStudent>
): string | null {
  if (!input.mssv) {
    return "Thiếu MSSV.";
  }

  if (!input.full_name) {
    return "Thiếu họ tên.";
  }

  if (!input.birth_date) {
    return "Thiếu ngày sinh.";
  }

  if (!isValidDate(input.birth_date)) {
    return "Ngày sinh không hợp lệ. Định dạng yêu cầu: YYYY-MM-DD.";
  }

  if (!input.gender) {
    return "Thiếu giới tính.";
  }

  if (!input.class_name) {
    return "Thiếu lớp.";
  }

  return null;
}

function createResult(
  created: number,
  skipped: number,
  failed: number,
  logs: ImportLog[]
): ImportStudentResult {
  return {
    success: failed === 0,
    message:
      `Hoàn tất nhập danh sách — ` +
      `Thành công: ${created}, ` +
      `trùng: ${skipped}, ` +
      `thất bại: ${failed}.`,
    created,
    skipped,
    failed,
    logs,
  };
}

/* =====================================================
   POST: IMPORT STUDENTS FROM CSV
===================================================== */

export async function POST(request: Request) {
  try {
    /* ==========================================
       1. AUTHENTICATION
    ========================================== */

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
      data: { user: currentUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." },
        { status: 401 }
      );
    }

    /* ==========================================
       2. CHECK ADMIN ROLE
    ========================================== */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "[IMPORT_STUDENTS] Profile lookup error:",
        profileError
      );

      return NextResponse.json(
        { error: "Không thể xác minh quyền quản trị." },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền quản trị." },
        { status: 403 }
      );
    }

    /* ==========================================
       3. VERIFY ADMIN PASSWORD
    ========================================== */

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("adminPassword" in body) ||
      !("students" in body)
    ) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ." },
        { status: 400 }
      );
    }

    const requestBody = body as {
      adminPassword: unknown;
      students: unknown;
    };

    if (
      typeof requestBody.adminPassword !== "string" ||
      !requestBody.adminPassword.trim()
    ) {
      return NextResponse.json(
        {
          error: "Vui lòng nhập lại mật khẩu quản trị viên.",
        },
        { status: 400 }
      );
    }

    if (!currentUser.email) {
      return NextResponse.json(
        {
          error: "Tài khoản quản trị không có email hợp lệ.",
        },
        { status: 400 }
      );
    }

    const { error: passwordError } =
      await supabaseAuth.auth.signInWithPassword({
        email: currentUser.email,
        password: requestBody.adminPassword,
      });

    if (passwordError) {
      return NextResponse.json(
        {
          error: "Mật khẩu quản trị viên không chính xác.",
        },
        { status: 401 }
      );
    }

    /* ==========================================
       4. VALIDATE STUDENT LIST
    ========================================== */

    if (
      !Array.isArray(requestBody.students) ||
      requestBody.students.length === 0
    ) {
      return NextResponse.json(
        { error: "Danh sách sinh viên đang trống." },
        { status: 400 }
      );
    }

    // Giới hạn số bản ghi mỗi request để tránh
    // request quá lớn gây quá tải máy chủ.
    const MAX_IMPORT_ROWS = 2000;

    if (requestBody.students.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        {
          error:
            `Mỗi lần chỉ được nhập tối đa ${MAX_IMPORT_ROWS} sinh viên.`,
        },
        { status: 413 }
      );
    }

    const rawStudents = requestBody.students as unknown[];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    const logs: ImportLog[] = [];

    /*
      Chuẩn hóa MSSV trước khi kiểm tra trùng.

      Nếu một MSSV xuất hiện nhiều lần trong cùng
      file CSV, bản ghi đầu tiên được xử lý trước;
      những lần xuất hiện tiếp theo được ghi nhận
      là trùng.
    */

    const seenMssv = new Set<string>();

    const validStudents: {
      rowNumber: number;
      student: ReturnType<typeof normalizeStudent>;
    }[] = [];

    for (let index = 0; index < rawStudents.length; index++) {
      const rowNumber = index + 1;
      const rawStudent = rawStudents[index];

      if (
        typeof rawStudent !== "object" ||
        rawStudent === null
      ) {
        failed++;

        logs.push({
          mssv: `(Dòng ${rowNumber})`,
          status: "failed",
          message: "Dữ liệu sinh viên không hợp lệ.",
        });

        continue;
      }

      const candidate =
        rawStudent as Partial<ImportStudentInput>;

      if (
        typeof candidate.mssv !== "string" ||
        typeof candidate.full_name !== "string" ||
        typeof candidate.birth_date !== "string" ||
        typeof candidate.gender !== "string" ||
        !(
          typeof candidate.classname === "string" ||
          typeof candidate.class_name === "string"
        )
      ) {
        failed++;

        logs.push({
          mssv:
            typeof candidate.mssv === "string"
              ? candidate.mssv.trim() || `(Dòng ${rowNumber})`
              : `(Dòng ${rowNumber})`,
          status: "failed",
          message: "Thiếu cột hoặc kiểu dữ liệu không hợp lệ.",
        });

        continue;
      }

      const student = normalizeStudent(
        candidate as ImportStudentInput
      );

      const validationError = isValidStudentInput(student);

      if (validationError) {
        failed++;

        logs.push({
          mssv: student.mssv || `(Dòng ${rowNumber})`,
          status: "failed",
          message: validationError,
        });

        continue;
      }

      if (seenMssv.has(student.mssv)) {
        skipped++;

        logs.push({
          mssv: student.mssv,
          status: "duplicate",
          message: "MSSV xuất hiện nhiều lần trong file CSV.",
        });

        continue;
      }

      seenMssv.add(student.mssv);

      validStudents.push({
        rowNumber,
        student,
      });
    }

    /* ==========================================
       5. LOAD EXISTING MSSV FROM STUDENTS
    ========================================== */

    const mssvs = validStudents.map(
      ({ student }) => student.mssv
    );

    const existingMssvs = new Set<string>();

    // Chia nhỏ truy vấn để tránh truyền quá nhiều
    // MSSV vào một câu lệnh .in().
    const QUERY_BATCH_SIZE = 500;

    for (
      let start = 0;
      start < mssvs.length;
      start += QUERY_BATCH_SIZE
    ) {
      const batch = mssvs.slice(
        start,
        start + QUERY_BATCH_SIZE
      );

      const {
        data: existingStudents,
        error: existingError,
      } = await supabaseAdmin
        .from("students")
        .select("mssv")
        .in("mssv", batch);

      if (existingError) {
        console.error(
          "[IMPORT_STUDENTS] Existing students lookup error:",
          existingError
        );

        return NextResponse.json(
          {
            error:
              "Không thể kiểm tra MSSV hiện có trong cơ sở dữ liệu. Chưa thực hiện nhập dữ liệu.",
          },
          { status: 500 }
        );
      }

      for (const student of existingStudents ?? []) {
        existingMssvs.add(student.mssv);
      }
    }

    /* ==========================================
       6. INSERT STUDENTS
    ========================================== */

    for (const { student } of validStudents) {
      if (existingMssvs.has(student.mssv)) {
        skipped++;

        logs.push({
          mssv: student.mssv,
          status: "duplicate",
          message: "MSSV đã tồn tại trong bảng students.",
        });

        continue;
      }

      try {
        const { error: insertError } =
          await supabaseAdmin
            .from("students")
            .insert({
              mssv: student.mssv,
              full_name: student.full_name,
              birth_date: student.birth_date,
              gender: student.gender,
              class_name: student.class_name,
            });

        if (insertError) {
          /*
            Nếu có ràng buộc UNIQUE trên mssv,
            PostgreSQL trả mã 23505 khi bản ghi
            bị trùng do một request khác vừa thêm.
          */
          if (insertError.code === "23505") {
            skipped++;

            logs.push({
              mssv: student.mssv,
              status: "duplicate",
              message: "MSSV đã tồn tại trong bảng students.",
            });

            continue;
          }

          failed++;

          console.error(
            `[IMPORT_STUDENTS] Insert error for ${student.mssv}:`,
            insertError
          );

          logs.push({
            mssv: student.mssv,
            status: "failed",
            message:
              "Không thể thêm sinh viên vào cơ sở dữ liệu.",
          });

          continue;
        }

        created++;

        logs.push({
          mssv: student.mssv,
          status: "success",
          message: "Đã thêm sinh viên thành công.",
        });

        // Ghi nhận ngay để tránh xử lý lại MSSV
        // trong cùng request.
        existingMssvs.add(student.mssv);
      } catch (error) {
        failed++;

        console.error(
          `[IMPORT_STUDENTS] Unexpected error for ${student.mssv}:`,
          error
        );

        logs.push({
          mssv: student.mssv,
          status: "failed",
          message: "Đã xảy ra lỗi khi thêm sinh viên.",
        });
      }
    }

    /* ==========================================
       7. RETURN RESULT
    ========================================== */

    const result = createResult(
      created,
      skipped,
      failed,
      logs
    );

    console.log(
      `[IMPORT_STUDENTS] HOÀN TẤT — ` +
        `Thành công: ${created}, ` +
        `trùng: ${skipped}, ` +
        `thất bại: ${failed}.`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[IMPORT_STUDENTS] API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi nhập danh sách sinh viên.",
      },
      { status: 500 }
    );
  }
}