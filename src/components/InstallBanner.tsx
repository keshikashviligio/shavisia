"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/* PWA install flow per design handoff (design_handoff_pwa_install):
 * floating pill button -> Android/Chrome bottom-sheet banner (native
 * prompt) or iOS Safari "Add to Home Screen" instruction sheet. */

const DISMISS_KEY = "psi-dismissed";
const DISMISS_DAYS = 14;
const EXIT_MS = 350;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// handoff glass tokens (differ slightly from the site-wide .glass utility)
const glass: React.CSSProperties = {
  background:
    "linear-gradient(150deg, rgba(255,255,255,.15), rgba(255,255,255,.05))",
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  border: "1px solid rgba(255,255,255,.22)",
  boxShadow: "0 20px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.3)",
};

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export default function InstallBanner() {
  const [ui, setUi] = useState<"none" | "button" | "banner" | "ios">("none");
  const [shown, setShown] = useState(false);
  const [platform, setPlatform] = useState<"chromium" | "ios" | null>(null);
  // iOS browser without an install path (Chrome/Firefox/Edge on iOS):
  // the sheet gains a first step — open the site in Safari
  const [needsSafari, setNeedsSafari] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  // animate every mounted surface in on the next frame
  useEffect(() => {
    if (ui === "none") return;
    setShown(false);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [ui]);

  const hide = useCallback((after?: () => void) => {
    setShown(false);
    setTimeout(() => {
      setUi("none");
      after?.();
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (recentlyDismissed()) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIOS =
      /iPhone|iPad|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isIOSSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

    function onPrompt(e: Event) {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setPlatform("chromium");
      setUi("button");
    }
    function onInstalled() {
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
      setShown(false);
      setTimeout(() => setUi("none"), EXIT_MS);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS) {
      timer = setTimeout(() => {
        setPlatform("ios");
        setNeedsSafari(!isIOSSafari);
        setUi("button");
      }, 2000);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    markDismissed();
    hide();
  }

  function openSheet() {
    setUi(platform === "ios" ? "ios" : "banner");
  }

  function install() {
    const evt = deferred.current;
    // remove our UI first so it doesn't sit under the native dialog
    hide(async () => {
      if (!evt) return;
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome !== "accepted") markDismissed();
    });
  }

  if (ui === "none") return null;

  const trans = `transition-[opacity,transform] duration-300 ${
    shown ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none"
  }`;

  if (ui === "button") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={openSheet}
        onKeyDown={(e) => e.key === "Enter" && openSheet()}
        style={glass}
        className={`fixed left-1/2 -translate-x-1/2 bottom-6 z-[9998] flex cursor-pointer select-none items-center gap-[10px] rounded-full px-6 py-3.5 text-[14.5px] font-bold text-white hover:bg-white/10 ${trans} ${
          shown ? "" : "translate-y-4"
        }`}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v11" />
          <path d="M7 10l5 5 5-5" />
          <path d="M4 20h16" />
        </svg>
        აპის დაყენება
      </div>
    );
  }

  if (ui === "banner") {
    return (
      <div
        style={glass}
        className={`fixed inset-x-3 bottom-3 z-[9999] mx-auto flex max-w-[480px] flex-col gap-4 rounded-[26px] p-[18px] text-white ${trans} ${
          shown ? "" : "translate-y-6"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]"
            style={{
              background: "linear-gradient(135deg,#1c1f27,#0d0f14)",
              border: "1px solid rgba(255,255,255,.18)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.15)",
            }}
          >
            <Image src="/icons/turtle.svg" alt="" width={36} height={36} />
          </div>
          <div>
            <div className="text-base font-extrabold">დააყენე შავი სია</div>
            <div className="text-xs text-white/65">
              shavisia.ge · უფასო · ოფლაინ რეჟიმი
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={install}
            className="h-[46px] flex-1 rounded-full text-sm font-bold text-[#0b0c10] cursor-pointer"
            style={{
              background: "linear-gradient(180deg,#ffffff,#dfe3ea)",
              boxShadow: "0 6px 20px rgba(255,255,255,.15)",
            }}
          >
            დაყენება
          </button>
          <button
            onClick={dismiss}
            className="h-[46px] flex-1 rounded-full border border-white/[.16] bg-white/[.07] text-sm font-bold text-white/75"
          >
            მოგვიანებით
          </button>
        </div>
      </div>
    );
  }

  // iOS instruction sheet
  const tile =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[.16] bg-white/[.09]";
  const steps: { icon: React.ReactNode; text: React.ReactNode }[] = [
    ...(needsSafari
      ? [
          {
            icon: (
              // Safari compass
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6db2ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m14.5 9.5-1.8 4.2-4.2 1.8 1.8-4.2z" />
              </svg>
            ),
            text: (
              <>
                გახსენი shavisia.ge{" "}
                <strong className="text-white">Safari</strong>-ში
              </>
            ),
          },
        ]
      : []),
    {
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6db2ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v13" />
          <path d="M7.5 7.5 12 3l4.5 4.5" />
          <path d="M5 12v8h14v-8" />
        </svg>
      ),
      text: (
        <>
          Safari-ში დააჭირე <strong className="text-white">გაზიარების</strong>{" "}
          ღილაკს
        </>
      ),
    },
    {
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M12 9v6M9 12h6" />
        </svg>
      ),
      text: (
        <>
          აირჩიე{" "}
          <strong className="text-white">„მთავარ ეკრანზე დამატება“</strong>
        </>
      ),
    },
    {
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5ddb8a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 13 4 4L19 7" />
        </svg>
      ),
      text: (
        <>
          დაადასტურე — <strong className="text-white">„დამატება“</strong>
        </>
      ),
    },
  ];
  return (
    <div
      style={glass}
      className={`fixed inset-x-3 bottom-3 z-[9999] mx-auto flex max-w-[480px] flex-col gap-4 rounded-[30px] px-5 pb-[18px] pt-3.5 text-white ${trans} ${
        shown ? "" : "translate-y-6"
      }`}
    >
      <div className="mx-auto h-[4.5px] w-10 rounded-full bg-white/30" />
      <div className="flex items-center">
        <div className="flex-1 text-[17px] font-extrabold">
          დაამატე მთავარ ეკრანზე
        </div>
        <button
          onClick={dismiss}
          aria-label="დახურვა"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[.16] bg-white/10 text-[13px] text-white/70"
        >
          ✕
        </button>
      </div>

      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3.5">
          <div className={tile}>{step.icon}</div>
          <p className="text-[13.5px] leading-normal text-white/85">
            {i + 1}. {step.text}
          </p>
        </div>
      ))}

      {!needsSafari && (
        <p className="text-center text-[11px] text-white/50">
          გაზიარების ღილაკი აქ ↓
        </p>
      )}
    </div>
  );
}
