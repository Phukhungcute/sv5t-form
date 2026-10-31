export type ReviewLevel = "faculty" | "university";

export type ReviewSection =
  | "ethics"
  | "study"
  | "physical"
  | "volunteer"
  | "integration"
  | "priority";

export type CriterionInputType =
  | "text"
  | "score10"
  | "score4";

export type ReviewCriterion = {
  id: string;
  academic_year: string;
  review_level: ReviewLevel;
  criterion_key: string;
  section_key: ReviewSection;
  label: string;
  content: string;
  description: string;
  input_type: CriterionInputType;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReviewCriterionInput = {
  academic_year: string;
  review_level: ReviewLevel;
  section_key: ReviewSection;
  content: string;
  description: string;
  input_type: CriterionInputType;
};

export const REVIEW_SECTIONS: {
  key: ReviewSection;
  label: string;
}[] = [
  { key: "ethics", label: "Đạo đức tốt" },
  { key: "study", label: "Học tập tốt" },
  { key: "physical", label: "Thể lực tốt" },
  { key: "volunteer", label: "Tình nguyện tốt" },
  { key: "integration", label: "Hội nhập tốt" },
  { key: "priority", label: "Tiêu chuẩn ưu tiên" },
];

export const REVIEW_LEVELS: Record<ReviewLevel, string> = {
  faculty: "Cấp Khoa",
  university: "Cấp Trường",
};

export const REVIEW_LEVEL_CODES: Record<ReviewLevel, string> = {
  faculty: "FAC",
  university: "UNI",
};

export const CRITERION_INPUT_TYPES: {
  value: CriterionInputType;
  label: string;
}[] = [
  { value: "text", label: "Văn bản (Text)" },
  { value: "score10", label: "Điểm hệ 10" },
  { value: "score4", label: "Điểm hệ 4" },
];