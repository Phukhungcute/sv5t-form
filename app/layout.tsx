import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";//
//import { Montserrat } from "next/font/google";//
import localFont from "next/font/local";
import "./globals.css";
import SuccessNotification from "@/components/SuccessNotification";
import PortraitOnly from "@/components/PortraitOnly";

const avo = localFont({
  src: [
    {
      path: "../public/fonts/UTM Avo.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/UTM AvoBold.ttf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-avo",
  display: "swap",
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
      className={`${avo.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PortraitOnly />
        <SuccessNotification />

        {children}
      </body>
    </html>
  );
}
