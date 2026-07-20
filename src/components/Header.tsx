"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const router = useRouter();

  async function handleAccountClick() {
    if (open) return setOpen(false);
    const res = await fetch("/api/auth/me").catch(() => null);
    if (res?.ok) setOpen(true);
    else setShowAuth(true);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="relative flex justify-end p-6">
      <button
        aria-label="ანგარიში"
        onClick={handleAccountClick}
        className="text-white hover:text-neutral-300 transition-colors"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-6 top-16 z-40 w-60 rounded-2xl glass-panel text-white px-5 pb-5 pt-2 flex flex-col items-start gap-4">
          <button
            aria-label="დახურვა"
            onClick={() => setOpen(false)}
            className="self-end text-lg leading-none text-neutral-400 hover:text-white"
          >
            ×
          </button>
          <Link href="/account?tab=profile" onClick={() => setOpen(false)}>
            პროფილი
          </Link>
          <Link href="/account?tab=blacklist" onClick={() => setOpen(false)}>
            ჩემი გაშავებული
          </Link>
          <button onClick={logout}>გამოსვლა</button>
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            setOpen(true);
            router.refresh();
          }}
        />
      )}
    </header>
  );
}
