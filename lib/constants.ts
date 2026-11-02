export const FACULTY_NAME =
  "GIÁO DỤC TIỂU HỌC";
export const FACULTY_NAME_NORMAL =
  "Giáo dục Tiểu học";
export const MAJOR =
  "Giáo dục Tiểu học";
export const ACADEMIC_YEAR = `${new Date().getFullYear() - 1} - ${new Date().getFullYear()}`;
/* Chưa cần dùng fornow
export const HEAD_OF_UNION =
  "Trần Thanh Tâm"; */

  // Các tiêu chuẩn bắt buộc, cố định
export const STANDARD = {
  CONDUCTSCORE: {
    CONTENT: `1. Điểm rèn luyện năm học ${ACADEMIC_YEAR}`,
    DESC: "(Không ghi xếp loại)",
  },

  UNIONEVALUATION: {
    CONTENT: `2. Phân tích chất lượng Đoàn viên năm học ${ACADEMIC_YEAR}`,
    DESC: "(đối với Hội viên là Đoàn viên)",
  },

  GPA: {
    CONTENT: `1. Điểm trung bình học tập năm học ${ACADEMIC_YEAR}`,
    DESC: "(Không ghi xếp loại)",
  },

} as const;

  /*
  Đây là thư mục chứa các hằng số hiếm khi đổi. 
  Để sử dụng trong 1 page cụ thể, ta cần import ở đầu page hằng số tương ứng để sử dụng:
  import { FACULTY_NAME } from "@/lib/constants";
  Sau đó, mỗi lần dùng chỉ cần gọi nó, VD:
  Với code JSX: {ACADEMIC_YEAR}
  Với code trong Template Literal (Phần tử nhận giá trị chuỗi): `Khoa: ${FACULTY_NAME}`
  */

/* =====================================================
   SCHEDULE TYPES
===================================================== */

export type ScheduleSettings = {
  start_date: string;

  submission_days: number;
  review1_days: number;
  addition_days: number;
  review2_days: number;
  result_days: number;

  submission_enabled: boolean;
  addition_enabled: boolean;
  result_enabled: boolean;

  test_schedule_enabled: boolean;
};

// CHỨC NĂNG TEST PAGE

/**
 * CHẾ ĐỘ KIỂM THỬ LỊCH TRÌNH
 *
 * true: Cho phép kiểm thử ngoài thời gian quy định.
 * false: Sử dụng lịch trình bình thường.
 *
 * Chỉ bật trong môi trường local.
 */
export function TEST_SCHEDULE_MODE(
  settings: ScheduleSettings
): boolean {
  return settings.test_schedule_enabled;
}

// Hàm tự tính start - end

export type SchedulePeriodType =
  | "submission"
  | "review1"
  | "addition"
  | "review2"
  | "result";

export type SchedulePeriod = {
  start: Date;
  end: Date;
  enabled: boolean;
};

export function getSchedulePeriod(
  settings: ScheduleSettings,
  period: SchedulePeriodType,
  referenceDate: Date = new Date()
): SchedulePeriod {
  let startOffset = 0;
  let endOffset = 0;

  let enabled = true;

  switch (period) {
    case "submission":
      startOffset = 0;
      endOffset = settings.submission_days;
      enabled = settings.submission_enabled;
      break;

    case "review1":
      startOffset = settings.submission_days;
      endOffset =
        settings.submission_days +
        settings.review1_days;
      break;

    case "addition":
      startOffset =
        settings.submission_days +
        settings.review1_days;

      endOffset =
        settings.submission_days +
        settings.review1_days +
        settings.addition_days;

      enabled = settings.addition_enabled;
      break;

    case "review2":
      startOffset =
        settings.submission_days +
        settings.review1_days +
        settings.addition_days;

      endOffset =
        settings.submission_days +
        settings.review1_days +
        settings.addition_days +
        settings.review2_days;
      break;

    case "result":
      startOffset =
        settings.submission_days +
        settings.review1_days +
        settings.addition_days +
        settings.review2_days;

      endOffset =
        settings.submission_days +
        settings.review1_days +
        settings.addition_days +
        settings.review2_days +
        settings.result_days;

      enabled = settings.result_enabled;
      break;
  }

  if (TEST_SCHEDULE_MODE(settings)) {
    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
      start,
      end,
      enabled: true,
    };
  }

  const start = getDateAfter(
    settings.start_date,
    startOffset
  );

  const end = getDateAfter(
    settings.start_date,
    endOffset
  );

  return {
    start,
    end,
    enabled,
  };
}

/* =====================================================
   DATE FUNCTIONS
===================================================== */

export function formatDateVN(
  date: Date
): string {
  return date.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }
  );
}

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDateAfter(
  date: string,
  days: number
): Date {

  const result =
    new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
}


/* =====================================================
   PERIOD CHECK
===================================================== */

export function isWithinPeriod(
  start: string,
  end: string
): boolean {

  const now =
    new Date();

  return (
    now >= new Date(start) &&
    now < new Date(end)
  );
}


