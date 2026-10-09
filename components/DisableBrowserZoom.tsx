"use client";

import { useEffect } from "react";

export default function DisableBrowserZoom() {
  useEffect(() => {
    const preventCtrlWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", preventCtrlWheel, {
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", preventCtrlWheel);
    };
  }, []);

  return null;
}