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

  // Các hằng số câu hỏi
export const STANDARD = {
  CONDUCTSCORE: {
    CONTENT: `1. Điểm rèn luyện năm học ${ACADEMIC_YEAR}`,
    DESC: "(Không ghi xếp loại)",
  },

  UNIONEVALUATION: {
    CONTENT: `2. Phân tích chất lượng Đoàn viên năm học ${ACADEMIC_YEAR}`,
    DESC: "(đối với Hội viên là Đoàn viên)",
  },

  ETHIC3: {
    CONTENT:
      "3. Là thành viên chính thức đội thi tìm hiểu về chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh từ cấp khoa trở lên",
    DESC: "",
  },

  ETHIC4: {
    CONTENT:
      "4. Có tham luận, bài viết được trình bày tại các diễn đàn học thuật về các môn khoa học Mác - Lênin, tư tưởng Hồ Chí Minh từ cấp khoa trở lên",
    DESC:
      "(Ghi rõ tên tham luận, diễn đàn, cấp và thời gian tổ chức)",
  },

  ETHIC5: {
    CONTENT:
      "5. Đạt danh hiệu Thanh niên tiên tiến làm theo lời Bác các cấp hoặc là điển hình được biểu dương trong việc thực hiện học tập và làm theo tư tưởng, tấm gương đạo đức, phong cách Chủ tịch Hồ Chí Minh",
    DESC:
      "(Ghi rõ danh hiệu, cấp tổ chức và thời gian tuyên dương)",
  },

  ETHIC6: {
    CONTENT:
      "6. Có hành động dũng cảm cứu người bị nạn, bắt cướp, giúp người neo đơn, người nghèo hoặc người gặp khó khăn, hoạn nạn trong tình trạng nguy hiểm và cấp thiết được khen thưởng, biểu dương từ trường, cấp xã, phường trở lên hoặc được nêu gương trên các phương tiện truyền thông đại chúng",
    DESC:
      "(Ghi rõ nội dung, hình thức khen thưởng hoặc biểu dương, cấp tổ chức và thời gian)",
  },

  ETHIC7: {
    CONTENT:
      "7. Tham gia và đạt giải Khuyến khích trở lên trong các cuộc thi tìm hiểu về lịch sử, quê hương, đất nước, chủ quyền biển đảo Việt Nam",
    DESC: "",
  },

  ETHIC8: {
    CONTENT:
      "8. Tham gia và đạt giấy chứng nhận các chương trình tìm hiểu về lịch sử từ cấp khoa trở lên",
    DESC: "",
  },

  GPA: {
    CONTENT: `1. Điểm trung bình học tập năm học ${ACADEMIC_YEAR}`,
    DESC: "(Không ghi xếp loại)",
  },

  STUDY2: {
    CONTENT:
      "2. Có chứng nhận tham gia tích cực ít nhất 01 Câu lạc bộ về học thuật từ cấp khoa (Câu lạc bộ Sách “Ươm mầm tri thức”, Câu lạc bộ “Sinh viên 5 tốt”, Câu lạc bộ Học thuật “Tôi - Người Giáo viên Tiểu học”) trở lên",
    DESC: "",
  },

  STUDY3: {
    CONTENT:
      "3. Có đề tài nghiên cứu khoa học (tham gia với tư cách là chủ nhiệm đề tài hoặc đồng tác giả của đề tài hoặc thành viên nhóm nghiên cứu đề tài) trong năm học được hội đồng khoa học cấp khoa nghiệm thu đánh giá từ loại Đạt trở lên",
    DESC:
      "",
  },

  STUDY4: {
    CONTENT:
      "4. Có ít nhất 01 bài viết về lĩnh vực chuyên môn đang theo học, đăng tải trên các sản phẩm của các cơ quan truyền thông uy tín hoặc các báo, tạp chí khoa học chuyên ngành của trường hoặc có bài tham luận tham gia các hội thảo khoa học cấp khoa trở lên",
    DESC:
      "(Ghi rõ tên bài viết, tên - số báo hoặc tạp chí và ngày phát hành)",
  },
  
  STUDY5: {
    CONTENT:
      "5. Tham gia và đạt giải Khuyến khích trở lên trong các cuộc thi học thuật từ cấp khoa trở lên",
    DESC:
      "",
  },

  PHYSICAL1: {
    CONTENT:
      "1. Đạt danh hiệu “Thanh niên khỏe” của năm học",
    DESC: "(tiêu chuẩn cụ thể theo Hướng dẫn liên tịch số 87/2006/HDLT-ĐTN-TDTT về tiêu chuẩn thi đua và rèn luyện thể dục thể thao của các cấp bộ Đoàn và đoàn viên, thanh niên do Trung ương Đoàn TNCS Hồ Chí Minh và Ủy ban Thể dục - Thể thao ban hành)",
  },

  PHYSICAL2: {
    CONTENT:
      "2. Đạt giải khuyến khích trở lên các hội thao cấp khoa trong năm trở lên",
    DESC: "(Ghi rõ tên hội thao, đơn vị tổ chức và giải thưởng đạt được)",
  },

  PHYSICAL3: {
    CONTENT:
      "3. Là thành viên đội tuyển cấp trường các môn thể dục thể thao",
    DESC: "(Ghi rõ tên đội tuyển và cấp)",
  },

  PHYSICAL4: {
    CONTENT:
      "4. Có chứng nhận tham gia rèn luyện thể thao định kỳ tại 01 câu lạc bộ, tổ, đội, nhóm thể thao",
    DESC: "",
  },

  PHYSICAL5: {
    CONTENT:
      "5. Là thành viên và đạt chứng nhận của câu lạc bộ Văn nghệ xung kích cấp khoa",
    DESC: "",
  },

  PHYSICAL6: {
    CONTENT:
      "6. Điểm trung bình các học phần Giáo dục Thể chất đã hoàn thành là từ 7.0/10 trở lên",
    DESC: "",
  },

  PHYSICAL7: {
    CONTENT:
      "7. Đối với những sinh viên khuyết tật, tiêu chuẩn về thể lực bao gồm tập thể dục hằng ngày và rèn luyện ít nhất 01 môn thể thao dành cho người khuyết tật",
    DESC: "(Ghi rõ tên môn thể thao và thời gian tập luyện)",
  },

  VOLUNTEER1: {
    CONTENT:
      "1. Được khen thưởng từ cấp trường trở lên về hoạt động tình nguyện",
    DESC: "(Ghi rõ hình thức, nội dung và cấp khen thưởng)",
  },

  VOLUNTEER2: {
    CONTENT:
      "2. Tham gia và được cấp giấy chứng nhận hoàn thành một trong các chiến dịch, chương trình tình nguyện trong năm học",
    DESC: "(Ghi rõ tên chiến dịch hoặc chương trình và thời gian tham gia)",
  },

  VOLUNTEER3: {
    CONTENT:
      "3. Tham gia ít nhất 05 ngày hoạt động tình nguyện trong năm",
    DESC:
      "(Ghi rõ số ngày thực tế tham gia các hoạt động tình nguyện cộng đồng)",
  },

  VOLUNTEER4: {
    CONTENT:
      "4. Tham gia và được chứng nhận là thành viên của câu lạc bộ tình nguyện cấp khoa trở lên",
    DESC: "",
  },

  FOREIGNLANGUAGE1: {
    CONTENT:
      "1. Các chứng chỉ ngoại ngữ đã đạt",
    DESC:
      "(Ghi rõ tên chứng chỉ, ngoại ngữ, mức trình độ, đơn vị cấp và thời gian cấp)",
  },

  FOREIGNLANGUAGE2: {
    CONTENT:
      "2. Điểm trung bình các học phần Tiếng Anh I, II, III",
    DESC:
      "(Không bao gồm môn Ngoại ngữ chuyên ngành)",
  },

  FOREIGNLANGUAGE3: {
    CONTENT:
      "3. Tham gia và đạt giải khuyến khích trở lên các cuộc thi ngoại ngữ từ cấp khoa trở lên",
    DESC:
      "(Ghi rõ tên cuộc thi, đơn vị tổ chức, xếp loại, xếp hạng và giải thưởng đạt được)",
  },

  SKILL4: {
    CONTENT:
      "4. Tham gia và được chứng nhận hoàn thành ít nhất 01 khóa huấn luyện kỹ năng.",
    DESC:
      "(Ghi rõ số lượng, nội dung kỹ năng và xếp loại nếu có)",
  },

  SKILL5: {
    CONTENT:
      "5. Đạt chứng chỉ Tin học",
    DESC:
      "",
  },

  SKILL6: {
    CONTENT:
      "6. Đạt thành tích trong các cuộc thi về kỹ năng từ cấp khoa trở lên",
    DESC:
      "(Ghi rõ tên cuộc thi, đơn vị tổ chức, xếp loại, xếp hạng và giải thưởng đạt được)",
  },

  SKILL7: {
    CONTENT:
      "7. Là báo cáo viên các lớp huấn luyện kỹ năng từ cấp khoa trở lên",
    DESC:
      "",
  },
  
  SKILL8: {
    CONTENT:
      "8. Được Đoàn Thanh niên - Hội Sinh viên từ cấp trường trở lên khen thưởng về thành tích xuất sắc trong công tác Đoàn, phong trào thanh niên hoặc công tác Hội, phong trào sinh viên",
    DESC:
      "(Ghi rõ hình thức, nội dung và cấp khen thưởng)",
  },

  INTEGRATION8: {
    CONTENT:
      "9. Tham gia tích cực ít nhất 01 hoạt động về hội nhập do cấp khoa trở lên tổ chức",
    DESC:
      "(Ghi rõ tên hoạt động, đơn vị tổ chức, địa điểm, thời gian tổ chức và vai trò khi tham gia)",
  },

  INTEGRATION9: {
    CONTENT:
      "10. Tham gia và được chứng nhận hoàn thành ít nhất 01 hoạt động giao lưu quốc tế",
    DESC:
      "(Ghi rõ tên hoạt động, đơn vị tổ chức, địa điểm, thời gian tổ chức, giao lưu với ai và vai trò khi tham gia)",
  },

  PRIORITY1: {
    CONTENT:
      "1. Điểm rèn luyện trung bình năm học đạt từ 90/100 trở lên",
    DESC: "",
  },

  PRIORITY2: {
    CONTENT:
      "2. Điểm trung bình học tập cả năm học đạt từ 3.0/4.0 trở lên",
    DESC:
      "",
  },

  PRIORITY3: {
    CONTENT:
      "3. Đạt chứng chỉ tiếng Anh trình độ B1 (theo khung tham chiếu châu Âu) hoặc tương đương B1 hoặc chứng chỉ ngoại ngữ khác ở trình độ tương đương trở lên",
    DESC: "(không xét thời hạn của chứng chỉ; việc áp dụng quy đổi giá trị tương đương chứng chỉ IELTS, TOEFL, TOEIC và một số chứng chỉ khác thì áp dụng theo Thông tư số 01/2014/TT-BGDĐT ngày 24/01/2014 của Bộ Giáo dục và Đào tạo và Thông tư 66/2008/QĐ-BGDĐT ngày 02/12/2008)",
  },

  PRIORITY4: {
    CONTENT:
      "4. Điểm trung bình học phần Tiếng Anh I, II hoặc III đã hoàn thành đạt từ 8.5 trở lên (tính điểm học phần tích lũy)",
    DESC: "",
  },

  PRIORITY5: {
    CONTENT:
      "5. Có thành tích nổi bật trong các hoạt động Đoàn - Hội của khoa, trường",
    DESC:
      "(Ghi rõ nội dung và cấp khen thưởng)",
  },

  PRIORITY6: {
    CONTENT:
      "6. Tham gia tích cực các hoạt động tình nguyện và được giấy khen từ Đoàn Thanh niên - Hội Sinh viên trường trở lên",
    DESC: "(Ghi rõ nội dung và cấp khen thưởng)",
  },

  PRIORITY7: {
    CONTENT:
      "7. Là thanh niên tiêu biểu được biểu dương, khen thưởng trên các lĩnh vực tại địa phương, đơn vị hoặc được nêu gương trên các phương tiện truyền thông đại chúng",
    DESC: "",
  },

  PRIORITY8: {
    CONTENT:
      "8. Tham gia và đạt từ giải Ba trở lên giải trong các cuộc thi tìm hiểu về văn hóa, lịch sử, xã hội trong nước và thế giới từ cấp trường trở lên",
    DESC: "",
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