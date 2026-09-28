"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ServerTimePage() {
  const [serverTime, setServerTime] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function getServerTime() {
      console.log("ĐANG GỌI SUPABASE...");

      const {
        data,
        error,
      } = await supabase.rpc(
        "get_server_time"
      );

      console.log(
        "SERVER TIME RAW:",
        data
      );

      console.log(
        "SERVER TIME ERROR:",
        error
      );

      if (error) {
        setError(error.message);
        return;
      }

      if (!data) {
        setError("Không nhận được thời gian.");
        return;
      }

      setServerTime(data);
    }

    getServerTime();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-100 p-6">
      
      <div className="relative rounded-2xl bg-green-100 p-6">
      <img
              src="/images/Chim.png"
              alt="Chim"
              className="absolute left-1/2 top-0 h-50 w-auto translate-x-10 -translate-y-40 object-contain"
            />
      
      <img
              src="/images/Chicken1.png"
              alt="Gà mái"
              className="absolute left-1/2 top-0 h-50 w-auto -translate-x-50 -translate-y-45 object-contain"
            />

      <img
              src="/images/Dog.png"
              alt="Mi mượt"
              className="absolute left-1/2 top-0 h-50 w-auto translate-x-45 -translate-y-10 object-contain"
            />
      
      <img
              src="/images/Cat1.png"
              alt="Bà già"
              className="absolute left-1/2 top-0 h-50 w-auto translate-x-60 translate-y-45 object-contain"
            />

      <img
              src="/images/Cat2.png"
              alt="Mèo net"
              className="absolute left-1/2 top-0 h-50 w-auto translate-x-55 translate-y-90 object-contain"
            />

      <img
              src="/images/Mina.png"
              alt="Mina"
              className="absolute left-1/2 top-0 h-50 w-auto -translate-x-90 translate-y-0 object-contain"
            />

      <img
              src="/images/Cat3.png"
              alt="Chuột"
              className="absolute left-1/2 top-0 h-50 w-auto -translate-x-110 translate-y-40 object-contain"
            />

      <img
              src="/images/Chicken2.png"
              alt="Gà không lông"
              className="absolute left-1/2 top-0 h-50 w-auto -translate-x-100 translate-y-90 object-contain"
            />

      <div className="w-full max-w-lg rounded-2xl bg-green-50 p-8 shadow-lg">

        <h1 className="text-2xl font-bold text-gray-900">
          Test Server Time
        </h1>

        <p className="mt-2 text-gray-500">
          Kiểm tra thời gian lấy từ Supabase.
        </p>

        {error ? (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
            <p className="font-semibold">
              Lỗi:
            </p>
            <p>{error}</p>
          </div>
        ) : serverTime ? (
          <div className="mt-6 space-y-4">

            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-500">
                Timestamp từ Supabase
              </p>

              <p className="mt-1 font-mono text-lg">
                {serverTime}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-500">
                Hiển thị theo giờ Việt Nam
              </p>

              <p className="mt-1 text-lg font-semibold">
                {new Date(
                  serverTime
                ).toLocaleString(
                  "vi-VN",
                  {
                    timeZone:
                      "Asia/Ho_Chi_Minh",
                    dateStyle: "full",
                    timeStyle: "medium",
                  }
                )}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-gray-500">
                Timestamp ISO
              </p>

              <p className="mt-1 font-mono">
                {new Date(
                  serverTime
                ).toISOString()}
              </p>
            </div>

          </div>
        ) : (
          <p className="mt-6 text-gray-500">
            Đang lấy thời gian...
          </p>
        )}

      </div>
      </div>
    </main>
  );
}