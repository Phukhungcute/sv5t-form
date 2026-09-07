"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase";
import {
    FACULTY_NAME,
    FACULTY_NAME_NORMAL,
    ACADEMIC_YEAR,
    isSubmissionPeriod,
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

type ProofData = Record<CategoryKey, ProofItem[]>;

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
    title: "1. Tiêu chuẩn “Đạo đức tốt”",
  },
  {
    key: "study",
    title: "2. Tiêu chuẩn “Học tập tốt”",
  },
  {
    key: "physical",
    title: "3. Tiêu chuẩn “Thể lực tốt”",
  },
  {
    key: "volunteer",
    title: "4. Tiêu chuẩn “Tình nguyện tốt”",
  },
  {
    key: "integration",
    title: "5. Tiêu chuẩn “Hội nhập tốt”",
  },
  {
    key: "priority",
    title: "6. Tiêu chuẩn ưu tiên",
  },
];

const REVIEW_PREFIX =
  "sv5t_proof_review_";

const DB_NAME = "sv5t-proof-db";
const STORE_NAME = "drafts";

function openProofDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      1
    );

    request.onupgradeneeded = () => {
      const db = request.result;

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

    request.onsuccess = () =>
      resolve(request.result);

    request.onerror = () =>
      reject(request.error);
  });
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

async function loadProofData(
  key: string
): Promise<ProofData | null> {
  const db = await openProofDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const request =
        transaction
          .objectStore(STORE_NAME)
          .get(key);

      request.onsuccess = () => {
        db.close();

        resolve(
          request.result ?? null
        );
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    }
  );
}

async function deleteProofData(
  key: string
) {
  const db = await openProofDB();

  return new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(STORE_NAME)
        .delete(key);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(
          transaction.error
        );
      };
    }
  );
}

/* =========================================================
   DATA URL → IMAGE DIMENSIONS
========================================================= */

function loadImage(
  src: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const img =
        new Image();

      img.onload = () =>
        resolve(img);

      img.onerror = () =>
        reject(
          new Error(
            "Không thể tải ảnh"
          )
        );

      img.src = src;
    }
  );
}

/* =========================================================
   FORMAT ẢNH PNG/JPG
========================================================= */

