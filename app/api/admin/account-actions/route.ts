import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !supabaseUrl ||
  !supabasePublishableKey ||
  !serviceRoleKey
) {
  throw new Error("Thiếu biến môi trường Supabase.");
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey
);

function formatPassword(date: string) {
  const [year, month, day] = date.split("-");

  return `${day}${month}${year}`;
}

function getClassKey(className: string) {
  const match = className.match(/^DGT1(\d{2})\d$/i);

  if (!match) {
    return null;
  }

  return match[1];
}
  // DGT1234 → 23
  // DGT1213 → 21
  // DGT1252 → 25

    const PROOF_BUCKET = "proofs";

/* =====================================================
   XÓA TOÀN BỘ DỮ LIỆU CỦA 1 TÀI KHOẢN
===================================================== */

async function deleteStudentAccount(mssv: string) {
  // ------------------------------------------
  // 1. Tìm profile để lấy Auth user ID
  // ------------------------------------------

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("mssv", mssv)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  // ------------------------------------------
  // 2. LẤY FILE PATH TRƯỚC KHI XÓA DATABASE
  // ------------------------------------------

  const {
    data: proofs,
    error: proofsSelectError,
  } = await supabaseAdmin
    .from("proofs")
    .select("file_path")
    .eq("mssv", mssv);

  if (proofsSelectError) {
    throw proofsSelectError;
  }

  const {
    data: editProofs,
    error: editProofsSelectError,
  } = await supabaseAdmin
    .from("edit_proofs")
    .select("file_path")
    .eq("mssv", mssv);

  if (editProofsSelectError) {
    throw editProofsSelectError;
  }

  // ------------------------------------------
  // 3. XÓA FILE TRONG STORAGE
  //
  // QUAN TRỌNG:
  // Phải làm bước này trước khi xóa proofs
  // và edit_proofs để còn file_path.
  // ------------------------------------------

  const proofPaths = (proofs ?? [])
    .map((item) => item.file_path)
    .filter(
      (path): path is string =>
        typeof path === "string" &&
        path.trim() !== ""
    );

  const editProofPaths = (editProofs ?? [])
    .map((item) => item.file_path)
    .filter(
      (path): path is string =>
        typeof path === "string" &&
        path.trim() !== ""
    );

  // Nếu cả proofs và edit_proofs đều dùng bucket "proofs"
  const allFilePaths = [
    ...proofPaths,
    ...editProofPaths,
  ];

  if (allFilePaths.length > 0) {
    const { error: storageError } =
      await supabaseAdmin.storage
        .from(PROOF_BUCKET)
        .remove(allFilePaths);

    if (storageError) {
      throw storageError;
    }
  }

  // ------------------------------------------
  // 4. Xóa proofs
  // ------------------------------------------

  const { error: proofDeleteError } =
    await supabaseAdmin
      .from("proofs")
      .delete()
      .eq("mssv", mssv);

  if (proofDeleteError) {
    throw proofDeleteError;
  }

  // ------------------------------------------
  // 5. Xóa edit_proofs
  // ------------------------------------------

  const { error: editProofDeleteError } =
    await supabaseAdmin
      .from("edit_proofs")
      .delete()
      .eq("mssv", mssv);

  if (editProofDeleteError) {
    throw editProofDeleteError;
  }

  // ------------------------------------------
  // 6. Xóa submissions
  // ------------------------------------------

  const { error: submissionError } =
    await supabaseAdmin
      .from("submissions")
      .delete()
      .eq("mssv", mssv);

  if (submissionError) {
    throw submissionError;
  }

  // ------------------------------------------
  // 7. Xóa profile
  // ------------------------------------------

  const { error: deleteProfileError } =
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("mssv", mssv);

  if (deleteProfileError) {
    throw deleteProfileError;
  }

  // ------------------------------------------
  // 8. Xóa Supabase Auth
  // ------------------------------------------

  if (profile?.id) {
    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(
        profile.id
      );

    if (authDeleteError) {
      throw authDeleteError;
    }
  }

  // ------------------------------------------
  // 9. CUỐI CÙNG: XÓA STUDENTS
  //
  // Phải để cuối vì students là nguồn dữ liệu
  // dùng để tạo lại tài khoản hàng loạt.
  // ------------------------------------------

  const { error: studentDeleteError } =
    await supabaseAdmin
      .from("students")
      .delete()
      .eq("mssv", mssv);

  if (studentDeleteError) {
    throw studentDeleteError;
  }

  return true;
}

