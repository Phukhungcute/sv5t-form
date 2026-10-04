"use client";

import { useRouter } from "next/navigation";

export default function GuidePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-left">
        <div className="menu-btn-wrapper menu-btn-wrapper-header">
        <button
          onClick={() => router.push("/dashboard")}
          className="menu-btn menu-btn-white"
        >
          ← Quay về trang chủ
        </button>
        </div>
        </div>
        <section className="mt-4 rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Hướng dẫn sử dụng</h1>
          <p className="mt-2 text-gray-500">Hướng dẫn sử dụng hệ thống SV5T.</p>
          <div className="mt-8 rounded-xl border border-black bg-blue-100 p-6 text-3xl text-center text-black font-bold">
            TỔNG QUAN VỀ HỆ THỐNG NỘP HỒ SƠ SV5T.
              <h1 className="mt-4 text-xl font-normal text-left">
                SV5T Form là hệ thống hỗ trợ sinh viên đăng ký, hoàn thiện hồ sơ và theo dõi
                quá trình xét duyệt danh hiệu Sinh viên 5 tốt Khoa Giáo dục Tiểu học trường
                Đại học Sài Gòn.<br />
                Quy trình xét duyệt hồ sơ sẽ diễn ra như sau:<br />
                <div className="mt-4 mb-4 text-xl font-bold text-center">
                  SV gửi hồ sơ → LCHSV Khoa duyệt → SV bổ sung hồ sơ (nếu có) → LCHSV Khoa duyệt lại<br />
                  → LCHSV Khoa công bố kết quả
                </div>
                Sau đây là các hướng dẫn cơ bản giúp bạn làm quen với hệ thống:
              </h1>
          </div>

          <div className="mt-4 rounded-xl border border-black bg-green-100 p-6 text-2xl text-left text-black font-bold">
            1/ Trang chủ:
              <h1 className="mt-2 text-xl font-normal text-left">
                Trang chủ là giao diện tương tác chính của sinh viên, bao gồm các mục:<br />
                - Thông tin cá nhân cơ bản<br />
                - Danh mục hồ sơ (truy cập trong thời gian quy định):<br />
                  <div className="ml-8">
                    + Gửi hồ sơ<br />
                    + Tạo minh chứng<br />
                    + Yêu cầu chỉnh sửa<br />
                    + Chỉnh sửa hồ sơ<br />
                    + Bổ sung minh chứng<br />
                    + Xem kết quả<br />
                  </div>   
                - Danh mục hỗ trợ:
                  <div className="ml-8">
                    + Câu hỏi thường gặp<br />
                    + Hướng dẫn sử dụng<br />
                    + Quy định xét duyệt hồ sơ<br />
                  </div>
              </h1>
          </div>

          <div className="mt-4 rounded-xl border border-black bg-yellow-100 p-6 text-2xl text-left text-black font-bold">
            2/ Gửi hồ sơ:
              <h1 className="mt-2 text-xl font-normal text-left">
                Đây là trang sinh viên có thể khai báo các thông tin cá nhân khác
                và các thành tích đã có trong thời gian quy định.<br />
                Đối với thông tin cá nhân khác, sinh viên phải điền đầy đủ các mục
                có dấu <span className="text-red-500">*</span> trước khi có thể
                tiếp tục điền các thành tích ở các trang sau.
                  
              </h1>
          </div>

          <div className="mt-4 rounded-xl border border-black bg-yellow-100 p-6 text-2xl text-left text-black font-bold">
            3/ Tạo minh chứng:
              <h1 className="mt-2 text-xl font-normal text-left">
                Đây là trang sinh viên có thể tạo minh chứng<br />
                  
              </h1>
          </div>

          <div className="mt-4 rounded-xl border border-black bg-yellow-100 p-6 text-2xl text-left text-black font-bold">
            4/ Xem yêu cầu:
              <h1 className="mt-2 text-xl font-normal text-left">
                Đây là trang sinh viên có thể tạo minh chứng<br />
                  
              </h1>
          </div>

          <div className="mt-4 rounded-xl border border-black bg-yellow-100 p-6 text-2xl text-left text-black font-bold">
            5/ Chỉnh sửa hồ sơ:
              <h1 className="mt-2 text-xl font-normal text-left">
                Đây là trang sinh viên có thể tạo minh chứng<br />
                  
              </h1>
          </div>

          <div className="mt-4 rounded-xl border border-black bg-yellow-100 p-6 text-2xl text-left text-black font-bold">
            6/ Bổ sung minh chứng:
              <h1 className="mt-2 text-xl font-normal text-left">
                Đây là trang sinh viên có thể tạo minh chứng<br />
                  
              </h1>
          </div>

          <div className="mt-4 rounded-xl border border-black bg-green-200 p-6 text-2xl text-left text-black font-bold">
            7/ Xem kết quả:
              <h1 className="mt-2 text-xl font-normal text-left">
                Đây là trang sinh viên có thể tạo minh chứng<br />
                  
              </h1>
          </div>
        </section>
      </div>
    </main>
  );
}
