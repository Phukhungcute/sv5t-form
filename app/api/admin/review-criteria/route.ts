import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type {
  CriterionInputType,
  IntegrationGroup,
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

const validIntegrationGroups: IntegrationGroup[] = [
  "foreign_language",
  "skills",
  "activities",
];

const validInputTypes: CriterionInputType[] = [
  "text",
  "score100",
  "score10",
  "score4",
];

const SECTION_PREFIX: Record<
  Exclude<ReviewSection, "integration">,
  string
> = {
  ethics: "ethics",
  study: "study",
  physical: "physical",
  volunteer: "volunteer",
  priority: "priority",
};

const SECTION_TITLE: Record<
  Exclude<ReviewSection, "integration">,
  string
> = {
  ethics: "Tiêu chí đạo đức",
  study: "Tiêu chí học tập",
  physical: "Tiêu chí thể lực",
  volunteer: "Tiêu chí tình nguyện",
  priority: "Tiêu chuẩn ưu tiên",
};

const INTEGRATION_IDENTITY: Record<
  IntegrationGroup,
  { prefix: string; title: string }
> = {
  foreign_language: {
    prefix: "foreignLanguage",
    title: "Tiêu chí ngoại ngữ",
  },
  skills: {
    prefix: "skill",
    title: "Tiêu chí kỹ năng",
  },
  activities: {
    prefix: "integrationActivity",
    title: "Tiêu chí hoạt động hội nhập",
  },
};

type CriterionIdentity = {
  criterion_key: string;
  label: string;
};

type RequestBody = {
  action?: "create" | "update" | "toggle" | "reorder";
  id?: string;
  academic_year?: string;
  review_level?: ReviewLevel;
  section_key?: ReviewSection;
  integration_group?: IntegrationGroup | null;
  content?: string;
  description?: string;
  input_type?: CriterionInputType;
  sort_order?: number;
  is_active?: boolean;
  items?: Array<{ id: string; sort_order: number }>;
};

type GroupInfo = {
  academic_year: string;
  review_level: ReviewLevel;
  section_key: ReviewSection;
  integration_group: IntegrationGroup | null;
};

function getCriterionIdentity(
  sectionKey: ReviewSection,
  integrationGroup: IntegrationGroup | null,
  sortOrder: number,
): CriterionIdentity {
  const number = sortOrder + 1;

  if (sectionKey === "integration") {
    if (!integrationGroup) {
      throw new Error("Thiếu tiểu mục Hội nhập tốt.");
    }

    const config = INTEGRATION_IDENTITY[integrationGroup];

    return {
      criterion_key: `${config.prefix}${number}`,
      label: `${config.title} ${number}`,
    };
  }

  return {
    criterion_key: `${SECTION_PREFIX[sectionKey]}${number}`,
    label: `${SECTION_TITLE[sectionKey]} ${number}`,
  };
}

function validateGroup(
  sectionKey: ReviewSection,
  integrationGroup: IntegrationGroup | null | undefined,
): string | null {
  if (sectionKey === "integration") {
    if (
      !integrationGroup ||
      !validIntegrationGroups.includes(integrationGroup)
    ) {
      return "Vui lòng chọn tiểu mục Hội nhập tốt.";
    }

    return null;
  }

  if (integrationGroup !== null && integrationGroup !== undefined) {
    return "Nhóm tiêu chí này không có tiểu mục Hội nhập.";
  }

  return null;
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

  const groupError = validateGroup(
    body.section_key,
    body.integration_group,
  );

  if (groupError) {
    return groupError;
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

async function authenticateAdmin(
  request: Request,
): Promise<
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

async function authenticateCriteriaReader(
  request: Request,
): Promise<
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

  if (!profile || !["student", "admin"].includes(profile.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Bạn không có quyền xem tiêu chí." },
        { status: 403 },
      ),
    };
  }

  return { success: true, userId: user.id };
}

async function getLastSortOrder(
  group: GroupInfo,
  excludeId?: string,
): Promise<number> {
  let query = supabaseAdmin
    .from("review_criteria")
    .select("sort_order")
    .eq("academic_year", group.academic_year)
    .eq("review_level", group.review_level)
    .eq("section_key", group.section_key);

  if (group.integration_group === null) {
    query = query.is("integration_group", null);
  } else {
    query = query.eq("integration_group", group.integration_group);
  }

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0]?.sort_order ?? -1;
}

