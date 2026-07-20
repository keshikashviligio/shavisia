"use client";

import { useState } from "react";
import Modal from "./Modal";
import { ERRORS, COMMENT_MAX } from "@/lib/license";

const LICENSE_CHARS_RE = /^[A-Z0-9]*$/;

export default function AddModal({
  initialLicense,
  onClose,
  onSuccess,
}: {
  initialLicense: string;
  onClose: () => void;
  onSuccess: (license: string) => void;
}) {
  const [license, setLicense] = useState(initialLicense);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleLicenseChange(raw: string) {
    const upper = raw.toUpperCase();
    if (!LICENSE_CHARS_RE.test(upper)) {
      setError(ERRORS.license);
      setLicense(upper.replace(/[^A-Z0-9]/g, ""));
    } else {
      setError(null);
      setLicense(upper);
    }
  }

  async function submit() {
    if (busy) return;
    if (!license) return setError(ERRORS.licenseRequired);
    if (!comment.trim()) return setError(ERRORS.commentRequired);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license, comment }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? ERRORS.generic);
      else onSuccess(license);
    } catch {
      setError(ERRORS.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="შავ სიაში დამატება" onClose={onClose}>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="text-xs">
          <span className="text-red-600">*</span> შეიყვანეთ მართვის მოწმობის
          ნომერი
        </label>
        <input
          value={license}
          onChange={(e) => handleLicenseChange(e.target.value)}
          placeholder="AH0673483"
          maxLength={15}
          autoFocus={!initialLicense}
          className="bg-transparent border-b border-white/30 focus:border-white pb-1 outline-none placeholder:text-neutral-500"
        />

        <label className="text-xs mt-6">
          <span className="text-red-600">*</span> ჩაწერეთ გაშავების მიზეზი
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
          placeholder="კომენტარი"
          rows={5}
          autoFocus={!!initialLicense}
          className="bg-white/5 border border-white/25 focus:border-white/60 rounded-xl p-3 outline-none resize-none placeholder:text-neutral-500"
        />
        <p className="text-xs text-neutral-400 self-end">
          {comment.length}/{COMMENT_MAX}
        </p>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex justify-end items-center gap-6 mt-6">
          <button type="button" onClick={onClose} disabled={busy}>
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={busy}
            className="bg-white hover:bg-neutral-200 transition-colors text-black px-8 py-3 rounded-full disabled:opacity-60"
          >
            დამატება
          </button>
        </div>
      </form>
    </Modal>
  );
}
