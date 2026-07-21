"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "./Modal";
import { ERRORS } from "@/lib/license";

type Tab = "profile" | "blacklist";

type Entry = {
  id: string;
  licenseNumber: string;
  comment: string;
  createdAt: string;
};

export default function AccountTabs({
  initialPhone,
}: {
  initialPhone: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the source of truth, so header links to /account?tab=… switch
  // the tab even when the account page is already open.
  const tab: Tab =
    searchParams.get("tab") === "blacklist" ? "blacklist" : "profile";

  return (
    <div>
      <div className="flex gap-10 border-b border-neutral-700 mb-10">
        {(
          [
            ["profile", "პროფილი"],
            ["blacklist", "ჩემი გაშავებული"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() =>
              router.replace(`/account?tab=${key}`, { scroll: false })
            }
            className={`pb-3 -mb-px border-b-2 transition-colors ${
              tab === key
                ? "border-white text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <ProfileTab initialPhone={initialPhone} />
      ) : (
        <BlacklistTab />
      )}
    </div>
  );
}

function ProfileTab({ initialPhone }: { initialPhone: string }) {
  const [phone, setPhone] = useState(initialPhone);
  const [step, setStep] = useState<"view" | "edit" | "code">("view");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/profile/phone/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setStep("code");
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setPhone(data.phone);
        setStep("view");
        setNewPhone("");
        setCode("");
        setDone(true);
      }
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md flex flex-col gap-4">
      <p className="text-sm text-neutral-400">მობილურის ნომერი</p>

      {step === "view" && (
        <div className="flex items-center gap-6">
          <p className="text-xl">{phone}</p>
          <button
            onClick={() => {
              setStep("edit");
              setDone(false);
              setError(null);
            }}
            className="text-sm underline text-neutral-300 hover:text-white"
          >
            რედაქტირება
          </button>
        </div>
      )}

      {step === "edit" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            requestCode();
          }}
        >
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+995"
            inputMode="tel"
            autoFocus
            className="bg-transparent border-b border-white pb-1 outline-none placeholder:text-neutral-500"
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep("view")}
              className="text-neutral-300"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-white hover:bg-neutral-200 transition-colors text-black px-6 py-2 rounded-full disabled:opacity-60"
            >
              კოდის გაგზავნა
            </button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
        >
          <p className="text-sm text-neutral-300">
            კოდი გამოგზავნილია ნომერზე <strong>{newPhone}</strong>
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            className="bg-transparent border-b border-white pb-1 outline-none tracking-widest placeholder:text-neutral-500"
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep("edit")}
              className="text-neutral-300"
            >
              უკან
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-white hover:bg-neutral-200 transition-colors text-black px-6 py-2 rounded-full disabled:opacity-60"
            >
              დადასტურება
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}
      {done && <p className="text-ok text-sm">ნომერი წარმატებით შეიცვალა</p>}
    </div>
  );
}

function BlacklistTab() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [toDelete, setToDelete] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/blacklist/mine")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setError(ERRORS.generic));
  }, []);

  async function confirmDelete() {
    if (!toDelete || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/blacklist/${toDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setEntries((prev) => prev?.filter((e) => e.id !== toDelete.id) ?? null);
      setToDelete(null);
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(false);
    }
  }

  if (entries === null && !error) {
    return <p className="text-neutral-400">იტვირთება…</p>;
  }

  return (
    <div>
      {error && <p className="text-danger mb-4">{error}</p>}

      {entries?.length === 0 && (
        <p className="text-neutral-400">სია ცარიელია</p>
      )}

      {entries?.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-6 border-b border-neutral-600 py-5"
        >
          <p>
            {entry.licenseNumber}{" "}
            <span className="text-neutral-400">·</span> {entry.comment}
          </p>
          <button
            aria-label="წაშლა"
            onClick={() => setToDelete(entry)}
            className="text-red-500 hover:text-red-400 shrink-0 mt-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7" />
            </svg>
          </button>
        </div>
      ))}

      {toDelete && (
        <Modal
          title="ნამდვილად გსურთ შავი სიიდან ამოშლა?"
          onClose={() => setToDelete(null)}
        >
          <p className="text-sm mb-10">
            {toDelete.licenseNumber} · {toDelete.comment}
          </p>
          <div className="flex justify-end items-center gap-6">
            <button onClick={() => setToDelete(null)} disabled={busy}>
              არა
            </button>
            <button
              onClick={confirmDelete}
              disabled={busy}
              className="bg-white hover:bg-neutral-200 transition-colors text-black px-8 py-3 rounded-full disabled:opacity-60"
            >
              დიახ
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
