import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type {
  CriterionInputType,
  ReviewLevel,
  ReviewSection,
} from "@/lib/review-criteria";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error("Thiếu biến môi trường Supabase.");
}

const supabaseAuth = createClient(supabaseUrl, publishableKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const validLevels: ReviewLevel[] = ["faculty", "university"];

const validSections: ReviewSection[] = [
  "ethics",
  "study",
  "physical",
  "volunteer",
  "integration",
  "priority",
];

const validInputTypes: CriterionInputType[] = [
  "text",
  "score10",
  "score4",
];

const SECTION_PREFIX: Record<ReviewSection, string> = {
  ethics: "ethics",
  study: "study",
  physical: "physical",
  volunteer: "volunteer",
  integration: "integration",
  priority: "priority",
};

const SECTION_TITLE: Record<ReviewSection, string> = {
  ethics: "Tiêu chí đạo đức",
  study: "Tiêu chí học tập",
  physical: "Tiêu chí thể lực",
  volunteer: "Tiêu chí tình nguyện",
  integration: "Tiêu chí hội nhập",
  priority: "Tiêu chuẩn ưu tiên",
};

function getCriterionIdentity(
  sectionKey: ReviewSection,
  sortOrder: number,
): { criterion_key: string; label: string } {
  const number = sortOrder + 1;

  return {
    criterion_key: `${SECTION_PREFIX[sectionKey]}${number}`,
    label: `${SECTION_TITLE[sectionKey]} ${number}`,
  };
}

type RequestBody = {
  action?: "create" | "update" | "toggle" | "reorder";
  id?: string;
  academic_year?: string;
  review_level?: ReviewLevel;
  criterion_key?: string;
  section_key?: ReviewSection;
  label?: string;
  content?: string;
  description?: string;
  input_type?: CriterionInputType;
  sort_order?: number;
  is_active?: boolean;
  items?: Array<{ id: string; sort_order: number }>;
};

async function authenticateAdmin(request: Request): Promise<
  | { success: true; userId: string }
  | { success: false; response: NextResponse }
> {
  const token =
    request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "") ?? "";

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 },
      ),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.role !== "admin") {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Bạn không có quyền quản trị." },
        { status: 403 },
      ),
    };
  }

  return { success: true, userId: user.id };
}

