"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function AuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setStep("code");
    } catch {
      setError("დაფიქსირდა შეცდომა, სცადეთ თავიდან");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else onSuccess();
    } catch {
      setError("დაფიქსირდა შეცდომა, სცადეთ თავიდან");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="ავტორიზაცია" onClose={onClose}>
      {step === "phone" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            requestCode();
          }}
        >
          <label className="text-xs">
            <span className="text-red-600">*</span> თქვენი მობილურის ნომერი
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+995"
            inputMode="tel"
            autoFocus
            className="bg-transparent border-b border-black pb-1 outline-none placeholder:text-neutral-600"
          />
          {error && <p className="text-red-700 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-10 self-center bg-black text-white px-10 py-3 rounded-md disabled:opacity-60"
          >
            შესვლა
          </button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
        >
          <p className="text-sm mb-2">
            კოდი გამოგზავნილია ნომერზე <strong>{phone}</strong>
          </p>
          <label className="text-xs">
            <span className="text-red-600">*</span> ერთჯერადი კოდი
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            className="bg-transparent border-b border-black pb-1 outline-none tracking-widest placeholder:text-neutral-600"
          />
          {error && <p className="text-red-700 text-sm mt-2">{error}</p>}
          <button
            type="button"
            onClick={requestCode}
            className="text-sm underline self-start mt-2"
          >
            კოდის თავიდან გაგზავნა
          </button>
          <button
            type="submit"
            disabled={busy}
            className="mt-6 self-center bg-black text-white px-10 py-3 rounded-md disabled:opacity-60"
          >
            დადასტურება
          </button>
        </form>
      )}
    </Modal>
  );
}