async function getGroupItems(group: GroupInfo) {
  let query = supabaseAdmin
    .from("review_criteria")
    .select("id, sort_order")
    .eq("academic_year", group.academic_year)
    .eq("review_level", group.review_level)
    .eq("section_key", group.section_key);

  if (group.integration_group === null) {
    query = query.is("integration_group", null);
  } else {
    query = query.eq("integration_group", group.integration_group);
  }

  const { data, error } = await query.order("sort_order", {
    ascending: true,
  });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Đánh lại thứ tự và mã tiêu chí trong một nhóm độc lập.
 *
 * Dùng mã tạm trước để tránh xung đột UNIQUE criterion_key.
 */
async function renumberGroup(group: GroupInfo): Promise<void> {
  const items = await getGroupItems(group);

  // Bước 1: Đưa các mã về trạng thái tạm.
  for (const item of items) {
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

  // Bước 2: Đánh lại mã và thứ tự.
  for (const [index, item] of items.entries()) {
    const identity = getCriterionIdentity(
      group.section_key,
      group.integration_group,
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
}

export async function GET(request: Request) {
  try {
    // GET cho phép student và admin.
    const auth = await authenticateCriteriaReader(request);

    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const academicYear = searchParams.get("academic_year");
    const reviewLevel = searchParams.get("review_level");

    if (
      !academicYear ||
      !["faculty", "university"].includes(reviewLevel ?? "")
    ) {
      return NextResponse.json(
        { error: "Năm học hoặc cấp xét duyệt không hợp lệ." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("review_criteria")
      .select("*")
      .eq("academic_year", academicYear)
      .eq("review_level", reviewLevel)
      .order("section_key")
      .order("integration_group")
      .order("sort_order");

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { success: true, data: data ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
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

    const group: GroupInfo = {
      academic_year: body.academic_year!.trim(),
      review_level: body.review_level!,
      section_key: body.section_key!,
      integration_group: body.integration_group ?? null,
    };

    const sortOrder = (await getLastSortOrder(group)) + 1;

    const identity = getCriterionIdentity(
      group.section_key,
      group.integration_group,
      sortOrder,
    );

    const { data, error } = await supabaseAdmin
      .from("review_criteria")
      .insert({
        ...group,
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
          { error: "Mã tiêu chí bị trùng. Vui lòng tải lại danh sách." },
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

    // Sắp xếp tiêu chí.
    if (body.action === "reorder") {
      if (!Array.isArray(body.items) || body.items.length === 0) {
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

      const { data: existingItems, error: fetchError } =
        await supabaseAdmin
          .from("review_criteria")
          .select(
            "id, academic_year, review_level, section_key, integration_group",
          )
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

      const firstItem = existingItems[0];

      const sameGroup = existingItems.every(
        (item) =>
          item.academic_year === firstItem.academic_year &&
          item.review_level === firstItem.review_level &&
          item.section_key === firstItem.section_key &&
          item.integration_group === firstItem.integration_group,
      );

      if (!sameGroup) {
        return NextResponse.json(
          {
            error:
              "Không thể sắp xếp tiêu chí thuộc các nhóm hoặc tiểu mục khác nhau.",
          },
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

      // Kiểm tra danh sách gửi lên phải bao gồm toàn bộ nhóm.
      const group: GroupInfo = {
        academic_year: firstItem.academic_year,
        review_level: firstItem.review_level,
        section_key: firstItem.section_key,
        integration_group: firstItem.integration_group,
      };

      const allGroupItems = await getGroupItems(group);

      if (
        allGroupItems.length !== orderedItems.length ||
        !allGroupItems.every((item) =>
          ids.includes(item.id),
        )
      ) {
        return NextResponse.json(
          { error: "Danh sách sắp xếp chưa đầy đủ." },
          { status: 400 },
        );
      }

      // Đổi mã tạm để tránh xung đột UNIQUE criterion_key.
      for (const item of orderedItems) {
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

      for (const item of orderedItems) {
        const identity = getCriterionIdentity(
          group.section_key,
          group.integration_group,
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

    // Bật / tắt tiêu chí.
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

    // Chỉnh sửa tiêu chí.
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
        .select(
          "id, academic_year, review_level, section_key, integration_group",
        )
        .eq("id", body.id)
        .single();

    if (currentError) {
      throw currentError;
    }

    const oldGroup: GroupInfo = {
      academic_year: currentItem.academic_year,
      review_level: currentItem.review_level,
      section_key: currentItem.section_key,
      integration_group: currentItem.integration_group,
    };

    const newGroup: GroupInfo = {
      academic_year: currentItem.academic_year,
      review_level: currentItem.review_level,
      section_key: body.section_key!,
      integration_group: body.integration_group ?? null,
    };

    const groupChanged =
      oldGroup.section_key !== newGroup.section_key ||
      oldGroup.integration_group !== newGroup.integration_group;

    let sortOrder: number;

    if (groupChanged) {
      sortOrder = (await getLastSortOrder(newGroup)) + 1;
    } else {
      const { data: currentOrder, error: orderError } =
        await supabaseAdmin
          .from("review_criteria")
          .select("sort_order")
          .eq("id", body.id)
          .single();

      if (orderError) {
        throw orderError;
      }

      sortOrder = currentOrder.sort_order;
    }

    const identity = getCriterionIdentity(
      newGroup.section_key,
      newGroup.integration_group,
      sortOrder,
    );

    const { data, error } = await supabaseAdmin
      .from("review_criteria")
      .update({
        section_key: newGroup.section_key,
        integration_group: newGroup.integration_group,
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

    // Nếu chuyển nhóm, đánh lại thứ tự ở nhóm cũ.
    if (groupChanged) {
      await renumberGroup(oldGroup);
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
        .select(
          "id, academic_year, review_level, section_key, integration_group",
        )
        .eq("id", body.id)
        .single();

    if (fetchError) {
      throw fetchError;
    }

    const group: GroupInfo = {
      academic_year: deletedItem.academic_year,
      review_level: deletedItem.review_level,
      section_key: deletedItem.section_key,
      integration_group: deletedItem.integration_group,
    };

    const { error: deleteError } = await supabaseAdmin
      .from("review_criteria")
      .delete()
      .eq("id", body.id);

    if (deleteError) {
      throw deleteError;
    }

    await renumberGroup(group);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REVIEW_CRITERIA_DELETE]", error);

    return NextResponse.json(
      { error: "Không thể xóa tiêu chí." },
      { status: 500 },
    );
  }
}