function validateCriterion(body: RequestBody): string | null {
  if (!body.academic_year?.trim()) {
    return "Thiếu năm học.";
  }

  if (!body.review_level || !validLevels.includes(body.review_level)) {
    return "Cấp xét duyệt không hợp lệ.";
  }

  if (!body.section_key || !validSections.includes(body.section_key)) {
    return "Nhóm tiêu chí không hợp lệ.";
  }

  if (!body.content?.trim()) {
    return "Vui lòng nhập nội dung tiêu chí.";
  }

  if (
    body.input_type &&
    !validInputTypes.includes(body.input_type)
  ) {
    return "Kiểu dữ liệu không hợp lệ.";
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const academicYear = searchParams.get("academic_year");
    const reviewLevel = searchParams.get("review_level");

    if (!academicYear || !reviewLevel) {
      return NextResponse.json(
        { error: "Thiếu năm học hoặc cấp xét duyệt." },
        { status: 400 },
      );
    }

    if (!validLevels.includes(reviewLevel as ReviewLevel)) {
      return NextResponse.json(
        { error: "Cấp xét duyệt không hợp lệ." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("review_criteria")
      .select("*")
      .eq("academic_year", academicYear)
      .eq("review_level", reviewLevel)
      .order("section_key")
      .order("sort_order");

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[REVIEW_CRITERIA_GET]", error);

    return NextResponse.json(
      { error: "Không thể tải danh sách tiêu chí." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (!auth.success) {
      return auth.response;
    }

    const body = (await request.json()) as RequestBody;

    if (body.action !== "create") {
      return NextResponse.json(
        { error: "Thao tác không hợp lệ." },
        { status: 400 },
      );
    }

    const validationError = validateCriterion(body);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }

    const { data: existingItems, error: listError } =
  await supabaseAdmin
    .from("review_criteria")
    .select("sort_order")
    .eq("academic_year", body.academic_year!.trim())
    .eq("review_level", body.review_level!)
    .eq("section_key", body.section_key!)
    .order("sort_order", { ascending: false })
    .limit(1);

if (listError) {
  throw listError;
}

    const sortOrder = (existingItems?.[0]?.sort_order ?? -1) + 1;

    const identity = getCriterionIdentity(
    body.section_key!,
    sortOrder,
    );

    const { data, error } = await supabaseAdmin
    .from("review_criteria")
    .insert({
        academic_year: body.academic_year!.trim(),
        review_level: body.review_level!,
        section_key: body.section_key!,
        criterion_key: identity.criterion_key,
        label: identity.label,
        content: body.content!.trim(),
        description: body.description?.trim() ?? "",
        input_type: body.input_type ?? "text",
        sort_order: sortOrder,
        is_active: true,
    })
    .select()
    .single();

    if (error) {
    if (error.code === "23505") {
        return NextResponse.json(
        {
            error: "Mã tiêu chí bị trùng. Vui lòng tải lại danh sách và thử lại.",
        },
        { status: 409 },
        );
    }

    throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[REVIEW_CRITERIA_POST]", error);

    return NextResponse.json(
      { error: "Không thể thêm tiêu chí." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (!auth.success) {
      return auth.response;
    }

    const body = (await request.json()) as RequestBody;

    // Cập nhật thứ tự nhiều tiêu chí
        if (body.action === "reorder") {
    if (
        !Array.isArray(body.items) ||
        body.items.length === 0
    ) {
        return NextResponse.json(
        { error: "Danh sách sắp xếp không hợp lệ." },
        { status: 400 },
        );
    }

    const ids = body.items.map((item) => item.id);

    if (
        new Set(ids).size !== ids.length ||
        body.items.some(
        (item) =>
            typeof item.id !== "string" ||
            !Number.isInteger(item.sort_order) ||
            item.sort_order < 0,
        )
    ) {
        return NextResponse.json(
        { error: "Dữ liệu sắp xếp không hợp lệ." },
        { status: 400 },
        );
    }

    // Lấy thông tin nhóm và năm học của các tiêu chí.
    const { data: existingItems, error: fetchError } =
        await supabaseAdmin
        .from("review_criteria")
        .select("id, academic_year, review_level, section_key")
        .in("id", ids);

    if (fetchError) {
        throw fetchError;
    }

    if (!existingItems || existingItems.length !== ids.length) {
        return NextResponse.json(
        { error: "Một số tiêu chí không còn tồn tại." },
        { status: 404 },
        );
    }

    // Không cho phép sắp xếp lẫn tiêu chí thuộc các section khác nhau.
    const firstItem = existingItems[0];

    const sameGroup = existingItems.every(
        (item) =>
        item.academic_year === firstItem.academic_year &&
        item.review_level === firstItem.review_level &&
        item.section_key === firstItem.section_key,
    );

    if (!sameGroup) {
        return NextResponse.json(
        { error: "Không thể sắp xếp tiêu chí thuộc các nhóm khác nhau." },
        { status: 400 },
        );
    }

    const orderedItems = [...body.items].sort(
        (a, b) => a.sort_order - b.sort_order,
    );

    if (
        orderedItems.some(
        (item, index) => item.sort_order !== index,
        )
    ) {
        return NextResponse.json(
        { error: "Thứ tự tiêu chí không liên tục." },
        { status: 400 },
        );
    }

    // Bước 1: Đổi mã tạm để tránh xung đột UNIQUE khi hoán đổi.
    for (let index = 0; index < orderedItems.length; index++) {
        const item = orderedItems[index];

        const { error } = await supabaseAdmin
        .from("review_criteria")
        .update({
            criterion_key: `__temporary_${item.id}`,
        })
        .eq("id", item.id);

        if (error) {
        throw error;
        }
    }

    // Bước 2: Gán mã và tên hiển thị mới.
    for (const item of orderedItems) {
        const identity = getCriterionIdentity(
        firstItem.section_key as ReviewSection,
        item.sort_order,
        );

        const { error } = await supabaseAdmin
        .from("review_criteria")
        .update({
            sort_order: item.sort_order,
            criterion_key: identity.criterion_key,
            label: identity.label,
            updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

        if (error) {
        throw error;
        }
    }

    return NextResponse.json({ success: true });
    }

    if (!body.id) {
      return NextResponse.json(
        { error: "Thiếu ID tiêu chí." },
        { status: 400 },
      );
    }

    if (body.action === "toggle") {
      if (typeof body.is_active !== "boolean") {
        return NextResponse.json(
          { error: "Trạng thái không hợp lệ." },
          { status: 400 },
        );
      }

      const { error } = await supabaseAdmin
        .from("review_criteria")
        .update({
          is_active: body.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id);

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true });
    }

    if (body.action !== "update") {
      return NextResponse.json(
        { error: "Thao tác không hợp lệ." },
        { status: 400 },
      );
    }

    const validationError = validateCriterion(body);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }

    const { data: currentItem, error: currentError } =
        await supabaseAdmin
            .from("review_criteria")
            .select("academic_year, review_level, section_key, sort_order")
            .eq("id", body.id)
            .single();

        if (currentError) {
        throw currentError;
        }

        const targetSection = body.section_key!;

        let sortOrder = currentItem.sort_order;

        if (targetSection !== currentItem.section_key) {
        const { data: targetItems, error: targetError } =
            await supabaseAdmin
            .from("review_criteria")
            .select("sort_order")
            .eq("academic_year", currentItem.academic_year)
            .eq("review_level", currentItem.review_level)
            .eq("section_key", targetSection)
            .neq("id", body.id)
            .order("sort_order", { ascending: false })
            .limit(1);

        if (targetError) {
            throw targetError;
        }

        sortOrder = (targetItems?.[0]?.sort_order ?? -1) + 1;
        }

        const identity = getCriterionIdentity(targetSection, sortOrder);

        const { data, error } = await supabaseAdmin
        .from("review_criteria")
        .update({
            section_key: targetSection,
            criterion_key: identity.criterion_key,
            label: identity.label,
            content: body.content!.trim(),
            description: body.description?.trim() ?? "",
            input_type: body.input_type ?? "text",
            sort_order: sortOrder,
            updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .select()
        .single();

        if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
            { error: "Mã tiêu chí bị trùng trong nhóm mới." },
            { status: 409 },
            );
        }

        throw error;
        }

        return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[REVIEW_CRITERIA_PATCH]", error);

    return NextResponse.json(
      { error: "Không thể cập nhật tiêu chí." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticateAdmin(request);

    if (!auth.success) {
      return auth.response;
    }

    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json(
        { error: "Thiếu ID tiêu chí." },
        { status: 400 },
      );
    }

    const { data: deletedItem, error: fetchError } =
    await supabaseAdmin
        .from("review_criteria")
        .select("academic_year, review_level, section_key")
        .eq("id", body.id)
        .single();

    if (fetchError) {
    throw fetchError;
    }

    const { error: deleteError } = await supabaseAdmin
    .from("review_criteria")
    .delete()
    .eq("id", body.id);

    if (deleteError) {
    throw deleteError;
    }

    // Lấy các tiêu chí còn lại trong section.
    const { data: remainingItems, error: listError } =
    await supabaseAdmin
        .from("review_criteria")
        .select("id")
        .eq("academic_year", deletedItem.academic_year)
        .eq("review_level", deletedItem.review_level)
        .eq("section_key", deletedItem.section_key)
        .order("sort_order", { ascending: true });

    if (listError) {
    throw listError;
    }

    // Đánh mã tạm trước để tránh xung đột UNIQUE.
    for (const item of remainingItems ?? []) {
    const { error } = await supabaseAdmin
        .from("review_criteria")
        .update({
        criterion_key: `__temporary_${item.id}`,
        })
        .eq("id", item.id);

    if (error) {
        throw error;
    }
    }

    // Đánh lại mã và thứ tự chính thức.
    for (const [index, item] of (remainingItems ?? []).entries()) {
    const identity = getCriterionIdentity(
        deletedItem.section_key as ReviewSection,
        index,
    );

    const { error } = await supabaseAdmin
        .from("review_criteria")
        .update({
        sort_order: index,
        criterion_key: identity.criterion_key,
        label: identity.label,
        updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

    if (error) {
        throw error;
    }
    }

    return NextResponse.json({ success: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REVIEW_CRITERIA_DELETE]", error);

    return NextResponse.json(
      { error: "Không thể xóa tiêu chí." },
      { status: 500 },
    );
  }
}