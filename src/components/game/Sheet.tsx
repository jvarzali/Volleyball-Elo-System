"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Native <dialog>: focus trapping, Escape to close, and inert background for free. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-[20px] bg-surface p-0 text-ink sm:m-auto sm:max-w-lg sm:rounded-[20px]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line-2 px-5 py-4">
        <h2 id="sheet-title" className="display text-[1.8rem] font-bold">
          {title}
        </h2>
        <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-line-2">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="px-5 pb-6 pt-4">{children}</div>
    </dialog>
  );
}
