"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { initializeStudentPage } from "@/lib/initializeStudentPage";

type ProofItem = {
  id: string;
  image: string;
  fileName: string;
  description: string;
};

type CategoryKey =
  | "ethics"
  | "study"
  | "physical"
  | "volunteer"
  | "integration"
  | "priority";

type ProofData = Record<CategoryKey, ProofItem[]>;

type Student = {
  mssv: string;
  full_name: string;
};

const categories: {
  key: CategoryKey;
  title: string;
}[] = [
  {
    key: "ethics",
    title: "1. Đạo đức tốt",
  },
  {
    key: "study",
    title: "2. Học tập tốt",
  },
  {
    key: "physical",
    title: "3. Thể lực tốt",
  },
  {
    key: "volunteer",
    title: "4. Tình nguyện tốt",
  },
  {
    key: "integration",
    title: "5. Hội nhập tốt",
  },
  {
    key: "priority",
    title: "6. Tiêu chuẩn ưu tiên",
  },
];

const emptyProofData: ProofData = {
  ethics: [],
  study: [],
  physical: [],
  volunteer: [],
  integration: [],
  priority: [],
};

const DRAFT_PREFIX = "sv5t_proof_draft_";
const EDIT_REVIEW_PREFIX = "sv5t_editproof_review_";

function createEmptyItem(): ProofItem {
  return {
    id: crypto.randomUUID(),
    image: "",
    fileName: "",
    description: "",
  };
}

/* =========================================================
   INDEXED DB
========================================================= */

const DB_NAME = "sv5t-editproof-db";
const STORE_NAME = "drafts";

function openProofDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveProofDraftToDB(
  key: string,
  data: ProofData
) {
  const db = await openProofDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).put(data, key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function loadProofDraftFromDB(
  key: string
): Promise<ProofData | null> {
  const db = await openProofDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const request =
      transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteProofDraftFromDB(key: string) {
  const db = await openProofDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).delete(key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/* =========================================================
   IMAGE → DATA URL
========================================================= */

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsDataURL(file);
  });
}

/* =========================================================
   Tính dung lượng
========================================================= */

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB / ảnh
const MAX_TOTAL_SIZE = 1000 * 1024 * 1024; // 1000 MB tổng

function getDataUrlSize(dataUrl: string): number {
  if (!dataUrl) return 0;

  const base64 = dataUrl.split(",")[1] ?? "";

  // Dung lượng bytes thực của Base64
  return Math.ceil((base64.length * 3) / 4);
}

