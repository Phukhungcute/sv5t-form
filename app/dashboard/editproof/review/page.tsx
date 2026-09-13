"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase";
import {
    FACULTY_NAME,
    FACULTY_NAME_NORMAL,
    ACADEMIC_YEAR,
} from "@/lib/constants";
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

type ProofData = Record<
  CategoryKey,
  ProofItem[]
>;

type Student = {
  mssv: string;
  full_name: string;
  class_name: string;
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

/*
  KEY RIÊNG CHO EDIT PROOF REVIEW
*/
const EDIT_REVIEW_PREFIX =
  "sv5t_editproof_review_";

const DB_NAME =
  "sv5t-editproof-db";

const STORE_NAME =
  "drafts";

/* =========================================================
   INDEXED DB
========================================================= */

function openEditProofDB(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          1
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              STORE_NAME
            )
          ) {
            db.createObjectStore(
              STORE_NAME
            );
          }
        };

      request.onsuccess =
        () =>
          resolve(
            request.result
          );

      request.onerror =
        () =>
          reject(
            request.error
          );
    }
  );
}

async function compressImage(
  dataUrl: string,
  maxSize = 1800,
  quality = 0.72
): Promise<string> {
  const img = await loadImage(dataUrl);

  let width = img.naturalWidth;
  let height = img.naturalHeight;

  // Resize nếu ảnh quá lớn
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(
      maxSize / width,
      maxSize / height
    );

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Không thể tạo canvas.");
  }

  ctx.drawImage(
    img,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL(
    "image/jpeg",
    quality
  );
}

async function loadEditProofData(
  key: string
): Promise<ProofData | null> {
  const db =
    await openEditProofDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            STORE_NAME
          )
          .get(key);

      request.onsuccess =
        () => {
          db.close();

          resolve(
            request.result ??
              null
          );
        };

      request.onerror =
        () => {
          db.close();

          reject(
            request.error
          );
        };
    }
  );
}

async function deleteEditProofData(
  key: string
) {
  const db =
    await openEditProofDB();

  return new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .delete(key);

      transaction.oncomplete =
        () => {
          db.close();
          resolve();
        };

      transaction.onerror =
        () => {
          db.close();
          reject(
            transaction.error
          );
        };
    }
  );
}

/* =========================================================
   IMAGE LOADER
========================================================= */

