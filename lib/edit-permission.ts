/**
 * Kiểm tra xem hồ sơ có nhận xét bổ sung hợp lệ từ quản trị viên hay không.
 *
 * - Có nội dung thực tế (khác null, undefined, "") → được phép chỉnh sửa.
 * - null / undefined / chuỗi rỗng / chỉ chứa khoảng trắng → không được phép chỉnh sửa.
 */
export function hasUsableReviewNote(
  reviewNote: unknown
): boolean {
  return (
    typeof reviewNote === "string" &&
    reviewNote.trim().length > 0
  );
}