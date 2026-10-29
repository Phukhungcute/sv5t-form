import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // FAQ được phép truy cập mà không cần đăng nhập
  if (request.nextUrl.pathname === "/dashboard/qa") {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Kiểm tra phiên đăng nhập từ Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "login_required");

    const redirectResponse = NextResponse.redirect(url);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  // Lấy quyền của tài khoản hiện tại
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, maintenance_access")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "profile_error");

    const redirectResponse = NextResponse.redirect(url);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  // Quản trị viên luôn được phép truy cập
  if (profile.role !== "admin") {
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("maintenance_mode")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError || !settings) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("reason", "maintenance_check_error");

      const redirectResponse = NextResponse.redirect(url);

      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }

    // Chỉ chặn sinh viên không có quyền truy cập khi đang bảo trì
    if (
      settings.maintenance_mode &&
      !profile.maintenance_access
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";

      const redirectResponse = NextResponse.redirect(url);

      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};