function loadImage(
  src: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload =
        () => resolve(image);

      image.onerror =
        () =>
          reject(
            new Error(
              "Không thể tải hình ảnh"
            )
          );

      image.src = src;
    }
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function EditProofReviewPage() {
  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(
      null
    );

  const [proofData, setProofData] =
    useState<ProofData>(
      emptyProofData
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  /* =======================================================
     INITIALIZE
  ======================================================= */

  useEffect(() => {
  initializeStudentPage(router, "addition");
}, [router]);

  useEffect(() => {
  async function loadData() {
    try {
      // =================================================
      // 1. CHECK USER
      // =================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/");
        return;
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

        router.push("/");
        return;
      }

      if (profile.role !== "student") {
        router.push("/admin");
        return;
      }

      // =================================================
      // 3. LOAD STUDENT
      // =================================================

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "mssv, full_name, class_name"
        )
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

      // =================================================
      // 4. CHECK SUBMISSION
      // =================================================

      const {
        data: submissions,
        error: submissionError,
      } = await supabase
        .from("submissions")
        .select("id")
        .eq("mssv", studentData.mssv)
        .limit(1);

      if (submissionError) {
        console.error(
          "SUBMISSION CHECK ERROR:",
          submissionError
        );

        alert(
          "Không thể kiểm tra trạng thái hồ sơ. Vui lòng thử lại."
        );

        return;
      }

      const hasSubmission =
        (submissions?.length ?? 0) > 0;

      if (!hasSubmission) {
        console.warn(
          "EDIT PROOF BLOCKED: Bạn chưa nộp hồ sơ..."
        );

        alert(
          "Bạn chưa nộp hồ sơ. Vui lòng nộp hồ sơ trước khi chỉnh sửa minh chứng."
        );

        router.replace("/dashboard");

        return;
      }

      // =================================================
      // 4. LOAD EDIT REVIEW DATA
      // =================================================

      const key =
        `${EDIT_REVIEW_PREFIX}${studentData.mssv}`;

      console.log(
        "EDIT PROOF REVIEW KEY:",
        key
      );

      /*
        1. Kiểm tra localStorage
      */

      const local =
        localStorage.getItem(key);

      console.log(
        "EDIT PROOF LOCALSTORAGE:",
        local
      );

      if (local) {
        try {
          const parsed =
            JSON.parse(local);

          console.log(
            "EDIT PROOF REVIEW DATA FROM LOCAL:",
            parsed
          );

          setProofData(parsed);
          return;
        } catch (error) {
          console.error(
            "EDIT PROOF LOCALSTORAGE PARSE ERROR:",
            error
          );
        }
      }

      /*
        2. Kiểm tra IndexedDB
      */

      console.log(
        "EDIT PROOF: Đang tìm trong IndexedDB..."
      );

      const saved =
        await loadEditProofData(key);

      console.log(
        "EDIT PROOF INDEXEDDB DATA:",
        saved
      );

      if (saved) {
        setProofData(saved);

        console.log(
          "EDIT PROOF REVIEW LOAD SUCCESS"
        );
      } else {
        console.warn(
          "EDIT PROOF REVIEW: KHÔNG TÌM THẤY DATA → QUAY VỀ EDITPROOF"
        );

        router.push(
          "/dashboard/editproof"
        );
      }

    } catch (error) {
      console.error(
        "EDIT PROOF REVIEW LOAD ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  loadData();
}, [router]);

  /* =======================================================
     CREATE PDF
======================================================= */

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
     CREATE PDF
  ========================================================= */
  
  async function loadFontAsBase64(
    url: string
  ): Promise<string> {
    const response = await fetch(url);
  
    if (!response.ok) {
      throw new Error(
        `Không thể tải font: ${url}`
      );
    }
  
    const buffer =
      await response.arrayBuffer();
  
    const bytes =
      new Uint8Array(buffer);
  
    let binary = "";
  
    const chunkSize = 0x8000;
  
    for (
      let i = 0;
      i < bytes.length;
      i += chunkSize
    ) {
      const chunk =
        bytes.subarray(
          i,
          i + chunkSize
        );
  
      binary += String.fromCharCode(
        ...chunk
      );
    }
  
    return btoa(binary);
  }
  
  async function registerVietnameseFonts(
    pdf: jsPDF
  ) {
    const regular =
      await loadFontAsBase64(
        "/fonts/Times New Roman-Regular.ttf"
      );
  
    const bold =
      await loadFontAsBase64(
        "/fonts/Times New Roman-Bold.ttf"
      );
  
    pdf.addFileToVFS(
      "Times New Roman-Regular.ttf",
      regular
    );
  
    pdf.addFont(
      "Times New Roman-Regular.ttf",
      "Times New Roman",
      "normal"
    );
  
    pdf.addFileToVFS(
      "Times New Roman-Bold.ttf",
      bold
    );
  
    pdf.addFont(
      "Times New Roman-Bold.ttf",
      "Times New Roman",
      "bold"
    );
  }
  
  async function createProofPDF(
    student: Student,
    proofData: ProofData
  ): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
  
    await registerVietnameseFonts(pdf);
  
    const pageWidth =
      pdf.internal.pageSize.getWidth();
  
    const pageHeight =
      pdf.internal.pageSize.getHeight();
  
    const margin = 15;
  
    const boxWidth = 32;
    const boxHeight = 18;
  
    const headerWidth =
      pageWidth - margin * 2 - boxWidth - 5;
  
    const contentWidth =
      pageWidth - margin * 2;
  
    let y = 18;
  
    /* =====================================================
       HEADER
    ===================================================== */
  
    pdf.setFontSize(13);
  
    pdf.setFont(
      "Times New Roman",
      "normal"
    );
  
    pdf.text(
      "HỘI SINH VIÊN VIỆT NAM TRƯỜNG ĐẠI HỌC SÀI GÒN",
      margin,
      y
    );
  
    y += 6;
  
    pdf.setFont(
      "Times New Roman",
      "bold"
    );
  
    pdf.text(
      `BCH LCH SV KHOA ${FACULTY_NAME}`,
      26,
      y
    );
  
    pdf.text(
      "____",
      60,
      y + 6
    );
  
    /* =====================================================
       MẪU 3
    ===================================================== */
  
    const boxX =
      pageWidth - margin - boxWidth;
  
    const boxY = 8;
  
    pdf.setLineWidth(0.3);
  
    pdf.rect(
      boxX,
      boxY,
      boxWidth,
      boxHeight
    );
  
    pdf.setFontSize(14);
  
    pdf.text(
      "MẪU 3",
      boxX + boxWidth / 2,
      boxY + 11,
      {
        align: "center",
      }
    );
  
    /* =====================================================
       TITLE
    ===================================================== */
  
    y += 24;
  
    pdf.setFontSize(15);
  
    pdf.text(
      "MINH CHỨNG CÁC TIÊU CHUẨN XÉT CHỌN DANH HIỆU",
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );
  
    y += 6;
  
    pdf.text(
      `“SINH VIÊN 5 TỐT” CẤP TRƯỜNG NĂM HỌC ${ACADEMIC_YEAR}`,
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );
  
    y += 10;
  
    /* =====================================================
       LINE
    ===================================================== */
  
    pdf.setLineWidth(0.25);
  
    pdf.line(
      pageWidth / 2 - 25,
      y,
      pageWidth / 2 + 25,
      y
    );
  
    y += 12;
  
    /* =====================================================
       I. THÔNG TIN CÁ NHÂN
    ===================================================== */
  
    pdf.setFontSize(13);
  
    pdf.setFont(
      "Times New Roman",
      "bold"
    );
  
    pdf.text(
      "I. THÔNG TIN CÁ NHÂN",
      margin,
      y
    );
  
    y += 9;
  
    pdf.setFont(
      "Times New Roman",
      "normal"
    );
  
    pdf.setFontSize(13);
  
    const leftX = margin;
  
    const rightX =
      pageWidth / 2 + 5;
  
    pdf.text(
      `1. Họ và tên: ${student.full_name}`,
      leftX,
      y
    );
  
    pdf.text(
      `2. Mã số sinh viên: ${student.mssv}`,
      rightX,
      y
    );
  
    y += 7;
  
    pdf.text(
      `3. Khoa: ${FACULTY_NAME_NORMAL}`,
      leftX,
      y
    );
  
    pdf.text(
      `4. Lớp: ${student.class_name}`,
      rightX,
      y
    );
  
    y += 12;
  
    /* =====================================================
       II. MINH CHỨNG
    ===================================================== */
  
    pdf.setFont(
      "Times New Roman",
      "bold"
    );
  
    pdf.setFontSize(13);
  
    pdf.text(
      "II. MINH CHỨNG CÁC TIÊU CHUẨN XÉT CHỌN DANH HIỆU",
      margin,
      y
    );
  
    y += 10;
  
    /* =====================================================
       TÌM CATEGORY CUỐI CÙNG CÓ MINH CHỨNG
    ===================================================== */
  
    const lastCategory =
      [...categories]
        .reverse()
        .find(
          (category) =>
            proofData[category.key]?.length > 0
        );
  
    const lastCategoryKey =
      lastCategory?.key;
  
    let evidenceNumber = 0;
  
    /* =====================================================
       CATEGORY
    ===================================================== */
  
    for (const category of categories) {
    const items =
      proofData[category.key] ?? [];
  
    if (y > pageHeight - 45) {
      pdf.addPage();
      y = 20;
    }
  
    // ==========================================
    // CATEGORY TITLE
    // ==========================================
  
    pdf.setFont(
      "Times New Roman",
      "bold"
    );
  
    pdf.setFontSize(13);
  
    pdf.text(
      category.title,
      margin,
      y
    );
  
    y += 7;
  
    // ==========================================
    // KHÔNG CÓ MINH CHỨNG
    // ==========================================
  
    if (items.length === 0) {
      pdf.setFont(
        "Times New Roman",
        "normal"
      );
  
      pdf.setFontSize(13);
  
      pdf.text(
        "Minh chứng: Không",
        margin + 5,
        y
      );
  
      y += 10;
  
      continue;
    }
  
    // ==========================================
    // CÓ MINH CHỨNG
    // ==========================================
  
    for (
      let index = 0;
      index < items.length;
      index++
    ) {
      const item =
        items[index];
  
      evidenceNumber++;
    }
  
      /* =================================================
        MINH CHỨNG
      ================================================= */
  
      for (
        let index = 0;
        index < items.length;
        index++
      ) {
        const item =
          items[index];
  
        evidenceNumber++;
  
        /*
          Nếu phần tiêu đề + mô tả đã quá thấp,
          chuyển minh chứng sang trang mới.
        */
  
        if (
          y >
          pageHeight - 60
        ) {
          pdf.addPage();
  
          y = 20;
        }
  
        /* ===============================================
           MINH CHỨNG TITLE
        =============================================== */
  
        pdf.setFont(
          "Times New Roman",
          "bold"
        );
  
        pdf.setFontSize(10.5);
  
        pdf.text(
          `Minh chứng ${index + 1}`,
          margin + 5,
          y
        );
  
        y += 6;
  
        /* ===============================================
           DESCRIPTION
        =============================================== */
  
        if (
          item.description?.trim()
        ) {
          pdf.setFont(
            "Times New Roman",
            "normal"
          );
  
          pdf.setFontSize(10);
  
          const description =
            pdf.splitTextToSize(
              `Mô tả: ${item.description}`,
              contentWidth - 10
            );
  
          pdf.text(
            description,
            margin + 5,
            y
          );
  
          y +=
            description.length * 5 +
            3;
        }
  
        /* ===============================================
           LOAD IMAGE
        =============================================== */
  
        const compressedImage =
          await compressImage(
            item.image,
            1800,
            0.72
          );
  
        const img =
          await loadImage(
            compressedImage
          );
  
        const maxWidth =
          contentWidth - 10;
  
        const maxHeight =
          pageHeight - y - 20;
  
        let ratio = Math.min(
          maxWidth / img.naturalWidth,
          maxHeight / img.naturalHeight,
          1
        );
  
        const imgWidth =
          img.naturalWidth * ratio;
  
        const imgHeight =
          img.naturalHeight * ratio;
  
        if (
          y + imgHeight >
          pageHeight - 15
        ) {
          pdf.addPage();
          y = 20;
  
          const newMaxHeight =
            pageHeight - y - 15;
  
          ratio = Math.min(
            maxWidth / img.naturalWidth,
            newMaxHeight / img.naturalHeight,
            1
          );
        }
  
        const finalWidth =
          img.naturalWidth * ratio;
  
        const finalHeight =
          img.naturalHeight * ratio;
  
        pdf.setLineWidth(0.2);
  
        pdf.rect(
          margin + 5,
          y,
          finalWidth,
          finalHeight
        );
  
        pdf.addImage(
          compressedImage,
          "JPEG",
          margin + 5,
          y,
          finalWidth,
          finalHeight,
          undefined,
          "MEDIUM"
        );
  
        y +=
          finalHeight + 10;
      }
  
      y += 3;
    }
  
    /* =====================================================
       NO PROOF
    ===================================================== */
  
    if (
      evidenceNumber === 0
    ) {
      pdf.setFont(
        "Times New Roman",
        "normal"
      );
  
      pdf.setFontSize(13);
  
      pdf.text(
        "Không có minh chứng.",
        margin,
        y
      );
    }
  
    return pdf.output("blob");
  }

  async function cleanupPreviousEditProof(
  mssv: string,
  currentVersion: number,
  protectedPath: string | null
) {
  const previousVersion =
    currentVersion - 1;

  if (previousVersion < 1) {
    return;
  }

  console.log(
    "CLEANUP PREVIOUS VERSION:",
    {
      mssv,
      currentVersion,
      previousVersion,
      protectedPath,
    }
  );

  /* =====================================================
     1. LẤY EDIT PROOF CỦA VERSION TRƯỚC
  ===================================================== */

  const {
    data: previousEditProof,
    error: editFetchError,
  } = await supabase
    .from("edit_proofs")
    .select(
      "id, version, file_path"
    )
    .eq("mssv", mssv)
    .eq("version", previousVersion)
    .maybeSingle();

  if (editFetchError) {
    console.error(
      "FETCH PREVIOUS EDIT PROOF ERROR:",
      editFetchError
    );

    return;
  }

  /* =====================================================
     2. NẾU VERSION TRƯỚC LÀ EDIT
     
     Ví dụ:
       current = v25*
       previous = v24*

     => xoá v24*
  ===================================================== */

  if (previousEditProof) {
    const filePath =
      previousEditProof.file_path;

    /*
      Không bao giờ xoá protected file.
    */

    if (
      protectedPath &&
      filePath === protectedPath
    ) {
      console.log(
        "SKIP PROTECTED FILE:",
        filePath
      );

      return;
    }

    /* ===================================================
       XOÁ STORAGE
    =================================================== */

    if (filePath) {
      const {
        error: storageError,
      } = await supabase.storage
        .from("proofs")
        .remove([
          filePath,
        ]);

      if (storageError) {
        console.error(
          "DELETE PREVIOUS EDIT FILE ERROR:",
          storageError
        );

        /*
          Storage xoá thất bại
          => không xoá DB record.
        */

        return;
      }

      console.log(
        "PREVIOUS EDIT FILE DELETED:",
        filePath
      );
    }

    /* ===================================================
       XOÁ DB
    =================================================== */

    const {
      error: deleteError,
    } = await supabase
      .from("edit_proofs")
      .delete()
      .eq(
        "id",
        previousEditProof.id
      );

    if (deleteError) {
      console.error(
        "DELETE PREVIOUS EDIT DB ERROR:",
        deleteError
      );

      return;
    }

    console.log(
      "PREVIOUS EDIT RECORD DELETED:",
      previousEditProof
    );

    return;
  }

  /* =====================================================
     3. NẾU VERSION TRƯỚC KHÔNG PHẢI EDIT
     
     Nghĩa là nó có thể là bản gốc trong proofs.

     Ví dụ lần edit đầu:
       proofs       v23
       edit_proofs  chưa có
       tạo          v24*

     previousVersion = 23

     => KHÔNG XOÁ v23
        vì v23 là bản gốc.
  ===================================================== */

  const {
    data: previousOriginal,
    error: originalFetchError,
  } = await supabase
    .from("proofs")
    .select(
      "id, version, file_path"
    )
    .eq("mssv", mssv)
    .eq("version", previousVersion)
    .maybeSingle();

  if (originalFetchError) {
    console.error(
      "FETCH PREVIOUS ORIGINAL ERROR:",
      originalFetchError
    );

    return;
  }

  if (previousOriginal) {
    console.log(
      "PREVIOUS VERSION IS ORIGINAL → KEEP:",
      previousOriginal
    );

    /*
      Tuyệt đối không xoá bản gốc.
    */

    return;
  }

  console.log(
    "NO PREVIOUS VERSION FOUND:",
    previousVersion
  );
}

  /* =======================================================
     CONFIRM
======================================================= */

  async function confirmEdit() {
    if (!student?.mssv) {
      alert("Không tìm thấy thông tin sinh viên.");
      return;
    }

    if (!proofData) {
      alert("Không có dữ liệu minh chứng.");
      return;
    }

    setSaving(true);

    let uploadedFilePath: string | null = null;
    let insertedEditProofId: number | null = null;

    try {
      const mssv = student.mssv;

      /* =====================================================
        1. LẤY PDF GỐC GẦN NHẤT
      ===================================================== */

      const {
        data: latestProof,
        error: latestProofError,
      } = await supabase
        .from("proofs")
        .select("id, version, file_path")
        .eq("mssv", mssv)
        .order("version", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (latestProofError) {
        console.error(
          "LATEST PROOF ERROR:",
          latestProofError
        );

        alert(
          "Không thể xác định phiên bản minh chứng gốc."
        );

        return;
      }

      /* =====================================================
        2. LẤY PDF EDIT GẦN NHẤT
      ===================================================== */

      const {
        data: latestEditProof,
        error: latestEditError,
      } = await supabase
        .from("edit_proofs")
        .select(
          "id, version, base_version, file_path, status"
        )
        .eq("mssv", mssv)
        .order("version", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (latestEditError) {
        console.error(
          "LATEST EDIT PROOF ERROR:",
          latestEditError
        );

        alert(
          "Không thể xác định phiên bản chỉnh sửa."
        );

        return;
      }

      console.log(
        "LATEST ORIGINAL PROOF:",
        latestProof
      );

      console.log(
        "LATEST EDIT PROOF:",
        latestEditProof
      );

      /* =====================================================
        3. XÁC ĐỊNH PDF GẦN NHẤT
      ===================================================== */

      const latestOriginalVersion =
        latestProof?.version ?? 0;

      const latestEditedVersion =
        latestEditProof?.version ?? 0;

      /*
        Nếu edit_proofs có version lớn hơn proofs
        => PDF gần nhất là PDF EDIT.

        Nếu không
        => PDF gần nhất là PDF GỐC.
      */

      const latestIsEdited =
        latestEditedVersion >
        latestOriginalVersion;

      let baseVersion: number;
      let newVersion: number;
      let protectedPath: string | null = null;

      if (latestIsEdited) {
        /*
          ================================================
          TRƯỜNG HỢP 1:
          PDF GẦN NHẤT ĐÃ LÀ EDIT

          Ví dụ:
            proofs       v23
            edit_proofs  v24*

          => tạo v25*
        ================================================
        */

        baseVersion =
          latestEditedVersion;

        newVersion =
          latestEditedVersion + 1;

        console.log(
          "LATEST PDF IS EDITED"
        );

        console.log(
          "BASE VERSION:",
          baseVersion
        );

        console.log(
          "NEW VERSION:",
          newVersion
        );
      } else {
        /*
          ================================================
          TRƯỜNG HỢP 2:
          PDF GẦN NHẤT LÀ BẢN GỐC

          Ví dụ:
            proofs v23
            edit_proofs chưa có

          => bảo vệ v23
          => tạo v24*
        ================================================
        */

        if (!latestProof) {
          alert(
            "Không tìm thấy hồ sơ minh chứng gốc."
          );

          return;
        }

        baseVersion =
          latestOriginalVersion;

        newVersion =
          baseVersion + 1;

        console.log(
          "LATEST PDF IS ORIGINAL"
        );

        console.log(
          "BASE VERSION:",
          baseVersion
        );

        console.log(
          "NEW VERSION:",
          newVersion
        );
      }

      /* =====================================================
        4. TẠO PDF
      ===================================================== */

      const pdfBlob =
        await createProofPDF(
          student,
          proofData
        );

      console.log(
        "EDIT PDF SIZE:",
        pdfBlob.size,
        `(${(
          pdfBlob.size /
          1024 /
          1024
        ).toFixed(2)} MB)`
      );

      /* =====================================================
        5. TÊN FILE
      ===================================================== */

      function removeVietnameseDiacritics(
        text: string
      ): string {
        return text
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D");
      }

      const safeFullName =
        removeVietnameseDiacritics(
          student.full_name
        )
          .trim()
          .replace(/\s+/g, "-");

      /*
        PDF EDIT luôn có dấu *
      */

      const editFileName =
        `${mssv}-${safeFullName}-proof-v${newVersion}*.pdf`;

      const newFilePath =
        `${mssv}/${editFileName}`;

      console.log(
        "EDIT PDF PATH:",
        newFilePath
      );

      /* =====================================================
        6. BẢO VỆ BẢN GỐC
        
        CHỈ LÀM KHI LATEST KHÔNG PHẢI EDIT.
      ===================================================== */

      if (!latestIsEdited) {
        const originalPath =
          latestProof?.file_path;

        if (!originalPath) {
          alert(
            "Không tìm thấy file PDF gốc."
          );

          return;
        }

        /*
          Ví dụ:

          original:
          3123150146/...-proof-v23.pdf

          protected:
          3123150146/...-proof-v23-original.pdf
        */

        protectedPath =
          originalPath.replace(
            /\.pdf$/i,
            "-original.pdf"
          );

        console.log(
          "PROTECT ORIGINAL:",
          {
            originalPath,
            protectedPath,
          }
        );

        /*
          Kiểm tra protected file đã tồn tại chưa.
          Nếu đã tồn tại thì không copy lại.
        */

        if (!protectedPath) {
          console.error("PROTECTED PATH IS NULL");
          alert("Không tìm thấy đường dẫn file bản gốc.");
          return;
        }

        const {
          data: existingProtectedFile,
          error: protectedCheckError,
        } = await supabase.storage
          .from("proofs")
          .list(mssv, {
            search:
              protectedPath
                .split("/")
                .pop() ?? "",
          });

        if (protectedCheckError) {
          console.error(
            "CHECK PROTECTED FILE ERROR:",
            protectedCheckError
          );

          alert(
            "Không thể kiểm tra bản gốc được bảo vệ."
          );

          return;
        }

        const protectedFileName =
          protectedPath
            .split("/")
            .pop();

        const protectedExists =
          existingProtectedFile?.some(
            (file) =>
              file.name ===
              protectedFileName
          );

        if (!protectedExists) {
          const {
            error: copyError,
          } = await supabase.storage
            .from("proofs")
            .copy(
              originalPath,
              protectedPath
            );

          if (copyError) {
            console.error(
              "PROTECT ORIGINAL ERROR:",
              copyError
            );

            /*
              Nếu trong lúc kiểm tra/copy,
              file đã được tạo bởi request khác
              thì không coi đó là lỗi nghiêm trọng.
            */

            if (
              !copyError.message
                ?.toLowerCase()
                .includes(
                  "already exists"
                )
            ) {
              alert(
                "Không thể bảo vệ file minh chứng gốc."
              );

              return;
            }
          }

          console.log(
            "ORIGINAL PROTECTED:",
            protectedPath
          );
        } else {
          console.log(
            "PROTECTED ORIGINAL ALREADY EXISTS:",
            protectedPath
          );
        }
      } else {
        console.log(
          "LATEST IS EDITED → KHÔNG PROTECT LẠI"
        );
      }

      /* =====================================================
        7. UPLOAD PDF EDIT
      ===================================================== */

      const {
        error: uploadError,
      } = await supabase.storage
        .from("proofs")
        .upload(
          newFilePath,
          pdfBlob,
          {
            contentType:
              "application/pdf",
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "EDIT PROOF UPLOAD ERROR:",
          uploadError
        );

        /*
          Nếu upload bị "already exists",
          nghĩa là file version này đã tồn tại.
        */

        if (
          uploadError.message
            ?.toLowerCase()
            .includes(
              "already exists"
            )
        ) {
          alert(
            `File minh chứng v${newVersion}* đã tồn tại. Vui lòng tải lại trang và thử lại.`
          );
        } else {
          alert(
            "Không thể tải PDF lên hệ thống."
          );
        }

        return;
      }

      uploadedFilePath =
        newFilePath;

      console.log(
        "EDIT PDF UPLOADED:",
        uploadedFilePath
      );

      /* =====================================================
        8. INSERT edit_proofs
      ===================================================== */

      const {
        data: insertedEditProof,
        error: insertError,
      } = await supabase
        .from("edit_proofs")
        .insert({
          mssv,
          version: newVersion,
          base_version: baseVersion,
          file_path: newFilePath,
          status: "submitted",
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "EDIT PROOF DB ERROR:",
          insertError
        );

        /*
          DB insert fail:
          xoá PDF vừa upload.
        */

        await supabase.storage
          .from("proofs")
          .remove([
            newFilePath,
          ]);

        /*
          Xử lý duplicate version.
        */

        if (
          insertError.code ===
          "23505"
        ) {
          alert(
            `Phiên bản v${newVersion}* đã tồn tại trong hệ thống. Vui lòng tải lại trang và thử lại.`
          );
        } else {
          alert(
            "Không thể lưu hồ sơ chỉnh sửa."
          );
        }

        return;
      }

      insertedEditProofId =
        insertedEditProof.id;

      console.log(
        "EDIT PROOF CREATED:",
        insertedEditProof
      );

      /* =====================================================
        9. XOÁ REVIEW DATA
      ===================================================== */

      await deleteEditProofData(
        `${EDIT_REVIEW_PREFIX}${mssv}`
      );

      /* =====================================================
        10. CLEANUP VERSION TRƯỚC
        
        Ví dụ:
          tạo v25*
          => xoá v24*
        
        Nhưng nếu v24 là bản gốc
        và đã được protected
        => KHÔNG XOÁ.
      ===================================================== */

      await cleanupPreviousEditProof(
        mssv,
        newVersion,
        protectedPath
      );

      /* =====================================================
        11. DOWNLOAD PDF
      ===================================================== */

      const downloadUrl =
        URL.createObjectURL(
          pdfBlob
        );

      const downloadLink =
        document.createElement("a");

      downloadLink.href =
        downloadUrl;

      downloadLink.download =
        `${mssv}-${student.full_name}-proof-v${newVersion}*.pdf`;

      document.body.appendChild(
        downloadLink
      );

      downloadLink.click();

      document.body.removeChild(
        downloadLink
      );

      URL.revokeObjectURL(
        downloadUrl
      );

      /* =====================================================
        12. HOÀN TẤT
      ===================================================== */

      alert(
        `Đã gửi hồ sơ bổ sung minh chứng v${newVersion}*.`
      );

      router.replace(
        "/dashboard"
      );
    } catch (error) {
      console.error(
        "CONFIRM EDIT PROOF ERROR:",
        error
      );

      /*
        Rollback file edit nếu đã upload
        nhưng xảy ra lỗi sau đó.
      */

      if (uploadedFilePath) {
        await supabase.storage
          .from("proofs")
          .remove([
            uploadedFilePath,
          ]);
      }

      /*
        Rollback DB edit_proofs nếu đã insert.
      */

      if (
        insertedEditProofId !== null
      ) {
        await supabase
          .from("edit_proofs")
          .delete()
          .eq(
            "id",
            insertedEditProofId
          );
      }

      alert(
        "Có lỗi xảy ra khi xác nhận hồ sơ. Vui lòng thử lại."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     BACK
  ======================================================== */

  function goBack() {
    router.push(
      "/dashboard/editproof"
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Xem xét minh chứng bổ sung
          </h1>

          <p className="mt-2 text-gray-600">
            Vui lòng kiểm tra lại toàn bộ
            minh chứng trước khi xác nhận.
          </p>
        </div>

        {/* STUDENT */}

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Thông tin sinh viên
          </h2>

          <div className="mt-4 space-y-2 text-gray-700">
            <p>
              <span className="font-medium">
                Họ tên:
              </span>{" "}
              {student?.full_name}
            </p>

            <p>
              <span className="font-medium">
                MSSV:
              </span>{" "}
              {student?.mssv}
            </p>
          </div>
        </div>

        {/* PREVIEW */}

        <div className="space-y-6">

          {categories.map(
            (category) => {
              const items =
                proofData[
                  category.key
                ];

              if (
                items.length === 0
              ) {
                return null;
              }

              return (
                <section
                  key={
                    category.key
                  }
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {
                      category.title
                    }
                  </h2>

                  <div className="mt-6 space-y-5">

                    {items.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                        >
                          <p className="font-medium text-gray-800">
                            Minh chứng{" "}
                            {index +
                              1}
                          </p>

                          {item.fileName && (
                            <p className="mt-2 text-sm text-gray-500">
                              {
                                item.fileName
                              }
                            </p>
                          )}

                          {item.image && (
                            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                              <img
                                src={
                                  item.image
                                }
                                alt="Minh chứng"
                                className="max-h-96 w-full object-contain"
                              />
                            </div>
                          )}

                          {item.description && (
                            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                              <p className="text-sm font-medium text-gray-700">
                                Mô tả
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                                {
                                  item.description
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    )}

                  </div>
                </section>
              );
            }
          )}

        </div>

        {/* BUTTONS */}

        <div className="mt-8 flex items-center justify-between">

          <button
            type="button"
            onClick={
              goBack
            }
            disabled={saving}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            ← Chỉnh sửa lại
          </button>

          <button
            type="button"
            onClick={
              confirmEdit
            }
            disabled={saving}
            className="cursor-pointer rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Đang xác nhận..."
              : "Xác nhận"}
          </button>

        </div>

      </div>
    </main>
  );
}