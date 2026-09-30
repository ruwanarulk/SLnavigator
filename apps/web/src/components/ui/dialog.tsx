"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Native <dialog>: focus trapping, Esc and backdrop handled by the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-32px)] ${wide ? "max-w-2xl" : "max-w-md"} rounded-card bg-card p-0 text-label shadow-float backdrop:bg-black/40 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between border-b border-sep px-5 py-4">
        <h2 className="font-display text-[24px] font-semibold">{title}</h2>
        <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-fill hover:bg-sep">
          <X className="size-4" />
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
