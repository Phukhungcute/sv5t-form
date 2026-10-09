"use client";

import { useEffect, useRef } from "react";

type NewsTickerProps = {
  message?: string;
};

export default function NewsTicker({
  message = "Thông báo về việc đăng ký và hoàn thiện hồ sơ Sinh viên 5 tốt năm học 2025–2026. Các bạn sinh viên vui lòng theo dõi thông báo để cập nhật thời hạn và hướng dẫn mới nhất.",
}: NewsTickerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLSpanElement>(null);
  const secondMessageRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
  const viewport = viewportRef.current;
  const track = trackRef.current;
  const firstMessage = messageRef.current;
  
  if (!viewport || !track || !firstMessage) return;

  const secondMessage = secondMessageRef.current;

if (!viewport || !track || !firstMessage || !secondMessage) {
  return;
}

  let animationId = 0;

  // Tất cả thời gian trong phần tính toán đều dùng giây
  const pauseDuration = 3;
  const accelerationDuration = 2;
  const decelerationDuration = 2;
  const maxSpeed = 80; // pixel/giây

  let cycleStart = 0;

  const animate = (now: number) => {
    if (cycleStart === 0) {
      cycleStart = now;
    }

    const elapsed = (now - cycleStart) / 1000;

    const messageWidth = firstMessage.offsetWidth;

    const viewportWidth = viewport.getBoundingClientRect().width;

    // Tin ngắn hơn vùng hiển thị thì không cần chạy
    if (messageWidth <= viewportWidth) {
      track.style.transform = "translateX(0)";
      animationId = requestAnimationFrame(animate);
      return;
    }

    // Tính tốc độ tối đa phù hợp với chiều dài tin
    const peakSpeed = Math.min(
      maxSpeed,
      (2 * messageWidth) /
        (accelerationDuration + decelerationDuration),
    );

    const acceleration =
      peakSpeed / accelerationDuration;

    const accelerationDistance =
      0.5 * acceleration * accelerationDuration ** 2;

    const decelerationDistance =
      0.5 * peakSpeed * decelerationDuration;

    const cruiseDistance = Math.max(
      0,
      messageWidth - accelerationDistance - decelerationDistance,
    );

    const cruiseDuration = cruiseDistance / peakSpeed;

    const travelDuration =
      accelerationDuration + cruiseDuration + decelerationDuration;

    // Giai đoạn 1: Đứng yên
    if (elapsed < pauseDuration) {
      track.style.transform = "translateX(0)";
    } else {
      const travelTime = elapsed - pauseDuration;
      let distance = 0;

      // Giai đoạn 2: Tăng tốc từ 0
      if (travelTime < accelerationDuration) {
        distance = 0.5 * acceleration * travelTime ** 2;
      }
      // Giai đoạn 3: Chạy đều
      else if (
        travelTime < accelerationDuration + cruiseDuration
      ) {
        const cruiseTime =
          travelTime - accelerationDuration;

        distance =
          accelerationDistance + peakSpeed * cruiseTime;
      }
      // Giai đoạn 4: Giảm tốc về 0
      else if (travelTime < travelDuration) {
        const decelerationTime =
          travelTime - accelerationDuration - cruiseDuration;

        distance =
          accelerationDistance +
          cruiseDistance +
          peakSpeed * decelerationTime -
          0.5 * acceleration * decelerationTime ** 2;
      }
      // Kết thúc một chu kỳ
      else {
        track.style.transform = "translateX(0)";
        cycleStart = now;
        animationId = requestAnimationFrame(animate);
        return;
      }

      track.style.transform = `translateX(${-distance}px)`;
    }

    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(animationId);
  };
}, [message]);

  return (
    <div className="flex w-full overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Nhãn Tiêu điểm */}
      <div className="z-10 flex shrink-0 items-center gap-2 bg-sv5t-blue px-5 py-3 text-white">
        <span className="text-xl" aria-hidden="true">
          📣︎
        </span>

        <span className="whitespace-nowrap text-sm font-bold tracking-wide">
          TIÊU ĐIỂM
        </span>
      </div>

      {/* Vùng chạy tin */}
      <div
        ref={viewportRef}
        className="flex min-w-0 flex-1 items-center overflow-hidden px-4"
      >
        <div
          ref={trackRef}
          className="ticker-track"
        >
          <span
            ref={messageRef}
            className="ticker-text"
          >
            {message}
          </span>

          <span
            ref={secondMessageRef}
            className="ticker-text"
            aria-hidden="true"
          >
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}