"use client";

import { useState } from "react";
import Image from "next/image";
import { ERRORS, LICENSE_RE } from "@/lib/license";
import AuthModal from "./AuthModal";
import AddModal from "./AddModal";

const LICENSE_CHARS_RE = /^[A-Z0-9]*$/;

type SearchResult =
  | { state: "idle" }
  | { state: "clean" }
  | { state: "blacklisted"; comment: string }
  | { state: "added"; license: string };

export default function SearchBox() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult>({ state: "idle" });
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"auth" | "add" | null>(null);

  const hasText = value.length > 0;

  function handleChange(raw: string) {
    const upper = raw.toUpperCase();
    if (!LICENSE_CHARS_RE.test(upper)) {
      setError(ERRORS.license);
      setValue(upper.replace(/[^A-Z0-9]/g, ""));
    } else {
      setError(null);
      setValue(upper);
    }
    setResult({ state: "idle" });
  }

  async function handleSearch() {
    if (!hasText || busy) return;
    if (!LICENSE_RE.test(value)) {
      setError(ERRORS.licenseInvalid);
      setResult({ state: "idle" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/blacklist/check?license=${encodeURIComponent(value)}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(
        data.blacklisted
          ? { state: "blacklisted", comment: data.comment }
          : { state: "clean" },
      );
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    setError(null);
    setResult({ state: "idle" });
    const res = await fetch("/api/auth/me").catch(() => null);
    setModal(res?.ok ? "add" : "auth");
  }

  const isBlacklisted = result.state === "blacklisted";

  return (
    <div className="w-full max-w-3xl flex flex-col items-start gap-6">
      <a href="/" aria-label="მთავარი გვერდი" className="self-center">
        <Image
          src={isBlacklisted ? "/icons/turtle-error.svg" : "/icons/turtle.svg"}
          alt="shavisia.ge"
          width={150}
          height={150}
          className="turtle-walk"
          priority
        />
      </a>

      <p className="text-md sm:text-xl self-center text-center sd">
        დაამატე ან გადაამოწმე მძღოლი{" "}<br/>
        <strong>მართვის მოწმობის ნომრით</strong>
      </p>

      <form
        className="w-full flex items-center gap-2 glass rounded-full p-2 pl-5 sm:p-3 sm:pl-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (hasText) handleSearch();
          else handleAdd();
        }}
      >
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="მაგ: AH0673483"
          maxLength={15}
          className="flex-1 min-w-0 bg-transparent text-md sm:text-xl outline-none placeholder:text-neutral-400"
          aria-label="მართვის მოწმობის ნომერი"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex shrink-0 items-center gap-2 bg-white/85 hover:bg-white transition-colors text-black text-base sm:text-lg rounded-full px-4 py-2.5 sm:px-6 sm:py-3 disabled:opacity-60"
        >
          {busy ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="animate-spin"
            >
              <path d="M12 3a9 9 0 1 1-9 9" />
            </svg>
          ) : hasText ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          ) : (
            <span className="text-xl leading-none">+</span>
          )}
          {hasText ? "ძიება" : "დამატება"}
        </button>
      </form>

      {error && <p className="text-danger">{error}</p>}

      {result.state === "clean" && (
        <p className="text-ok text-2xl font-bold">მძღოლი არ არის შავ სიაში!</p>
      )}

      {result.state === "blacklisted" && (
        <div className="flex flex-col gap-3">
          <p className="text-danger text-2xl font-bold">მძღოლი შავ სიაშია!</p>
          <div>
            <p className="font-bold">კომენტარი:</p>
            <p className="text-neutral-300 max-w-xl whitespace-pre-wrap">
              {result.comment}
            </p>
          </div>
        </div>
      )}

      {result.state === "added" && (
        <p className="text-ok text-2xl font-bold">
          {result.license} დაემატა შავ სიაში
        </p>
      )}

      {modal === "auth" && (
        <AuthModal
          onClose={() => setModal(null)}
          onSuccess={() => setModal("add")}
        />
      )}

      {modal === "add" && (
        <AddModal
          initialLicense={value}
          onClose={() => setModal(null)}
          onSuccess={(license) => {
            setModal(null);
            setValue("");
            setResult({ state: "added", license });
          }}
        />
      )}
    </div>
  );
}
