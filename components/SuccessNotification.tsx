"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export default function SuccessNotification() {
  const [message, setMessage] = useState("");
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    function handleSuccess(event: Event) {
      const customEvent =
        event as CustomEvent<{
          message: string;
        }>;

      const message =
        customEvent.detail?.message;

      if (!message) {
        return;
      }

      setMessage(message);
      setHiding(false);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: {
          y: 0.15,
        },
      });

      setTimeout(() => {
        setHiding(true);

        setTimeout(() => {
          setMessage("");
          setHiding(false);
        }, 500);
      }, 4000);
    }

    window.addEventListener(
      "success-notification",
      handleSuccess
    );

    return () => {
      window.removeEventListener(
        "success-notification",
        handleSuccess
      );
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-x-0
        top-5
        z-[9999]
        flex
        justify-center
        px-4
      "
    >
      <div
        className={
          hiding
            ? "w-full max-w-md animate-[slideUp_0.5s_ease-in]"
            : "w-full max-w-md animate-[slideDown_0.5s_ease-out]"
        }
      >
        <div
          className="
            flex
            items-center
            gap-4
            rounded-2xl
            border
            border-green-200
            bg-white
            px-5
            py-4
            shadow-xl
          "
        >
          <div className="text-3xl">
            🎉
          </div>

          <div className="flex-1">
            <p className="font-semibold text-gray-800">
              {message}
            </p>
          </div>

          <div className="text-3xl">
            🎊
          </div>
        </div>
      </div>
    </div>
  );
}