function getImageFormat(
  dataUrl: string
): "JPEG" | "PNG" {
  if (dataUrl.startsWith("data:image/png")) {
    return "PNG";
  }

  return "JPEG";
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

/* =========================================================
   PAGE
========================================================= */

export default function ProofReviewPage() {
  const router = useRouter();

  useEffect(() => {
  initializeStudentPage(router, "submission");
}, [router]);
  
  const [student, setStudent] =
    useState<Student | null>(null);

  const [proofData, setProofData] =
    useState<ProofData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    async function loadData() {
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

        if (
          profileError ||
          !profile
        ) {
          router.push("/");
          return;
        }

        if (
          profile.role !==
          "student"
        ) {
          router.push("/admin");
          return;
        }

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

        if (
          studentError ||
          !studentData
        ) {
          console.error(
            "STUDENT ERROR:",
            studentError
          );
          return;
        }

        setStudent(
          studentData
        );

        const key =
          `${REVIEW_PREFIX}${studentData.mssv}`;

        /*
          Ưu tiên review data trong
          localStorage.
        */

        const local =
          localStorage.getItem(
            key
          );

        if (local) {
          setProofData(
            JSON.parse(local)
          );
          return;
        }

        /*
          Fallback sang IndexedDB.
        */

        const saved =
          await loadProofData(
            key
          );

        if (saved) {
          setProofData(saved);
        }
      } catch (error) {
        console.error(
          "PROOF REVIEW LOAD ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  /* =======================================================
     CONFIRM
  ======================================================= */

 async function handleConfirm() {
  if (!student?.mssv) {
    alert("Không tìm thấy thông tin sinh viên.");
    return;
  }

  setLoading(true);

  let insertedProofId: number | null = null;
  let uploadedFilePath: string | null = null;

  try {
    /* =====================================================
       1. LẤY VERSION MỚI NHẤT
    ===================================================== */

    const {
      data: latestProof,
      error: latestError,
    } = await supabase
      .from("proofs")
      .select("id, version")
      .eq("mssv", student.mssv)
      .order("version", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error(
        "LATEST PROOF ERROR:",
        latestError
      );

      alert(
        "Không thể xác định phiên bản minh chứng."
      );

      return;
    }

    const nextVersion =
      latestProof
        ? latestProof.version + 1
        : 1;

    console.log(
      "LATEST PROOF:",
      latestProof
    );

    console.log(
      "NEXT PROOF VERSION:",
      nextVersion
    );

    /* =====================================================
       2. TẠO PDF
    ===================================================== */

    if (!proofData) {
      alert("Không có dữ liệu minh chứng.");
      return;
    }

    const pdfBlob =
      await createProofPDF(
        student,
        proofData
      );

    console.log(
      "PDF SIZE:",
      pdfBlob.size,
      `(${(
        pdfBlob.size /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );

    /* =====================================================
       3. XÁC ĐỊNH PATH
    ===================================================== */

    function removeVietnameseDiacritics(
      text: string
    ): string {
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    }

    const safeFullName =
  removeVietnameseDiacritics(
    student.full_name
  )
    .trim()
    .replace(/\s+/g, "-");

const fileName =
  `${student.mssv}-${safeFullName}-proof-v${nextVersion}.pdf`;

const filePath =
  `${student.mssv}/${fileName}`;

    console.log(
      "PDF PATH:",
      filePath
    );

    /* =====================================================
       4. INSERT DATABASE
    ===================================================== */

    const {
      data: insertedProof,
      error: insertError,
    } = await supabase
      .from("proofs")
      .insert({
        mssv: student.mssv,
        version: nextVersion,
        file_path: filePath,
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "PROOF INSERT ERROR:",
        insertError
      );

      if (
        insertError.code === "23505"
      ) {
        alert(
          "Phiên bản minh chứng vừa bị trùng. Vui lòng tải lại trang và thử lại."
        );
      } else {
        alert(
          "Không thể lưu minh chứng. Vui lòng thử lại."
        );
      }

      return;
    }

    insertedProofId =
      insertedProof.id;

    console.log(
      "PROOF CREATED:",
      insertedProof
    );

    /* =====================================================
       5. UPLOAD PDF
    ===================================================== */

    const {
      error: uploadError,
    } = await supabase.storage
      .from("proofs")
      .upload(
        filePath,
        pdfBlob,
        {
          contentType:
            "application/pdf",
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(
        "PDF UPLOAD ERROR:",
        uploadError
      );

      /*
        Upload thất bại:
        xóa record proofs vừa tạo.
      */

      await supabase
        .from("proofs")
        .delete()
        .eq(
          "id",
          insertedProofId
        );

      alert(
        "Không thể tải file PDF lên hệ thống. Vui lòng thử lại."
      );

      return;
    }

    uploadedFilePath =
      filePath;

    console.log(
      "PDF UPLOADED:",
      uploadedFilePath
    );

    /* =====================================================
   DOWNLOAD PDF VỀ MÁY SINH VIÊN
===================================================== */

    const downloadUrl =
      URL.createObjectURL(pdfBlob);

    const downloadLink =
      document.createElement("a");

    downloadLink.href =
      downloadUrl;

    downloadLink.download =
      `${student.mssv}-${student.full_name}-proof-v${nextVersion}.pdf`;

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
       6. XÓA REVIEW DRAFT
    ===================================================== */

    const reviewKey =
      `${REVIEW_PREFIX}${student.mssv}`;

    await deleteProofData(
      reviewKey
    );

    /* =====================================================
       7. THÀNH CÔNG + XOÁ MINH CHỨNG CŨ
    ===================================================== */
    
    await cleanupOldProofs(
      student.mssv,
      nextVersion
    );

    alert(
      `Gửi minh chứng thành công! Phiên bản ${nextVersion}.`
    );

    router.push(
      "/dashboard"
    );
  } catch (error) {
    console.error(
      "PROOF FINISH ERROR:",
      error
    );

    /*
      Nếu DB đã insert nhưng có lỗi bất ngờ,
      rollback record.
    */

    if (
      insertedProofId !== null
    ) {
      await supabase
        .from("proofs")
        .delete()
        .eq(
          "id",
          insertedProofId
        );
    }

    /*
      Nếu PDF đã upload mà sau đó có lỗi,
      cố gắng xóa PDF để tránh file mồ côi.
    */

    if (
      uploadedFilePath
    ) {
      await supabase.storage
        .from("proofs")
        .remove([
          uploadedFilePath,
        ]);
    }

    alert(
      "Có lỗi xảy ra khi gửi minh chứng. Vui lòng thử lại."
    );
  } finally {
    setLoading(false);
  }
}

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading ||
    !proofData ||
    !student
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải minh chứng...
        </p>
      </main>
    );
  }

  const PROOF_BUCKET = "proofs";

async function cleanupOldProofs(
  mssv: string,
  latestVersion: number
) {
  const deleteBeforeVersion =
    latestVersion - 2;

  if (deleteBeforeVersion < 1) {
    return;
  }

  console.log(
    "CLEANUP OLD PROOFS:",
    {
      mssv,
      latestVersion,
      deleteBeforeVersion,
    }
  );

  // ==========================================
  // 1. LẤY PROOF CŨ
  // ==========================================

  const {
    data: oldProofs,
    error: fetchError,
  } = await supabase
    .from("proofs")
    .select("id, file_path, version")
    .eq("mssv", mssv)
    .lte("version", deleteBeforeVersion);

  if (fetchError) {
    console.error(
      "FETCH OLD PROOFS ERROR:",
      fetchError
    );
    return;
  }

  console.log(
    "OLD PROOFS:",
    oldProofs
  );

  if (!oldProofs || oldProofs.length === 0) {
    return;
  }

  // ==========================================
  // 2. XÓA FILE TRONG STORAGE
  // ==========================================

  const filePaths = oldProofs
    .map((proof) => proof.file_path)
    .filter(
      (path): path is string =>
        Boolean(path)
    );

  console.log(
    "FILES TO DELETE:",
    filePaths
  );

  if (filePaths.length > 0) {
    const {
      data: removedFiles,
      error: storageError,
    } = await supabase.storage
      .from("proofs")
      .remove(filePaths);

    console.log(
      "REMOVED FILES:",
      removedFiles
    );

    console.log(
      "STORAGE DELETE ERROR:",
      storageError
    );

    if (storageError) {
      console.error(
        "DELETE OLD PROOF FILES ERROR:",
        storageError
      );

      // Không xóa DB nếu Storage chưa xóa được
      return;
    }
  }

  // ==========================================
  // 3. XÓA RECORD TRONG DATABASE
  // ==========================================

  const {
    error: deleteError,
  } = await supabase
    .from("proofs")
    .delete()
    .eq("mssv", mssv)
    .lte(
      "version",
      deleteBeforeVersion
    );

  if (deleteError) {
    console.error(
      "DELETE OLD PROOF RECORDS ERROR:",
      deleteError
    );

    return;
  }

  console.log(
    "OLD PROOFS CLEANED SUCCESSFULLY"
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
              Xem lại minh chứng
            </h1>

            <p className="mt-2 text-gray-600">
              Kiểm tra lại toàn bộ minh chứng
              trước khi xác nhận.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/proof"
              )
            }
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← Chỉnh sửa
          </button>

        </div>

        {/* THANH DUNG LƯỢNG */}

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Tổng dung lượng minh chứng
            </span>

            <span className="font-semibold text-gray-700">
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
            Mỗi ảnh tối đa 15 MB · Tổng tối đa 1000 MB
          </p>
        </div>

        {/* STUDENT */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Thông tin sinh viên
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <div>
              <p className="text-sm text-gray-500">
                Họ và tên
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {student.full_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Mã số sinh viên
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {student.mssv}
              </p>
            </div>

          </div>

        </section>

        {/* CATEGORIES */}

        {categories.map(
          (category) => {
            const items =
              proofData[
                category.key
              ];

            return (
              <section
                key={category.key}
                className="mb-6 rounded-2xl bg-white p-6 shadow-sm"
              >

                <h2 className="mb-5 text-xl font-semibold text-gray-900">
                  {category.title}
                </h2>

                {items.length ===
                0 ? (
                  <p className="text-gray-400">
                    Không có minh chứng.
                  </p>
                ) : (
                  <div className="space-y-6">

                    {items.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-gray-200 p-5"
                        >

                          <h3 className="font-medium text-gray-800">
                            Minh chứng{" "}
                            {index +
                              1}
                          </h3>

                          {/* IMAGE */}

                          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">

                            <img
                              src={
                                item.image
                              }
                              alt={`Minh chứng ${
                                index +
                                1
                              }`}
                              className="max-h-[600px] w-full object-contain"
                            />

                          </div>

                          {/* DESCRIPTION */}

                          {item.description && (
                            <div className="mt-4">

                              <p className="text-sm text-gray-500">
                                Mô tả
                              </p>

                              <p className="mt-1 whitespace-pre-wrap break-words font-medium text-gray-900">
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
                )}

              </section>
            );
          }
        )}

        {/* CONFIRM */}

        <section className="mb-8 rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

          <h2 className="text-lg font-semibold text-gray-900">
            Xác nhận minh chứng
          </h2>

          <p className="mt-2 leading-6 text-gray-700">
            Tôi xác nhận rằng các minh chứng
            trên là chính xác và chịu trách
            nhiệm về nội dung đã cung cấp.
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="mt-6 w-full cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Đang tạo và gửi PDF..."
              : "✓ Xác nhận và gửi minh chứng"}
          </button>

        </section>

      </div>
    </main>
  );
}