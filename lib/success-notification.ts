export function Success(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("success-notification", {
      detail: {
        message,
      },
    })
  );
}