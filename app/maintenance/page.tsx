
import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mb-5 text-5xl">🛠️</div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Hệ thống đang bảo trì
        </h1>

        <p className="mb-6 leading-7 text-gray-600">
          Hệ thống SV5T Form đang được bảo trì.
          Vui lòng quay lại sau khi quá trình bảo trì hoàn tất.
        </p>

        <Link
          href="/"
          className="inline-flex rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          Quay lại trang đăng nhập
        </Link>
      </div>
    </main>
  );
}
