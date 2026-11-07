// Test page result
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FACULTY_NAME_NORMAL,
  ACADEMIC_YEAR,
} from "@/lib/constants";
import { Success } from "@/lib/success-notification";

type Student = {
  mssv: string;
  full_name: string;
  class_name: string;
};

type Submission = {
  id: number;
  status: "passed" | "failed" | "consider" | null;
  version: number;
  is_edit: number;
  participation: boolean | null;
  is_representative: boolean;
  is_university_level: boolean;
};

export default function ResultPage() {
  const router = useRouter();

  const [student, setStudent] =
    useState<Student | null>(null);

  const displayName =
    student?.full_name ?? "[user]";

  const [submission, setSubmission] =
    useState<Submission | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [participationChoice, setParticipationChoice] =
    useState<boolean | null>(null);

  const [participationSaving, setParticipationSaving] =
    useState(false);

  const [awardPhotoUrl, setAwardPhotoUrl] =
  useState<string | null>(null);

  const [awardPhotoLoading, setAwardPhotoLoading] =
    useState(false);

  const [awardPhotoUploading, setAwardPhotoUploading] =
    useState(false);

  async function loadAwardPhoto(mssv: string) {
  setAwardPhotoLoading(true);

  try {
    const { data, error } = await supabase
      .from("student_award_photos")
      .select("file_path")
      .eq("mssv", mssv)
      .maybeSingle();

    if (error) throw error;

    if (!data?.file_path) {
      setAwardPhotoUrl(null);
      return;
    }

    const { data: signedData, error: signedError } =
      await supabase.storage
        .from("student-awards")
        .createSignedUrl(data.file_path, 60 * 60);

    if (signedError) throw signedError;

    setAwardPhotoUrl(signedData.signedUrl);
  } catch (error) {
    console.error("LOAD AWARD PHOTO ERROR:", error);
    setAwardPhotoUrl(null);
  } finally {
    setAwardPhotoLoading(false);
  }
}

  useEffect(() => {
    async function loadResult() {
      try {
        /* ==========================================
           1. LẤY USER
        ========================================== */

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/");
          return;
        }

        /* ==========================================
           2. LẤY PROFILE
        ========================================== */

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
          return;
        }

        if (profile.role !== "student") {
          router.replace("/admin");
          return;
        }

        /* ==========================================
           3. LẤY THÔNG TIN SINH VIÊN
        ========================================== */

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

        setStudent(studentData);

        await loadAwardPhoto(studentData.mssv);

        /* ==========================================
           4. LẤY SUBMISSION MỚI NHẤT
        ========================================== */

        const {
          data: latestSubmission,
          error: submissionError,
        } = await supabase
          .from("submissions")
          .select(
            "id, status, version, is_edit, participation, is_representative, is_university_level"
          )
          .eq("mssv", profile.mssv)
          .order("version", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (submissionError) {
          console.error(
            "SUBMISSION ERROR:",
            submissionError
          );
          return;
        }

        if (latestSubmission) {
          const submissionData =
            latestSubmission as Submission;

          setSubmission(submissionData);

          // Nếu trước đó đã xác nhận thì hiển thị
          // lựa chọn cũ.
          setParticipationChoice(
            submissionData.participation
          );
        } else {
          setSubmission(null);
        }
      } catch (error) {
        console.error(
          "RESULT LOAD ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [router]);

  /* ==========================================
     XÁC NHẬN THAM GIA LỄ TUYÊN DƯƠNG
  ========================================== */

  async function handleParticipationConfirm() {
  if (participationChoice === null) {
    alert("Vui lòng chọn Được hoặc Không.");
    return;
  }

  if (!submission?.id) {
    console.error("Không tìm thấy submission.id:", submission);
    alert("Không tìm thấy hồ sơ cần cập nhật.");
    return;
  }

  setParticipationSaving(true);

  try {
    console.log("Đang cập nhật participation:", {
      submissionId: submission.id,
      participationChoice,
    });

    const { data, error } = await supabase
      .from("submissions")
      .update({
        participation: participationChoice,
      })
      .eq("id", submission.id)
      .select("id, mssv, version, participation");

    if (error) {
      console.error("PARTICIPATION UPDATE ERROR:", error);

      alert(`Không thể lưu lựa chọn: ${error.message}`);
      return;
    }

    console.log("Bản ghi được cập nhật:", data);

    if (!data || data.length === 0) {
      console.error(
        "Không có bản ghi nào được cập nhật. Kiểm tra ID và quyền RLS.",
        {
          submissionId: submission.id,
          participationChoice,
        }
      );

      alert(
        "Không tìm thấy bản ghi để cập nhật hoặc bạn không có quyền cập nhật bản ghi này."
      );

      return;
    }

    const updatedSubmission = data[0];

    setSubmission((current) =>
      current
        ? {
            ...current,
            participation: updatedSubmission.participation,
          }
        : current
    );

    Success(
      updatedSubmission.participation
        ? "Đã xác nhận tham gia lễ tuyên dương!"
        : "Đã xác nhận không tham gia lễ tuyên dương!"
    );
  } catch (error) {
    console.error("PARTICIPATION CONFIRM ERROR:", error);

    alert("Đã xảy ra lỗi. Vui lòng thử lại.");
  } finally {
    setParticipationSaving(false);
  }
}

  /* ==========================================
     Up ảnh tuyên dương
  ========================================== */

  async function handleAwardPhotoUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    // Cho phép chọn lại cùng một file sau đó.
    event.target.value = "";

    if (!file || !student) return;

    const allowedTypes = ["image/jpeg"];
    const maxSize = 4 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      alert("Vui lòng chọn ảnh JPG.");
      return;
    }

    if (file.size > maxSize) {
      alert("Ảnh không được vượt quá 4 MB.");
      return;
    }

    setAwardPhotoUploading(true);

    try {
      const filePath = `${student.mssv}/celebration`;

      const { error: uploadError } = await supabase.storage
        .from("student-awards")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "0",
        });

      if (uploadError) throw uploadError;

      const { error: saveError } = await supabase
        .from("student_award_photos")
        .upsert(
          {
            mssv: student.mssv,
            file_path: filePath,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "mssv" }
        );

      if (saveError) throw saveError;

      await loadAwardPhoto(student.mssv);

      Success("Đã tải ảnh tuyên dương lên thành công!");
    } catch (error) {
      console.error("UPLOAD AWARD PHOTO ERROR:", error);
      alert("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setAwardPhotoUploading(false);
    }
  }

  /* ==========================================
     LOADING
  ========================================== */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Đang tải kết quả...
        </p>
      </main>
    );
  }

  /* ==========================================
     CHƯA CÓ HỒ SƠ
  ========================================== */

  if (!student || !submission) {
    return (
      <main className="min-h-screen bg-gray-100 px-4 py-10">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

            <h1 className="text-2xl font-bold text-gray-900">
              KẾT QUẢ XÉT DUYỆT HỒ SƠ
            </h1>

            <p className="mt-4 text-gray-500">
              Bạn chưa có hồ sơ được gửi lên hệ thống.
            </p>

            <div className="mt-4 flex items-center justify-center">

            <div className="menu-btn-wrapper menu-btn-wrapper-footer">

              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard")
                }
                className="menu-btn menu-btn-blue"
              >
                Quay lại trang chủ
              </button>

            </div>

          </div>

          </div>

        </div>
      </main>
    );
  }

  /* ==========================================
     XÁC ĐỊNH TRẠNG THÁI
  ========================================== */

  const status = submission.status;

  let statusText = "ĐÃ NỘP";
  let statusClass =
    "bg-blue-300 text-blue-700";
  let statusBackground =
    "bg-white";

  if (status === "passed") {
    statusText = "ĐẠT";
    statusClass =
      "bg-green-300 text-green-700";
    statusBackground =
      "bg-green-100";
  }

  if (status === "failed") {
    statusText = "KHÔNG ĐẠT";
    statusClass =
      "bg-red-300 text-red-700";
    statusBackground =
      "bg-red-100";
  }

  if (status === "consider") {
    statusText = "XEM XÉT";
    statusClass =
      "bg-yellow-300 text-yellow-700";
    statusBackground =
      "bg-yellow-100";
  }

  /* ==========================================
     MESSAGE
  ========================================== */

  function renderMessage() {
    if (status === "passed") {
      return (
        <>
          <p>
            Chào{" "}
            <strong>
              {displayName}
            </strong>{" "},
          </p>

          <p className="mt-3">
            Sau quá trình xét duyệt khách quan và đối chiếu các tiêu chí 
            theo quy định, chúng mình vui mừng thông báo rằng bạn đã 
            xuất sắc đạt Danh hiệu <strong>“Sinh viên 5 tốt{submission?.is_representative ? " Tiêu biểu" : ""}” khoa 
            Giáo dục Tiểu học năm học {ACADEMIC_YEAR}</strong>.
          </p>

          <p className="mt-3">
            Danh hiệu này là kết quả của sự cố gắng, tinh thần rèn luyện 
            và thái độ nghiêm túc trong học tập, hoạt động phong trào 
            cũng như sự phát triển bản thân của bạn. Hy vọng đây sẽ 
            là động lực để bạn tiếp tục duy trì, phát huy và lan tỏa 
            những giá trị tốt đẹp trong thời gian tới.
          </p>

          {status === "passed" && submission?.is_university_level && (
            <div>
              <p className="mt-3">
                Bên cạnh đó, sau khi xem xét hồ sơ, chúng mình nhận thấy 
                bạn đã có nhiều tiêu chí đáp ứng danh hiệu <strong>“Sinh viên 5 Tốt” 
                cấp trường</strong>. Vì vậy, chúng mình khuyến khích bạn tiếp tục hoàn 
                thiện hồ sơ theo các biểu mẫu đính kèm và gửi về email 
                hsv.gdth@sgu.edu.vn với tiêu đề “HỒ SƠ XÉT SV5T CẤP TRƯỜNG” 
                trước ngày 22/11/2026 (Chủ nhật). Chúng mình sẽ hỗ trợ rà soát, 
                góp ý và hoàn thiện hồ sơ trước khi gửi về Hội Sinh viên trường nhé!
              </p>
              <p className="mt-3">
                Mẫu hồ sơ: 
                <a
                  href="https://drive.google.com/drive/folders/1n_5saaoSihneFnJlbKhxrrDbQsUtv6hl?usp=sharing"
                  className="ml-2 text-blue-600 underline hover:text-blue-800"
                >
                  Xem tại đây
                </a>
              </p>
              <p className="mt-3">
                Tham gia vào nhóm Zalo hỗ trợ để nhận thông báo nhanh nhất: 
                <a
                  href="https://zalo.me/g/lumd16zyu8tgktd7hxpq"
                  className="ml-2 text-blue-600 underline hover:text-blue-800"
                >
                  Ấn vào đây
                </a>
              </p>
              <p className="mt-3">
                Hy vọng với những nỗ lực và sự cố gắng của mình, bạn sẽ tiếp tục 
                chinh phục thành công danh hiệu “Sinh viên 5 Tốt” trường Đại học 
                Sài Gòn năm 2026. Chúc bạn thật nhiều may mắn và sớm gặt hái được 
                thành quả xứng đáng nhé!
              </p>
            </div>
          )}
        </>
      );
    }

    if (status === "failed") {
      return (
        <>
          <p>
            Chào{" "}
            <strong>
              {displayName}
            </strong>{" "},
          </p>

          <p className="mt-3">
            Lời đầu tiên, Liên Chi hội Sinh viên khoa cùng với Câu lạc bộ 
            “Sinh viên 5 tốt” xin gửi lời cảm ơn chân thành đến bạn vì đã 
            dành sự quan tâm và tham gia gửi hồ sơ xét chọn danh hiệu 
            “Sinh viên 5 tốt” năm học {ACADEMIC_YEAR}. Chúng mình hiểu rằng 
            để hoàn thiện hồ sơ và đáp ứng các tiêu chí của danh hiệu, 
            bạn đã dành rất nhiều thời gian, nỗ lực và sự cố gắng trong 
            suốt quá trình rèn luyện và phát triển bản thân - và điều đó 
            thật sự rất đáng trân trọng.
          </p>

          <p className="mt-3">
            Tuy nhiên, sau quá trình rà soát và xét duyệt theo quy định, 
            chúng mình rất tiếc khi phải thông tin rằng bạn hiện vẫn chưa 
            đáp ứng đầy đủ các tiêu chí để đạt Danh hiệu “Sinh viên 5 tốt” 
            trong năm học này.
          </p>

          <p className="mt-3">
            Dù kết quả chưa như kỳ vọng, nhưng hành trình bạn theo đuổi danh 
            hiệu đã thể hiện sự chủ động, trách nhiệm và ý chí phấn đấu của 
            bản thân. Chúng mình tin rằng với tinh thần đó, bạn hoàn toàn có 
            thể chạm đến danh hiệu ý nghĩa này trong năm học tiếp theo. 
            Hẹn gặp bạn đợt xét chọn danh hiệu "Sinh viên 5 tốt" ở năm học tới!
          </p>

          <p className="mt-3">
            Nếu bạn có bất kỳ thắc mắc nào liên quan đến kết quả xét duyệt, 
            vui lòng phản hồi qua email <strong> hsv.gdth@sgu.edu.vn </strong>
            trước ngày <strong>16/11/2026</strong> để được hỗ trợ nhé!
          </p>
        </>
      );
    }

    if (status === "consider") {
      return (
        <>
          <p>
            Chào{" "}
            <strong>
              {displayName}
            </strong>
            ,
          </p>

          <p className="mt-3">
            Hồ sơ của bạn vẫn còn đang ở trạng thái
            xem xét. Vui lòng đợi kết quả chính thức.
          </p>
        </>
      );
    }

    return (
      <>
        <p>
          Hồ sơ của{" "}
          <strong>
            {displayName}
          </strong>{" "}
          đã được gửi thành công.
        </p>

        <p className="mt-3">
          Hiện hồ sơ đang chờ được xét duyệt.
          Vui lòng quay lại sau để kiểm tra
          kết quả.
        </p>
      </>
    );
  }

  /* ==========================================
     UI
  ========================================== */

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">

        <div
          className={`rounded-2xl ${statusBackground} p-8 shadow-sm`}
        >

          {/* TITLE */}

          <div className="text-center">

            <h1 className="text-2xl font-bold text-gray-900">
              KẾT QUẢ XÉT DUYỆT HỒ SƠ
            </h1>

            <div className="mt-5">
              <span
                className={`inline-flex rounded-full px-5 py-2 text-sm font-bold ${statusClass}`}
              >
                {statusText}
              </span>
            </div>

          </div>

          {/* STUDENT INFO */}

          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">

            <>
              <div className="hidden md:block">
              {/* Giao diện desktop */}
                <div className="flex justify-start gap-30">
                  {/* Họ và tên */}
                  <div className="w-40 shrink-0">
                    <p className="text-sm text-gray-500">
                      Họ và tên
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {student.full_name}
                    </p>
                  </div>

                  {/* Mã số sinh viên */}
                  <div className="w-40 shrink-0">
                    <p className="text-sm text-gray-500">
                      Mã số sinh viên
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {student.mssv}
                    </p>
                  </div>

                  {/* Lớp */}
                  <div className="w-32 shrink-0">
                    <p className="text-sm text-gray-500">
                      Lớp
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {student.class_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="block md:hidden">
                {/* Giao diện mobile */}
                <div className="flex flex-col gap-2 md:flex-row md:justify-start md:gap-32">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm text-gray-500 whitespace-nowrap">
                      Họ và tên:
                    </p>
                    <p className="font-semibold text-gray-900">
                      {student.full_name}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className="text-sm text-gray-500 whitespace-nowrap">
                      Mã số sinh viên:
                    </p>
                    <p className="font-semibold text-gray-900">
                      {student.mssv}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className="text-sm text-gray-500 whitespace-nowrap">
                      Lớp:
                    </p>
                    <p className="font-semibold text-gray-900">
                      {student.class_name}
                    </p>
                  </div>
                </div>

              </div>
            </>

            

          </div>

          {/* MESSAGE */}

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700">

            <h2 className="font-semibold text-gray-900">
              Thông báo
            </h2>

            <div className="mt-3 leading-7">
              {renderMessage()}
            </div>

          </div>

          {/* ==========================================
              THAM GIA LỄ TUYÊN DƯƠNG (CHỈ KHI ĐẠT)
          ========================================== */}

          {status === "passed" && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">

              <p className="font-semibold text-gray-900">
                Xác nhận tham gia được Lễ tuyên dương danh hiệu "Sinh viên 5 tốt" Năm học
                 {ACADEMIC_YEAR} khoa Giáo dục Tiểu học
              </p>

              <div className="mt-2 text-sm leading-6 text-gray-600">
                <p>
                  Thời gian dự kiến: 13h00 ngày 29/11/2026
                </p>
                <p>
                  Địa điểm dự kiến: Hội trường lầu 7 khu E, cơ sở chính trường Đại học Sài Gòn
                </p>
              </div>

              {/* OPTIONS */}

              <div className="mt-3 flex justify-evenly">

                {/* ĐƯỢC */}
                <button
                  type="button"
                  onClick={() => setParticipationChoice(true)}
                  disabled={participationSaving}
                  className={`
                    flex
                    w-auto
                    cursor-pointer
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-white
                    px-4
                    py-2.5
                    text-sm
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    active:translate-y-0.5
                    hover:shadow-md
                    ${
                      participationChoice === true
                        ? "border-2 border-green-500 text-green-700"
                        : "border border-gray-200 text-gray-700"
                    }
                    ${
                      participationSaving
                        ? "cursor-not-allowed opacity-70"
                        : ""
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-4
                      w-4
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      ${
                        participationChoice === true
                          ? "border-green-500"
                          : "border-gray-400"
                      }
                    `}
                  >
                    {participationChoice === true && (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </span>

                  Tham gia
                </button>


                {/* KHÔNG */}
                <button
                  type="button"
                  onClick={() => setParticipationChoice(false)}
                  disabled={participationSaving}
                  className={`
                    flex
                    w-auto
                    cursor-pointer
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-white
                    px-4
                    py-2.5
                    text-sm
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    active:translate-y-0.5
                    hover:shadow-md
                    ${
                      participationChoice === false
                        ? "border-2 border-red-500 text-red-700"
                        : "border border-gray-200 text-gray-700"
                    }
                    ${
                      participationSaving
                        ? "cursor-not-allowed opacity-70"
                        : ""
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-4
                      w-4
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      ${
                        participationChoice === false
                          ? "border-red-500"
                          : "border-gray-400"
                      }
                    `}
                  >
                    {participationChoice === false && (
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </span>

                  Không tham gia
                </button>

              </div>


              {/* XÁC NHẬN */}

              <div className="flex items-center justify-end">
                <div className="menu-btn-wrapper menu-btn-wrapper-footer">
                  <button
                    type="button"
                    onClick={handleParticipationConfirm}
                    disabled={
                      participationChoice === null ||
                      participationSaving
                    }
                    className={`
                      menu-btn
                      ${
                        participationChoice === null || participationSaving
                          ? "menu-btn-disabled"
                          : "menu-btn-blue"
                      }
                    `}
                  >
                    {participationSaving ? "Đang lưu..." : "Xác nhận"}
                  </button>
                </div>
              </div>


              {/* TRẠNG THÁI HIỆN TẠI */}

              {submission.participation !== null && (
                <p className="mt-3 text-right text-sm text-gray-500">
                  Lựa chọn hiện tại:{" "}
                  <strong>
                    {submission.participation
                      ? "Tham gia"
                      : "Không tham gia"}
                  </strong>
                </p>
              )}

            </div>
          )}

          {/* ==========================================
              ẢNH TUYÊN DƯƠNG (CHỈ KHI ĐẠT)
          ========================================== */}

          {status === "passed" && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
              <h2 className="font-semibold text-gray-900">
                Tải lên ảnh chân dung của bạn
              </h2>

              <div className="mt-2 text-sm leading-6 text-gray-600">
              <p>
                Ảnh được sử dụng để đăng tải trên các phương tiện truyền thông
                nhằm mục đích tuyên dương các gương "Sinh viên 5 tốt".
              </p>

              <p>
                Yêu cầu về ảnh:
              </p>
              <p>
                1/ Định dạng ảnh JPG, dung lượng không quá 4 MB.
              </p>
              <p>
                2/ Trang phục áo Hội Sinh viên Việt Nam/áo sơ mi trắng và quần hoặc váy đen dài qua gối.
              </p>
              <p>
                3/ Chụp rõ mặt, bố cục nửa người, không quá cận mặt.
              </p>
              <p>
                
              </p>
              </div>

              {/* Ô tải ảnh */}

              <div className="mt-4">
                <label
                  htmlFor="award-photo"
                  className={`
                    flex cursor-pointer flex-col items-center
                    justify-center rounded-xl border-2 border-dashed
                    border-blue-300 bg-white px-4 py-8 text-center
                    transition hover:border-blue-500 hover:bg-blue-50
                    ${
                      awardPhotoUploading
                        ? "pointer-events-none opacity-60"
                        : ""
                    }
                  `}
                >
                  <span className="text-3xl">📷</span>

                  <span className="mt-2 font-medium text-gray-800">
                    {awardPhotoUploading
                      ? "Đang tải ảnh lên..."
                      : awardPhotoUrl
                        ? "Chọn ảnh khác để thay thế ảnh hiện tại"
                        : "Nhấn để chọn ảnh tuyên dương"}
                  </span>

                  <span className="mt-1 text-sm text-gray-500">
                    JPG · Tối đa 4 MB
                  </span>

                  <input
                    id="award-photo"
                    type="file"
                    accept="image/jpeg,.jpg,.jpeg"
                    className="sr-only"
                    disabled={awardPhotoUploading}
                    onChange={handleAwardPhotoUpload}
                  />
                </label>
              </div>

              {/* Ảnh hiện tại */}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-800">
                  Ảnh hiện tại
                </h3>

                {awardPhotoLoading ? (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-8 text-center">
                    <p className="text-sm text-gray-500">
                      Đang tải ảnh...
                    </p>
                  </div>
                ) : awardPhotoUrl ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
                    <img
                      src={awardPhotoUrl}
                      alt="Ảnh tuyên dương hiện tại"
                      className="mx-auto max-h-[480px] w-full rounded-lg object-contain"
                    />

                    <p className="mt-3 text-center text-sm text-green-700">
                      Ảnh đã được lưu trên hệ thống.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-8 text-center">
                    <p className="text-sm text-gray-500">
                      Bạn chưa tải ảnh tuyên dương lên.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BACK */}

          <div className="mt-4 flex items-center justify-center">

            <div className="menu-btn-wrapper menu-btn-wrapper-footer">

              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard")
                }
                className="menu-btn menu-btn-blue"
              >
                Quay lại trang chủ
              </button>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}