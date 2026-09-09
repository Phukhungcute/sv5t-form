import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    console.log(
      "========== CHANGE PASSWORD API =========="
    );

    // ==========================================
    // 1. KIỂM TRA ENVIRONMENT
    // ==========================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(
      "SUPABASE URL EXISTS:",
      !!supabaseUrl
    );

    console.log(
      "PUBLISHABLE KEY EXISTS:",
      !!supabaseKey
    );

    console.log(
      "SERVICE ROLE KEY EXISTS:",
      !!serviceRoleKey
    );

    if (
      !supabaseUrl ||
      !supabaseKey ||
      !serviceRoleKey
    ) {
      console.error(
        "CHANGE PASSWORD ENV ERROR"
      );

      return NextResponse.json(
        {
          error:
            "Server chưa được cấu hình đầy đủ biến môi trường Supabase.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 2. LẤY ACCESS TOKEN
    // ==========================================

    const authHeader =
      request.headers.get("authorization");

    console.log(
      "AUTHORIZATION EXISTS:",
      !!authHeader
    );

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy phiên đăng nhập.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authHeader.substring(7);

    // ==========================================
    // 3. XÁC THỰC ACCESS TOKEN
    // ==========================================

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseKey
    );

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAuth.auth.getUser(
        accessToken
      );

    console.log(
      "AUTH USER:",
      user
        ? {
            id: user.id,
            email: user.email,
          }
        : null
    );

    console.log(
      "AUTH USER ERROR:",
      userError
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // 4. ĐỌC BODY
    // ==========================================

    const body = await request.json();

    console.log(
      "CHANGE PASSWORD BODY:",
      {
        hasNewPassword:
          typeof body?.newPassword === "string",
        passwordLength:
          typeof body?.newPassword === "string"
            ? body.newPassword.length
            : 0,
      }
    );

    const newPassword =
      body?.newPassword;

    if (
      typeof newPassword !== "string" ||
      newPassword.trim() === ""
    ) {
      return NextResponse.json(
        {
          error:
            "Mật khẩu không được để trống.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. ADMIN CLIENT
    // ==========================================

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // ==========================================
    // 6. ĐỔI PASSWORD
    // ==========================================

    console.log(
      "ĐANG ĐỔI PASSWORD CHO USER:",
      user.id
    );

    const {
      data: updateData,
      error: updateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          password: newPassword,
        }
      );

    console.log(
      "UPDATE PASSWORD DATA:",
      updateData
        ? {
            id: updateData.user?.id,
          }
        : null
    );

    console.log(
      "UPDATE PASSWORD ERROR:",
      updateError
    );

    if (updateError) {
      return NextResponse.json(
        {
          error:
            updateError.message ||
            "Không thể đổi mật khẩu.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 7. TẮT MUST CHANGE PASSWORD
    // ==========================================

    console.log(
      "ĐANG UPDATE PROFILES..."
    );

    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: false,
      })
      .eq("id", user.id);

    console.log(
      "UPDATE PROFILE ERROR:",
      profileError
    );

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "Đổi mật khẩu thành công nhưng không thể cập nhật trạng thái tài khoản.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 8. SUCCESS
    // ==========================================

    console.log(
      "CHANGE PASSWORD SUCCESS:",
      user.email
    );

    console.log(
      "=========================================="
    );

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error(
      "CHANGE PASSWORD UNEXPECTED ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi máy chủ.",
      },
      { status: 500 }
    );
  }
}