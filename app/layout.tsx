import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";//
import { Montserrat } from "next/font/google";
import "./globals.css";
import SuccessNotification from "@/components/SuccessNotification";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
});

// const geistSans = Geist({
// variable: "--font-geist-sans",
// subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
// variable: "--font-geist-mono",
// subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "CỔNG THÔNG TIN DANH HIỆU SINH VIÊN 5 TỐT KHOA GIÁO DỤC TIỂU HỌC TRƯỜNG ĐẠI HỌC SÀI GÒN",
  description: "Hệ thống đăng ký và quản lý biểu mẫu SV5T",
};

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SuccessNotification />

        {children}
      </body>
    </html>
  );
}