function getTotalProofSize(data: ProofData): number {
  return categories.reduce((total, category) => {
    return (
      total +
      data[category.key].reduce(
        (categoryTotal, item) =>
          categoryTotal + getDataUrlSize(item.image),
        0
      )
    );
  }, 0);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* =========================================================
   PAGE
========================================================= */

export default function ProofPage() {
  const router = useRouter();
  
  useEffect(() => {
  initializeStudentPage(router, "addition");
}, [router]);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [proofData, setProofData] =
    useState<ProofData>(emptyProofData);

  const [draftLoaded, setDraftLoaded] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  /* =======================================================
     LOAD STUDENT
  ======================================================= */

  useEffect(() => {
    async function loadStudent() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/");
          return;
        }

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
          router.push("/");
          return;
        }

        if (profile.role !== "student") {
          router.push("/admin");
          return;
        }

        const {
          data: studentData,
          error: studentError,
        } = await supabase
          .from("students")
          .select("mssv, full_name")
          .eq("mssv", profile.mssv)
          .single();

        if (studentError || !studentData) {
          console.error(
            "STUDENT ERROR:",
            studentError
          );
          return;
        }

        setStudent(studentData);
      } catch (error) {
        console.error(
          "LOAD STUDENT ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [router]);

  /* =======================================================
     LOAD DRAFT
  ======================================================= */

  useEffect(() => {
    if (!student?.mssv) return;

    async function loadDraft() {
      try {
        const key = `${DRAFT_PREFIX}${student!.mssv}`;

        const saved =
          await loadProofDraftFromDB(key);

        if (saved) {
          setProofData({
            ...emptyProofData,
            ...saved,
          });

          console.log(
            "PROOF DRAFT LOADED:",
            key,
            saved
          );
        }
      } catch (error) {
        console.error(
          "PROOF DRAFT LOAD ERROR:",
          error
        );
      } finally {
        setDraftLoaded(true);
      }
    }

    loadDraft();
  }, [student?.mssv]);

  /* =======================================================
     AUTO SAVE DRAFT
  ======================================================= */

  useEffect(() => {
    if (!draftLoaded || !student?.mssv) {
      return;
    }

    const key =
      `${DRAFT_PREFIX}${student.mssv}`;

    const timeout = setTimeout(async () => {
      try {
        await saveProofDraftToDB(
          key,
          proofData
        );

        console.log(
          "PROOF DRAFT SAVED:",
          key,
          proofData
        );
      } catch (error) {
        console.error(
          "PROOF DRAFT SAVE ERROR:",
          error
        );
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [
    draftLoaded,
    student?.mssv,
    proofData,
  ]);

  /* =======================================================
     ADD
  ======================================================= */

  function addProof(category: CategoryKey) {
    setProofData((prev) => ({
      ...prev,
      [category]: [
        ...prev[category],
        createEmptyItem(),
      ],
    }));
  }

  /* =======================================================
     REMOVE
  ======================================================= */

  function removeProof(
    category: CategoryKey,
    id: string
  ) {
    setProofData((prev) => ({
      ...prev,
      [category]: prev[category].filter(
        (item) => item.id !== id
      ),
    }));
  }

  /* =======================================================
     IMAGE
  ======================================================= */

  async function handleImageChange(
  category: CategoryKey,
  id: string,
  file: File | undefined
) {
  if (!file) return;

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    alert("Chỉ chấp nhận ảnh JPG hoặc PNG.");
    return;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    alert(
      `Ảnh "${file.name}" có dung lượng ${formatFileSize(
        file.size
      )}.\n\nMỗi ảnh không được vượt quá 15 MB.`
    );
    return;
  }

  try {
    const image = await fileToDataURL(file);

    setProofData((prev) => {
      /*
        Nếu đang thay ảnh cũ thì phải trừ ảnh cũ
        ra khỏi tổng dung lượng.
      */
      const oldItem = prev[category].find(
        (item) => item.id === id
      );

      const oldImageSize = oldItem
        ? getDataUrlSize(oldItem.image)
        : 0;

      const currentTotal =
        getTotalProofSize(prev);

      const newTotal =
        currentTotal -
        oldImageSize +
        file.size;

      if (newTotal > MAX_TOTAL_SIZE) {
        alert(
          `Không thể thêm ảnh này.\n\n` +
            `Tổng dung lượng minh chứng không được vượt quá 1000 MB.\n` +
            `Hiện tại: ${formatFileSize(
              currentTotal
            )}\n` +
            `Ảnh mới: ${formatFileSize(
              file.size
            )}`
        );

        return prev;
      }

      return {
        ...prev,
        [category]: prev[category].map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  image,
                  fileName: file.name,
                }
              : item
        ),
      };
    });
  } catch (error) {
    console.error(
      "IMAGE LOAD ERROR:",
      error
    );

    alert(
      "Không thể đọc hình ảnh."
    );
  }
}

  /* =======================================================
     DESCRIPTION
  ======================================================= */

  function updateDescription(
    category: CategoryKey,
    id: string,
    description: string
  ) {
    setProofData((prev) => ({
      ...prev,
      [category]: prev[category].map(
        (item) =>
          item.id === id
            ? {
                ...item,
                description,
              }
            : item
      ),
    }));
  }

  /* =======================================================
     FINISH
  ======================================================= */

  async function finishProof() {
    if (!student?.mssv) return;

    /*
      Những block không có ảnh sẽ bị loại bỏ.
      Dù block đó có description hay không.
    */

    const cleanedData: ProofData = {
      ethics: proofData.ethics.filter(
        (item) => item.image
      ),

      study: proofData.study.filter(
        (item) => item.image
      ),

      physical: proofData.physical.filter(
        (item) => item.image
      ),

      volunteer: proofData.volunteer.filter(
        (item) => item.image
      ),

      integration:
        proofData.integration.filter(
          (item) => item.image
        ),

      priority:
        proofData.priority.filter(
          (item) => item.image
        ),
    };

    const totalSize =
      getTotalProofSize(cleanedData);

    if (totalSize > MAX_TOTAL_SIZE) {
      alert(
        `Tổng dung lượng minh chứng vượt quá 1000 MB.\n` +
          `Hiện tại: ${formatFileSize(totalSize)}`
      );
      return;
    }

    setSaving(true);

    try {
      const key =
        `${EDIT_REVIEW_PREFIX}${student.mssv}`;

      /*
        Đồng thời lưu vào IndexedDB để tránh mất
        ảnh nếu trang review reload.
      */

      await saveProofDraftToDB(
        key,
        cleanedData
      );

      console.log(
  "EDIT PROOF SAVING KEY:",
  key
);

console.log(
  "EDIT PROOF SAVING DATA:",
  cleanedData
);
      
      router.push(
        "/dashboard/editproof/review"
      );
    } catch (error) {
      console.error(
        "PROOF FINISH ERROR:",
        error
      );

      alert(
        "Không thể lưu minh chứng."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải...
        </p>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">

        {/* HEADER */}

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Tạo minh chứng
            </h1>

            <p className="mt-2 text-gray-600">
              Vui lòng tải lên hình ảnh minh chứng
              tương ứng với từng nội dung.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            ← Quay về trang chủ
          </button>
        </div>

        {/* THANH DUNG LƯỢNG */}

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Dung lượng minh chứng
            </span>

            <span
              className={
                getTotalProofSize(proofData) >
                MAX_TOTAL_SIZE * 0.9
                  ? "font-semibold text-red-600"
                  : "font-semibold text-gray-700"
              }
            >
              {formatFileSize(
                getTotalProofSize(proofData)
              )}{" "}
              / 1000 MB
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${Math.min(
                  (getTotalProofSize(proofData) /
                    MAX_TOTAL_SIZE) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Mỗi ảnh tối đa 15 MB. Tổng tất cả minh chứng tối đa 1000 MB.
          </p>
        </div>

        {/* CÁC MỤC */}

        <div className="space-y-6">

          {categories.map((category) => {
            const items =
              proofData[category.key];

            return (
              <section
                key={category.key}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >

                <h2 className="text-2xl font-semibold text-gray-900">
                  {category.title}
                </h2>

                <div className="mt-6 space-y-4">

                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <p className="font-medium text-gray-800">
                          Minh chứng {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            removeProof(
                              category.key,
                              item.id
                            )
                          }
                          className="cursor-pointer flex items-center gap-1 text-sm font-medium text-red-500 transition hover:text-red-700"
                        >
                          <span className="text-lg">
                            ×
                          </span>
                          Xoá
                        </button>

                      </div>

                      {/* IMAGE */}

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Hình ảnh
                          <span className="ml-1 text-red-500">
                            *
                          </span>
                        </label>

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) =>
                            handleImageChange(
                              category.key,
                              item.id,
                              e.target.files?.[0]
                            )
                          }
                          className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white text-sm text-gray-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-gray-100 file:px-4 file:py-3 file:font-medium"
                        />

                        {item.fileName && (
                          <p className="mt-2 text-sm text-gray-500">
                            Đã chọn:{" "}
                            {item.fileName}
                          </p>
                        )}

                        {item.image && (
                          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                            <img
                              src={item.image}
                              alt="Minh chứng"
                              className="max-h-80 w-full object-contain"
                            />
                          </div>
                        )}
                      </div>

                      {/* DESCRIPTION */}

                      <div className="mt-5">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Mô tả
                        </label>

                        <textarea
                          rows={3}
                          maxLength={1000}
                          value={item.description}
                          onChange={(e) =>
                            updateDescription(
                              category.key,
                              item.id,
                              e.target.value
                            )
                          }
                          placeholder="Mô tả nội dung của minh chứng..."
                          className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                    </div>
                  ))}

                  {/* THÊM */}

                  <button
                    type="button"
                    onClick={() =>
                      addProof(category.key)
                    }
                    className="cursor-pointer flex items-center gap-2 font-medium text-blue-600 transition hover:text-blue-800"
                  >
                    <span className="text-2xl leading-none">
                      +
                    </span>

                    <span>
                      Thêm
                    </span>
                  </button>

                </div>
              </section>
            );
          })}

        </div>

        {/* HOÀN TẤT */}

        <div className="mt-8 flex items-center justify-between">

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← Quay lại
          </button>

          <button
            type="button"
            onClick={finishProof}
            disabled={saving}
            className="cursor-pointer rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : "Hoàn tất"}
          </button>

        </div>

      </div>
    </main>
  );
}