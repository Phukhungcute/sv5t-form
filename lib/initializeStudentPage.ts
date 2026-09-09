import { supabase } from "@/lib/supabase";

type StudentPageType =
  | "submission"
  | "addition"
  | "result";

// Chặn nhiều lần redirect xảy ra đồng thời
let redirecting = false;

export async function initializeStudentPage(
  router: ReturnType<
    typeof import("next/navigation").useRouter
  >,
  pageType: StudentPageType = "submission"
) {
  try {
    // =================================================
    // 1. CHECK USER
    // =================================================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/");
      return false;
    }

    // =================================================
    // 2. CHECK PROFILE
    // =================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("mssv, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "PROFILE ERROR:",
        profileError
      );

      router.replace("/");
      return false;
    }

    if (profile.role !== "student") {
      router.replace("/admin");
      return false;
    }

    // =================================================
    // 3. CHECK SERVER TIME
    // =================================================

    const {
      data: serverTime,
      error: timeError,
    } = await supabase.rpc(
      "get_server_time"
    );

    if (timeError || !serverTime) {
      console.error(
        "SERVER TIME ERROR:",
        timeError
      );

      return false;
    }

    const now = new Date(serverTime);

    console.log(
      "GIỜ SERVER:",
      now.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      })
    );

    // =================================================
    // 4. LOAD SCHEDULE
    // =================================================

    const {
      data: settings,
      error: scheduleError,
    } = await supabase
      .from("schedule_settings")
      .select(
        `
        start_date,
        submission_days,
        review1_days,
        addition_days,
        review2_days,
        result_days,
        submission_enabled,
        addition_enabled,
        result_enabled
        `
      )
      .eq("id", 1)
      .single();

    if (scheduleError || !settings) {
      console.error(
        "SCHEDULE ERROR:",
        scheduleError
      );

      return false;
    }

    // =================================================
    // 5. TÍNH CÁC MỐC THỜI GIAN
    // =================================================

    const submissionStart =
      new Date(settings.start_date);

    const submissionEnd =
      new Date(submissionStart);

    submissionEnd.setDate(
      submissionEnd.getDate() +
        settings.submission_days
    );

    const review1Start =
      new Date(submissionEnd);

    const review1End =
      new Date(review1Start);

    review1End.setDate(
      review1End.getDate() +
        settings.review1_days
    );

    const additionStart =
      new Date(review1End);

    const additionEnd =
      new Date(additionStart);

    additionEnd.setDate(
      additionEnd.getDate() +
        settings.addition_days
    );

    const review2Start =
      new Date(additionEnd);

    const review2End =
      new Date(review2Start);

    review2End.setDate(
      review2End.getDate() +
        settings.review2_days
    );

    const resultStart =
      new Date(review2End);

    const resultEnd =
      new Date(resultStart);

    resultEnd.setDate(
      resultEnd.getDate() +
        settings.result_days
    );

    // =================================================
    // 6. CHỌN KHOẢNG THỜI GIAN
    // =================================================

    let start: Date;
    let end: Date;
    let enabled: boolean;

    switch (pageType) {
      case "submission":
        start = submissionStart;
        end = submissionEnd;
        enabled =
          settings.submission_enabled;
        break;

      case "addition":
        start = additionStart;
        end = additionEnd;
        enabled =
          settings.addition_enabled;
        break;

      case "result":
        start = resultStart;
        end = resultEnd;
        enabled =
          settings.result_enabled;
        break;
    }

    // =================================================
    // 7. CHECK THỜI GIAN
    // =================================================

    const isOpen =
      enabled &&
      now >= start &&
      now < end;

    console.log(
      "========== STUDENT PAGE TIME CHECK =========="
    );

    console.log("PAGE:", pageType);
    console.log(
      "SERVER:",
      now.toISOString()
    );
    console.log(
      "START:",
      start.toISOString()
    );
    console.log(
      "END:",
      end.toISOString()
    );
    console.log(
      "ENABLED:",
      enabled
    );
    console.log(
      "IS OPEN:",
      isOpen
    );

    console.log(
      "============================================="
    );

    // =================================================
    // 8. NGOÀI THỜI GIAN
    // =================================================

    if (!isOpen) {

      // Nếu một lần initialize khác
      // đã bắt đầu redirect thì bỏ qua.
      if (redirecting) {
        console.log(
          "REDIRECT ALREADY IN PROGRESS"
        );

        return false;
      }

      redirecting = true;

      let alertMessage = "";

switch (pageType) {
  case "submission":
    alertMessage =
      "Đang ngoài thời gian nộp hồ sơ/minh chứng.";
    break;

  case "addition":
    alertMessage =
      "Đang ngoài thời gian xem yêu cầu/chỉnh sửa hồ sơ";
    break;

  case "result":
    alertMessage =
      "Đang ngoài thời gian xem kết quả.";
    break;
}

alert(alertMessage);

      router.replace("/dashboard");

      // Reset sau một khoảng ngắn để:
      // - chặn Strict Mode gọi lần 2
      // - nhưng không khóa vĩnh viễn module
      setTimeout(() => {
        redirecting = false;
      }, 1000);

      return false;
    }

    // =================================================
    // 9. SUCCESS
    // =================================================

    console.log(
      "INITIALIZE STUDENT PAGE: SUCCESS"
    );

    return true;

  } catch (error) {
    console.error(
      "INITIALIZE ERROR:",
      error
    );

    return false;
  }
}