import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AwardPhoto = {
  mssv: string;
  file_path: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabasePublishableKey || !serviceRoleKey) {
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

export async function GET(request: Request) {
  try {
    // 1. Xác thực người dùng bằng access token
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice("Bearer ".length);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    // 2. Kiểm tra quyền admin
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập." },
        { status: 403 }
      );
    }

    // 3. Lấy danh sách ảnh tuyên dương
    const { data: photos, error: photosError } = await supabaseAdmin
    .from("student_award_photos")
    .select("mssv, file_path");

    if (photosError) {
    console.error("AWARD PHOTOS QUERY ERROR:", photosError);

    return NextResponse.json(
        { error: "Không thể tải danh sách ảnh tuyên dương." },
        { status: 500 }
    );
    }

    // Tạo signed URL cho từng ảnh bằng quyền admin
    const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
        const { data: signedData, error: signedError } =
        await supabaseAdmin.storage
            .from("student-awards")
            .createSignedUrl(photo.file_path, 60 * 60);

        if (signedError) {
        console.error(
            `Không tạo được signed URL cho MSSV ${photo.mssv}:`,
            signedError
        );

        return {
            ...photo,
            signedUrl: null,
        };
        }

        return {
        ...photo,
        signedUrl: signedData.signedUrl,
        };
    })
    );

    return NextResponse.json({
    photos: photosWithUrls,
    });

    // 4. Trả đường dẫn lưu trữ, không trả service-role key
    return NextResponse.json({
      photos: (photos ?? []) as AwardPhoto[],
    });
  } catch (error) {
    console.error("AWARD PHOTOS API ERROR:", error);

    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải ảnh tuyên dương." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Xác thực phiên đăng nhập
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice("Bearer ".length);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    // 2. Kiểm tra quyền admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập." },
        { status: 403 }
      );
    }

    // 3. Nhận đường dẫn ảnh
    const body = await request.json();
    const filePath = body.filePath;

    if (
      typeof filePath !== "string" ||
      !filePath.trim() ||
      filePath.startsWith("/") ||
      filePath.includes("..")
    ) {
      return NextResponse.json(
        { error: "Đường dẫn ảnh không hợp lệ." },
        { status: 400 }
      );
    }

    // 4. Chỉ cho phép tạo URL cho ảnh đã đăng ký trong database
    const { data: photo, error: photoError } = await supabaseAdmin
      .from("student_award_photos")
      .select("mssv, file_path")
      .eq("file_path", filePath)
      .maybeSingle();

    if (photoError) {
      console.error("PHOTO QUERY ERROR:", photoError);

      return NextResponse.json(
        { error: "Không thể kiểm tra thông tin ảnh." },
        { status: 500 }
      );
    }

    if (!photo) {
      return NextResponse.json(
        { error: "Ảnh không tồn tại trong danh sách tuyên dương." },
        { status: 404 }
      );
    }

    // 5. Tạo signed URL bằng quyền admin
    const { data: signedData, error: signedError } =
      await supabaseAdmin.storage
        .from("student-awards")
        .createSignedUrl(photo.file_path, 60 * 60);

    if (signedError || !signedData?.signedUrl) {
      console.error("SIGNED URL ERROR:", signedError);

      return NextResponse.json(
        { error: "Không thể tạo đường dẫn xem ảnh." },
        { status: 500 }
      );
    }

    // 6. Trả URL cho trình duyệt
    return NextResponse.json({
      signedUrl: signedData.signedUrl,
    });
  } catch (error) {
    console.error("CREATE AWARD PHOTO URL ERROR:", error);

    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo đường dẫn xem ảnh." },
      { status: 500 }
    );
  }
}