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
      maintenanceMode,
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
    // 4.1. CẤP THẺ VÀNG
    // ==========================================

    if (action === "grant_maintenance") {
      const studentMssv =
        typeof mssv === "string" ? mssv.trim() : "";

      if (!studentMssv) {
        return NextResponse.json(
          { error: "Vui lòng nhập MSSV." },
          { status: 400 }
        );
      }

      const { data: target, error: targetError } =
        await supabaseAdmin
          .from("profiles")
          .select("id, mssv, role, maintenance_access")
          .eq("mssv", studentMssv)
          .maybeSingle();

      if (targetError) {
        throw targetError;
      }

      if (!target) {
        return NextResponse.json(
          { error: "Không tìm thấy tài khoản có MSSV này." },
          { status: 404 }
        );
      }

      if (target.role !== "student") {
        return NextResponse.json(
          { error: "Chỉ có thể cấp thẻ vàng cho tài khoản sinh viên." },
          { status: 400 }
        );
      }

      if (target.maintenance_access) {
        return NextResponse.json(
          { error: "Sinh viên này đã có thẻ vàng." },
          { status: 400 }
        );
      }

      const { error: updateError } =
        await supabaseAdmin
          .from("profiles")
          .update({ maintenance_access: true })
          .eq("id", target.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: `Đã cấp thẻ vàng cho sinh viên ${studentMssv}.`,
      });
    }

    // ==========================================
    // 4.2. THU HỒI THẺ VÀNG
    // ==========================================

    if (action === "revoke_maintenance") {
      const studentMssv =
        typeof mssv === "string" ? mssv.trim() : "";

      if (!studentMssv) {
        return NextResponse.json(
          { error: "Thiếu MSSV cần thu hồi thẻ vàng." },
          { status: 400 }
        );
      }

      const { data: target, error: targetError } =
        await supabaseAdmin
          .from("profiles")
          .select("id, mssv, role, maintenance_access")
          .eq("mssv", studentMssv)
          .maybeSingle();

      if (targetError) {
        throw targetError;
      }

      if (!target || target.role !== "student") {
        return NextResponse.json(
          { error: "Không tìm thấy tài khoản sinh viên hợp lệ." },
          { status: 404 }
        );
      }

      if (!target.maintenance_access) {
        return NextResponse.json(
          { error: "Sinh viên này không có thẻ vàng." },
          { status: 400 }
        );
      }

      const { error: updateError } =
        await supabaseAdmin
          .from("profiles")
          .update({ maintenance_access: false })
          .eq("id", target.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: `Đã thu hồi thẻ vàng của sinh viên ${studentMssv}.`,
      });
    }

    // ==========================================
    // 4.3. BẢO TRÌ
    // ==========================================    
    
      if (action === "set_maintenance") {
        if (typeof maintenanceMode !== "boolean") {
          return NextResponse.json(
            { error: "Trạng thái bảo trì không hợp lệ." },
            { status: 400 }
          );
        }

        const { error } = await supabaseAdmin
          .from("app_settings")
          .upsert({
            id: 1,
            maintenance_mode: maintenanceMode,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error("SET MAINTENANCE ERROR:", error);

          return NextResponse.json(
            { error: "Không thể cập nhật trạng thái bảo trì." },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          maintenanceMode,
          message: maintenanceMode
            ? "Đã kích hoạt chế độ bảo trì."
            : "Đã gỡ chế độ bảo trì.",
        });
      }


    // ==========================================
    // 5. TẠO 1 TÀI KHOẢN
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
    // 6. XÓA 1 TÀI KHOẢN
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
      } = await supabaseAdmin
        .from("students")
        .select("id, mssv, birth_date")
        .not("birth_date", "is", null);

      if (studentsError) {
        throw studentsError;
      }

      let created = 0;
      let skipped = 0;
      let failed = 0;

      const total = students?.length ?? 0;

      console.log(
        `[CREATE_ALL] Bắt đầu tạo tài khoản. Tổng số: ${total}`
      );

      for (let i = 0; i < total; i++) {
        const student = students![i];

        console.log(
          `[CREATE_ALL] [${i + 1}/${total}] Đang xử lý: ${student.mssv}`
        );

        try {
          const email =
            `${student.mssv}@sv5t.local`;

          const password =
            formatPassword(student.birth_date);

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

          // ==========================================
          // AUTH ERROR
          // ==========================================

          if (authError) {
            if (
              authError.message
                .toLowerCase()
                .includes("already")
            ) {
              skipped++;

              console.log(
                `[CREATE_ALL] [${i + 1}/${total}] Bỏ qua: ${student.mssv} — tài khoản đã tồn tại.`
              );

              continue;
            }

            failed++;

            console.error(
              `[CREATE_ALL] [${i + 1}/${total}] LỖI AUTH: ${student.mssv}`,
              {
                studentId: student.id,
                mssv: student.mssv,
                email,
                message: authError.message,
                name: authError.name,
                status: authError.status,
                code: authError.code,
              }
            );

            continue;
          }

          // ==========================================
          // PROFILE
          // ==========================================

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

          // ==========================================
          // PROFILE ERROR
          // ==========================================

          if (profileError) {
            console.error(
              `[CREATE_ALL] [${i + 1}/${total}] LỖI PROFILE: ${student.mssv}`,
              {
                studentId: student.id,
                mssv: student.mssv,
                authUserId: authData.user.id,
                email,
                message: profileError.message,
                details: profileError.details,
                hint: profileError.hint,
                code: profileError.code,
              }
            );

            // Rollback Auth user
            await supabaseAdmin.auth.admin.deleteUser(
              authData.user.id
            );

            failed++;
            continue;
          }

          // ==========================================
          // SUCCESS
          // ==========================================

          created++;

          console.log(
            `[CREATE_ALL] [${i + 1}/${total}] Đã tạo: ${student.mssv}`
          );

        } catch (error) {
          failed++;

          console.error(
            `[CREATE_ALL] [${i + 1}/${total}] LỖI KHÔNG XÁC ĐỊNH: ${student.mssv}`,
            error
          );

          continue;
        }
      }

      console.log(
        `[CREATE_ALL] HOÀN TẤT — Tạo: ${created}, bỏ qua: ${skipped}, lỗi: ${failed}.`
      );

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

