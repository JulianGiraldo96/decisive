"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { QUADRANTS, type QuadrantId, type Task } from "@/lib/types";
import { addDays, todayISO } from "@/lib/dates";

/* The keyboard path.

   Dragging is the fast way to move a task and it is also the way that excludes
   anyone using a keyboard, a screen reader, or a trackpad they cannot hold
   steady. Everything the drag can do, this menu can do too: change quadrant,
   set or clear a deadline, delete. It is not a fallback, it is the same feature
   through a different door, which is why it is one keystroke from every row
   rather than buried in a settings panel. */
export function TaskMenu({
  task,
  onMove,
  onSchedule,
  onRemove,
  onClose,
}: {
  task: Task;
  onMove: (quadrant: QuadrantId) => void;
  onSchedule: (due: string | null) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState(false);

  /* A row near the bottom of the window opens its menu upward instead of off
     the end of the page. Measured rather than guessed, because the menu grows
     by one item when the task already has a deadline. */
  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.bottom > window.innerHeight - 8) setFlip(true);
  }, []);

  useEffect(() => {
    /* Focus moves into the menu on open and the first item is ready, so the
       keyboard user is never dropped somewhere with nothing selected. */
    ref.current?.querySelector<HTMLElement>("[data-item]")?.focus();

    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLElement>("[data-item]") ?? [],
      );
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === "ArrowDown"
          ? items[(index + 1) % items.length]
          : items[(index - 1 + items.length) % items.length];
      next?.focus();
    }

    /* mousedown, not click: a click listener fires on the same event that
       opened the menu and closes it again in the same tick */
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const today = todayISO();
  const dates: { label: string; value: string | null }[] = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "Next week", value: addDays(today, 7) },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${task.text}`}
      className={clsx(
        "menu-surface absolute right-0 z-30 w-56 rounded-2xl p-1.5",
        flip ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right",
      )}
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--label)]">
        Move to
      </p>
      {QUADRANTS.map((q) => (
        <button
          key={q.id}
          data-item
          data-tone={q.tone}
          role="menuitemradio"
          aria-checked={task.quadrant === q.id}
          onClick={() => {
            onMove(q.id);
            onClose();
          }}
          className={clsx(
            "menu-item",
            task.quadrant === q.id && "text-[var(--ink)]",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--tone)]" />
          {q.label}
          {task.quadrant === q.id ? (
            <svg viewBox="0 0 12 12" className="ml-auto h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.2 4.8 8.5 9.5 3.8" />
            </svg>
          ) : null}
        </button>
      ))}

      <p className="mt-1 border-t border-[var(--line)] px-2.5 pb-1 pt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--label)]">
        Deadline
      </p>
      {dates.map((date) => (
        <button
          key={date.label}
          data-item
          role="menuitem"
          onClick={() => {
            onSchedule(date.value);
            onClose();
          }}
          className="menu-item"
        >
          {date.label}
        </button>
      ))}

      <label className="menu-item cursor-pointer">
        Pick a date
        <input
          data-item
          type="date"
          value={task.due ?? ""}
          onChange={(event) => {
            onSchedule(event.target.value || null);
            onClose();
          }}
          className="ml-auto w-[112px] bg-transparent text-right text-[12px] tabular-nums text-[var(--label)] outline-none"
        />
      </label>

      {task.due ? (
        <button data-item role="menuitem" onClick={() => { onSchedule(null); onClose(); }} className="menu-item">
          Clear deadline
        </button>
      ) : null}

      <button
        data-item
        role="menuitem"
        onClick={() => {
          onRemove();
          onClose();
        }}
        className="menu-item mt-1 border-t border-[var(--line)] text-[var(--warn)] hover:text-[var(--warn)]"
      >
        Delete task
      </button>
    </div>
  );
}
