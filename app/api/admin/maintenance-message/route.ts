
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAuth = createClient(
  supabaseUrl,
  publishableKey
);

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

const SETTINGS_FIELDS =
  "maintenance_message_enabled, maintenance_start_time, maintenance_start_date, maintenance_end_time, maintenance_end_date";

async function authenticateAdmin(request: Request) {
  const token =
    request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "") ?? "";

  if (!token) {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) throw profileError;

  if (profile?.role !== "admin") {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: "Bạn không có quyền quản trị." },
        { status: 403 }
      ),
    };
  }

  return { success: true as const };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/* ==========================================
   GET: TẢI THÔNG ĐIỆP BẢO TRÌ
   Cho phép trang đăng nhập đọc công khai
========================================== */

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select(SETTINGS_FIELDS)
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      settings: data ?? {
        maintenance_message_enabled: false,
        maintenance_start_time: null,
        maintenance_start_date: null,
        maintenance_end_time: null,
        maintenance_end_date: null,
      },
    });
  } catch (error) {
    console.error("LOAD MAINTENANCE MESSAGE ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tải thông điệp bảo trì." },
      { status: 500 }
    );
  }
}

/* ==========================================
   POST: CẬP NHẬT THÔNG ĐIỆP
   Chỉ admin được phép thực hiện
========================================== */

export async function POST(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();

    // BẬT / TẮT THÔNG ĐIỆP
    if (body.action === "toggle") {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json(
          { error: "Trạng thái thông điệp không hợp lệ." },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("app_settings")
        .upsert({
          id: 1,
          maintenance_message_enabled: body.enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        enabled: body.enabled,
        message: body.enabled
          ? "Đã bật thông điệp bảo trì."
          : "Đã tắt thông điệp bảo trì.",
      });
    }

    // LƯU THỜI GIAN
    if (body.action === "save") {
      const {
        startTime,
        startDate,
        endTime,
        endDate,
      } = body;

      if (
        typeof startTime !== "string" ||
        typeof startDate !== "string" ||
        typeof endTime !== "string" ||
        typeof endDate !== "string" ||
        !isValidTime(startTime) ||
        !isValidTime(endTime) ||
        !isValidDate(startDate) ||
        !isValidDate(endDate)
      ) {
        return NextResponse.json(
          { error: "Vui lòng nhập đầy đủ thời gian hợp lệ." },
          { status: 400 }
        );
      }

      const start = `${startDate}T${startTime}`;
      const end = `${endDate}T${endTime}`;

      if (start >= end) {
        return NextResponse.json(
          {
            error:
              "Thời gian bắt đầu phải sớm hơn thời gian kết thúc.",
          },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("app_settings")
        .upsert({
          id: 1,
          maintenance_start_time: startTime,
          maintenance_start_date: startDate,
          maintenance_end_time: endTime,
          maintenance_end_date: endDate,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật thời gian bảo trì.",
      });
    }

    return NextResponse.json(
      { error: "Thao tác không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    console.error("UPDATE MAINTENANCE MESSAGE ERROR:", error);

    return NextResponse.json(
      { error: "Không thể cập nhật thông điệp bảo trì." },
      { status: 500 }
    );
  }
}
