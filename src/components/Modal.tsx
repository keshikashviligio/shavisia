"use client";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-neutral-400 text-black p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="დახურვა"
          className="absolute right-4 top-2 text-2xl leading-none text-neutral-700 hover:text-black"
        >
          ×
        </button>
        <h2 className="text-xl mb-6">{title}</h2>
        {children}
      </div>
    </div>
  );
}
