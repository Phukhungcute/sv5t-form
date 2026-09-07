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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">

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
    </main>
  );
}