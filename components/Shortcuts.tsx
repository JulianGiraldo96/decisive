"use client";

import { useEffect, useRef, useState } from "react";

const KEYS: { keys: string[]; what: string }[] = [
  { keys: ["C"], what: "Jump to the capture field" },
  { keys: ["Enter"], what: "Add the task" },
  { keys: ["V"], what: "Switch between matrix and calendar" },
  { keys: ["Z"], what: "Undo the last change" },
  { keys: ["Esc"], what: "Cancel a drag, an edit or a menu" },
  { keys: ["@friday"], what: "Set a deadline while capturing" },
];

/* Every shortcut in the app, one click away.

   A keyboard surface that never tells you it is one is just a slower mouse
   surface. This is also where the drag alternative gets stated out loud: the
   row menu does everything the drag does. */
export function Shortcuts() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="foot-link"
      >
        Keyboard shortcuts
      </button>

      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="menu-surface absolute bottom-full left-0 z-40 mb-2 w-[290px] origin-bottom-left rounded-2xl p-3"
        >
          <dl className="flex flex-col gap-1.5">
            {KEYS.map((row) => (
              <div key={row.what} className="flex items-baseline gap-3">
                <dt className="flex flex-none gap-1">
                  {row.keys.map((key) => (
                    <kbd key={key} className="kbd">
                      {key}
                    </kbd>
                  ))}
                </dt>
                <dd className="text-[12px] leading-snug text-[var(--secondary)]">{row.what}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 border-t border-[var(--line)] pt-2 text-[12px] leading-snug text-[var(--label)]">
            Dragging is never the only way. The menu on every task row moves it
            between quadrants and sets its deadline too.
          </p>
        </div>
      ) : null}
    </span>
  );
}