/* =====================================================
   API
===================================================== */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      action,
      mssv,
      cohortKey,
      adminPassword,
    } = body;

    if (!adminPassword) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập lại mật khẩu quản trị viên.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 1. Lấy user hiện tại
    // ==========================================

    const {
      data: {
        user: currentUser,
      },
    } = await supabaseAuth.auth.getUser(
      request.headers.get("Authorization")?.replace(
        "Bearer ",
        ""
      ) ?? ""
    );

    /*
      Vì page dùng Supabase client nên token hiện tại
      được gửi qua Authorization.
    */

    if (!currentUser) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    // ==========================================
    // 2. Kiểm tra role admin
    // ==========================================

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Không có quyền quản trị." },
        { status: 403 }
      );
    }

    // ==========================================
    // 3. Xác nhận lại mật khẩu ADMIN
    // ==========================================

    const {
      error: passwordError,
    } = await supabaseAuth.auth.signInWithPassword({
      email: currentUser.email!,
      password: adminPassword,
    });

    if (passwordError) {
      return NextResponse.json(
        {
          error:
            "Mật khẩu quản trị viên không chính xác.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // 4. TẠO 1 TÀI KHOẢN
    // ==========================================

    if (action === "create") {
      if (!mssv) {
        return NextResponse.json(
          { error: "Vui lòng nhập MSSV." },
          { status: 400 }
        );
      }

      const {
        data: student,
        error: studentError,
      } = await supabaseAdmin
        .from("students")
        .select("id, mssv, birth_date")
        .eq("mssv", mssv)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          {
            error:
              "Không tìm thấy sinh viên có MSSV này.",
          },
          { status: 404 }
        );
      }

      if (!student.birth_date) {
        return NextResponse.json(
          {
            error:
              "Sinh viên chưa có ngày sinh nên không thể tạo mật khẩu mặc định.",
          },
          { status: 400 }
        );
      }

      const email =
        `${student.mssv}@sv5t.local`;

      const password =
        formatPassword(student.birth_date);

      const {
        data: authData,
        error: authError,
      } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) {
        return NextResponse.json(
          {
            error: authError.message,
          },
          { status: 400 }
        );
      }

      const {
        error: profileInsertError,
      } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          mssv: student.mssv,
          role: "student",
          must_change_password: true,
        });

      if (profileInsertError) {
        // Nếu Auth tạo thành công nhưng profile lỗi
        // thì rollback Auth.
        await supabaseAdmin.auth.admin.deleteUser(
          authData.user.id
        );

        return NextResponse.json(
          {
            error:
              "Tạo Auth thành công nhưng không tạo được profile: " +
              profileInsertError.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          `Đã tạo tài khoản cho MSSV ${student.mssv}.`,
      });
    }

    // ==========================================
    // 5. XÓA 1 TÀI KHOẢN
    // ==========================================

    if (action === "delete") {
      if (!mssv) {
        return NextResponse.json(
          { error: "Vui lòng nhập MSSV." },
          { status: 400 }
        );
      }

      await deleteStudentAccount(mssv);

      return NextResponse.json({
        success: true,
        message:
          `Đã xóa toàn bộ tài khoản và dữ liệu của MSSV ${mssv}.`,
      });
    }

    // ==========================================
    // 6. TẠO HÀNG LOẠT
    // ==========================================

    if (action === "create_all") {
      const {
        data: students,
        error: studentsError,
      } =
        await supabaseAdmin
          .from("students")
          .select(
            "id, mssv, birth_date"
          )
          .not("birth_date", "is", null);

      if (studentsError) {
        throw studentsError;
      }

      let created = 0;
      let skipped = 0;
      let failed = 0;

      for (const student of students ?? []) {
        try {
          const email =
            `${student.mssv}@sv5t.local`;

          const password =
            formatPassword(
              student.birth_date
            );

          const {
            data: authData,
            error: authError,
          } =
            await supabaseAdmin.auth.admin.createUser(
              {
                email,
                password,
                email_confirm: true,
              }
            );

          if (authError) {
            // Tài khoản đã tồn tại thì bỏ qua
            if (
              authError.message
                .toLowerCase()
                .includes("already")
            ) {
              skipped++;
              continue;
            }

            failed++;
            continue;
          }

          const {
            error: profileError,
          } =
            await supabaseAdmin
              .from("profiles")
              .insert({
                id: authData.user.id,
                mssv: student.mssv,
                role: "student",
                must_change_password: true,
              });

          if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(
              authData.user.id
            );

            failed++;
            continue;
          }

          created++;
        } catch {
          failed++;
        }
      }

      return NextResponse.json({
        success: true,
        message:
          `Hoàn tất: tạo ${created}, bỏ qua ${skipped}, lỗi ${failed}.`,
      });
    }

    // ==========================================
    // 7. XÓA HÀNG LOẠT THEO KHÓA
    // ==========================================

    if (action === "delete_cohort") {
      if (!cohortKey) {
        return NextResponse.json(
          { error: "Vui lòng nhập khóa." },
          { status: 400 }
        );
      }

      const key = String(cohortKey).trim();

      if (!/^\d{2}$/.test(key)) {
        return NextResponse.json(
          {
            error:
              "Khóa phải gồm đúng 2 chữ số.",
          },
          { status: 400 }
        );
      }

      // Lấy sinh viên có lớp
      const {
        data: students,
        error: studentsError,
      } =
        await supabaseAdmin
          .from("students")
          .select(
            "mssv, class_name"
          );

      if (studentsError) {
        throw studentsError;
      }

      const targets =
        (students ?? []).filter(
          (student) =>
            getClassKey(
              student.class_name ?? ""
            ) === key
        );

      let deleted = 0;
      let failed = 0;

      for (const student of targets) {
        try {
          await deleteStudentAccount(
            student.mssv
          );

          deleted++;
        } catch (error) {
          console.error(
            `DELETE COHORT ERROR ${student.mssv}:`,
            error
          );

          failed++;
        }
      }

      return NextResponse.json({
        success: true,
        message:
          `Đã xử lý khóa ${key}: xóa ${deleted} tài khoản, lỗi ${failed}.`,
      });
    }

    return NextResponse.json(
      { error: "Lệnh không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "ADMIN ACCOUNT ACTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi.",
      },
      { status: 500 }
    );
  }
}