// ==========================================
// GET: DANH SÁCH SINH VIÊN CÓ THẺ VÀNG
// ==========================================


export async function GET(request: Request) {
  try {
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

    const { data: adminProfile, error: adminError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (adminError) {
      throw adminError;
    }

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền quản trị." },
        { status: 403 }
      );
    }

    // Lấy trạng thái bảo trì
    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("app_settings")
        .select("maintenance_mode")
        .eq("id", 1)
        .maybeSingle();

    if (settingsError) {
      console.error("LOAD MAINTENANCE STATUS ERROR:", settingsError);

      return NextResponse.json(
        { error: "Không thể tải trạng thái bảo trì." },
        { status: 500 }
      );
    }

    const maintenanceMode =
      settings?.maintenance_mode ?? false;

    // Lấy danh sách sinh viên có thẻ vàng
    const { data: profiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select("mssv")
        .eq("role", "student")
        .eq("maintenance_access", true)
        .order("mssv", { ascending: true });

    if (profilesError) {
      throw profilesError;
    }

    const mssvs = (profiles ?? [])
      .map((profile) => profile.mssv)
      .filter(
        (mssv): mssv is string =>
          typeof mssv === "string" && mssv.length > 0
      );

    // Không có sinh viên nào được cấp thẻ vàng
    if (mssvs.length === 0) {
      return NextResponse.json({
        students: [],
        maintenanceMode,
      });
    }

    const { data: studentData, error: studentsError } =
      await supabaseAdmin
        .from("students")
        .select("mssv, full_name")
        .in("mssv", mssvs);

    if (studentsError) {
      throw studentsError;
    }

    const nameByMssv = new Map(
      (studentData ?? []).map((student) => [
        student.mssv,
        student.full_name,
      ])
    );

    const students = mssvs.map((mssv) => ({
      mssv,
      full_name: nameByMssv.get(mssv) ?? "Chưa có họ tên",
    }));

    return NextResponse.json({
      students,
      maintenanceMode,
    });
  } catch (error) {
    console.error("LOAD MAINTENANCE ACCESS ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tải danh sách thẻ vàng." },
      { status: 500 }
    );
  }
}
