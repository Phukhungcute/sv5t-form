"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACADEMIC_YEAR } from "@/lib/constants";
import {
  SUBMISSION_REVIEW_LEVEL,
  type ReviewCriterion,
  type ReviewLevel,
} from "@/lib/review-criteria";

export function useReviewCriteria(
  reviewLevel: ReviewLevel = SUBMISSION_REVIEW_LEVEL,
) {
  const [criteria, setCriteria] = useState<ReviewCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        const response = await fetch(
          `/api/admin/review-criteria?academic_year=${encodeURIComponent(
            ACADEMIC_YEAR.replace(/\s/g, "")
          )}&review_level=${reviewLevel}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Không thể tải tiêu chí.");
        }

        if (!cancelled) {
          setCriteria(Array.isArray(result.data) ? result.data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải danh sách tiêu chí.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reviewLevel]);

  return { criteria, loading, error };
}
