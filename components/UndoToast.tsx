"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion";

/* Undo rather than confirm.

   A delete that asks "are you sure" charges everyone a click to protect the
   one case in fifty. This costs nothing until you need it, and what comes back
   is the whole previous board, not just the row.

   It announces politely and never takes focus: a toast that steals the caret
   mid sentence is worse than no toast. */
export function UndoToast({
  label,
  onUndo,
  onDismiss,
}: {
  label: string | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const node = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!label) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [label, onDismiss]);

  useEffect(() => {
    if (!label || !node.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* It arrives from below, where it lives, rather than fading in from
       nowhere. Slight bounce because it was thrown up into view. */
    animate(
      node.current,
      { transform: ["translateY(24px) scale(0.96)", "translateY(0) scale(1)"], opacity: [0, 1] },
      { type: "spring", bounce: 0.22, duration: 0.42 },
    );
  }, [label]);

  if (!label) return null;

  return (
    <div ref={node} role="status" aria-live="polite" className="toast">
      <span className="text-[13px] text-[var(--secondary)]">{label}</span>
      <button type="button" onClick={onUndo} className="tap toast-action">
        Undo
      </button>
    </div>
  );
}