/* =====================================================
   SCHEDULE
===================================================== */

export function buildSchedule(
  settings: ScheduleSettings
) {

  const start =
    new Date(settings.start_date);

    if (TEST_SCHEDULE_MODE(settings)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLabel = formatDateVN(today);

      return {
        startDate: todayLabel,

        submission: {
          start: todayLabel,
          end: todayLabel,
          enabled: true,
        },

        review1: {
          start: todayLabel,
          end: todayLabel,
        },

        addition: {
          start: todayLabel,
          end: todayLabel,
          enabled: true,
        },

        review2: {
          start: todayLabel,
          end: todayLabel,
        },

        result: {
          start: todayLabel,
          end: todayLabel,
          enabled: true,
        },
      };
    }

  /*
    Mỗi period dùng:
    
    start = ngày bắt đầu
    end   = ngày bắt đầu + số ngày
    
    end là mốc EXCLUSIVE khi kiểm tra thời gian.
  */


  const submissionStart =
    getDateAfter(
      settings.start_date,
      0
    );

  const submissionEnd =
    getDateAfter(
      settings.start_date,
      settings.submission_days
    );

  const review1Start =
    getDateAfter(
      settings.start_date,
      settings.submission_days
    );

  const review1End =
    getDateAfter(
      settings.start_date,
      settings.submission_days +
        settings.review1_days
    );


  const additionStart =
    getDateAfter(
      settings.start_date,
      settings.submission_days +
        settings.review1_days
    );

  const additionEnd =
    getDateAfter(
      settings.start_date,
      settings.submission_days +
        settings.review1_days +
        settings.addition_days
    );


  const review2Start =
    getDateAfter(
      settings.start_date,
      settings.submission_days +
        settings.review1_days +
        settings.addition_days
    );

  const review2End =
    getDateAfter(
      settings.start_date,
      settings.submission_days +
        settings.review1_days +
        settings.addition_days +
        settings.review2_days
    );


  const resultStart =
    getDateAfter(
      settings.start_date,
      settings.submission_days +
        settings.review1_days +
        settings.addition_days +
        settings.review2_days
    );

  const resultEnd =
    getDateAfter(
      settings.start_date,
      settings.submission_days +
        settings.review1_days +
        settings.addition_days +
        settings.review2_days +
        settings.result_days
    );


  return {

    startDate:
      formatDateVN(start),

    submission: {
      start:
        formatDateVN(
          submissionStart
        ),

      end:
        formatDateVN(
          getDateAfter(
            settings.start_date,
            settings.submission_days - 1
          )
        ),

      enabled:
        settings.submission_enabled,
    },


    review1: {
      start:
        formatDateVN(
          review1Start
        ),

      end:
        formatDateVN(
          getDateAfter(
            settings.start_date,
            settings.submission_days +
              settings.review1_days -
              1
          )
        ),
    },


    addition: {
      start:
        formatDateVN(
          additionStart
        ),

      end:
        formatDateVN(
          getDateAfter(
            settings.start_date,
            settings.submission_days +
              settings.review1_days +
              settings.addition_days -
              1
          )
        ),

      enabled:
        settings.addition_enabled,
    },


    review2: {
      start:
        formatDateVN(
          review2Start
        ),

      end:
        formatDateVN(
          getDateAfter(
            settings.start_date,
            settings.submission_days +
              settings.review1_days +
              settings.addition_days +
              settings.review2_days -
              1
          )
        ),
    },


    result: {
      start:
        formatDateVN(
          resultStart
        ),

      end:
        formatDateVN(
          getDateAfter(
            settings.start_date,
            settings.submission_days +
              settings.review1_days +
              settings.addition_days +
              settings.review2_days +
              settings.result_days -
              1
          )
        ),

      enabled:
        settings.result_enabled,
    },

  };
}

export function isSubmissionPeriod(
  settings: ScheduleSettings
): boolean {
  const period = getSchedulePeriod(
    settings,
    "submission"
  );

  return (
    period.enabled &&
    isWithinPeriod(
      period.start.toISOString(),
      period.end.toISOString()
    )
  );
}

export function isAdditionPeriod(
  settings: ScheduleSettings
): boolean {
  const period = getSchedulePeriod(
    settings,
    "addition"
  );

  return (
    period.enabled &&
    isWithinPeriod(
      period.start.toISOString(),
      period.end.toISOString()
    )
  );
}

export function isResultPeriod(
  settings: ScheduleSettings
): boolean {
  const period = getSchedulePeriod(
    settings,
    "result"
  );

  return (
    period.enabled &&
    isWithinPeriod(
      period.start.toISOString(),
      period.end.toISOString()
    )
  );
}

export const ADMIN_NAMES: Record<string, string> = {
  "lchsv_gdth_sv5t-1@sgu.edu.vn": "Admin 1",
  "lchsv_gdth_sv5t-2@sgu.edu.vn": "Admin 2",
};