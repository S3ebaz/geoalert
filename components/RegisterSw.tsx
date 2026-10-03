"use client";

import { useEffect } from "react";

export function RegisterSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    void navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => undefined);
  }, []);
  return null;
}
