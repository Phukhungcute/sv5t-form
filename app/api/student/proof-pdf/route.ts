
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

export async function GET(request: Request) {
  try {
    // 1. XÁC THỰC TÀI KHOẢN

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

    // 2. LẤY MSSV TỪ PROFILE
    // Không nhận MSSV từ request của người dùng.

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("mssv, role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (
      !profile ||
      profile.role !== "student" ||
      !profile.mssv
    ) {
      return NextResponse.json(
        { error: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    // 3. XÁC ĐỊNH LOẠI PDF

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type !== "original" && type !== "edited") {
      return NextResponse.json(
        { error: "Loại minh chứng không hợp lệ." },
        { status: 400 }
      );
    }

    const table =
      type === "original" ? "proofs" : "edit_proofs";

    // 4. LẤY PDF MỚI NHẤT CỦA CHÍNH SINH VIÊN

    const { data: proof, error: proofError } =
      await supabaseAdmin
        .from(table)
        .select("id, version, file_path, created_at")
        .eq("mssv", profile.mssv)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (proofError) throw proofError;

    // Không có bản ghi hoặc không có file_path

    if (!proof?.file_path) {
      return NextResponse.json(
        { pdf: null },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 5. CHUẨN HÓA FILE PATH

    let path = proof.file_path.trim();

    if (path.startsWith("/")) {
      path = path.slice(1);
    }

    if (path.startsWith("proofs/")) {
      path = path.slice("proofs/".length);
    }

    // 6. TẠO SIGNED URL

    const { data: signedData, error: signedError } =
      await supabaseAdmin.storage
        .from("proofs")
        .createSignedUrl(path, 60 * 60);

    // Nếu file không tồn tại thì xem như chưa có PDF

    if (signedError) {
      const isObjectNotFound =
        signedError.statusCode === "404" ||
        /object not found|not found/i.test(
          signedError.message
        );

      if (isObjectNotFound) {
        return NextResponse.json(
          { pdf: null },
          {
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );
      }

      throw signedError;
    }

    if (!signedData?.signedUrl) {
      return NextResponse.json(
        { pdf: null },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 7. TRẢ VỀ PDF

    return NextResponse.json(
      {
        pdf: {
          url: signedData.signedUrl,
          version: proof.version,
          created_at: proof.created_at,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {
    console.error("STUDENT PROOF PDF ERROR:", error);

    return NextResponse.json(
      { error: "Không thể tải PDF minh chứng." },
      { status: 500 }
    );
  }
}
