"use client";

import type { ReviewCriterion } from "@/lib/review-criteria";

type Props = {
  criterion: ReviewCriterion;
  value: string;
  onChange: (value: string) => void;
};

export default function DynamicCriterionField({
  criterion,
  value,
  onChange,
}: Props) {
  const title = `${criterion.sort_order + 1}. ${criterion.content}`;
  const inputClass =
    "mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

  function handleNumberChange(rawValue: string) {
    if (rawValue === "") {
      onChange("");
      return;
    }

    if (criterion.input_type === "score100") {
      if (!/^\d+$/.test(rawValue)) return;
      const number = Number(rawValue);
      if (number >= 0 && number <= 100) onChange(rawValue);
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(rawValue)) return;

    const number = Number(rawValue);
    const maximum = criterion.input_type === "score4" ? 4 : 10;

    if (number >= 0 && number <= maximum) onChange(rawValue);
  }

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <p className="font-medium leading-7 text-gray-800">{title}</p>

      {criterion.description && (
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {criterion.description}
        </p>
      )}

      {criterion.input_type === "text" ? (
        <textarea
          rows={4}
          maxLength={1000}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Để trống nếu không có..."
          className={inputClass + " resize-y"}
        />
      ) : (
        <input
          type="number"
          min="0"
          max={
            criterion.input_type === "score100"
              ? 100
              : criterion.input_type === "score4"
                ? 4
                : 10
          }
          step={criterion.input_type === "score100" ? 1 : 0.01}
          value={value}
          onChange={(event) => handleNumberChange(event.target.value)}
          placeholder={
            criterion.input_type === "score100"
              ? "Nhập điểm từ 0 đến 100"
              : criterion.input_type === "score4"
                ? "Ví dụ: 3.25"
                : "Ví dụ: 8.50"
          }
          className={inputClass}
        />
      )}

      <p className="mt-2 text-xs text-red-400">
        Để trống nếu không có thông tin.
      </p>
    </div>
  );
}
