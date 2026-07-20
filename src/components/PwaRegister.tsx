"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // registration failing (old browser, private mode) is fine —
          // the site keeps working as a normal web page
        });
    }
  }, []);

  return null;
}
