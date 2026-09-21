"use client";

import { useState } from "react";
import clsx from "clsx";
import { QUADRANT_BY_ID, type Task } from "@/lib/types";

/* Completed work, kept but folded away.

   Closed by default: the archive is evidence, not a view. It is worth keeping
   because "what did this week actually take" is a question the matrix cannot
   answer once the cards are gone. */
export function Archive({
  tasks,
  onToggle,
  onRemove,
  onClear,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <section className="archive mt-4">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="tap flex flex-1 items-center gap-2.5 rounded-lg px-1 py-1 text-left"
        >
          <svg
            viewBox="0 0 16 16"
            className={clsx("chevron h-3.5 w-3.5 text-[var(--label)]", open && "is-open-right")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
          <span className="text-[13px] font-medium text-[var(--ink)]">Archive</span>
          <span className="text-[12px] tabular-nums text-[var(--label)]">{done.length}</span>
        </button>

        {open && done.length > 0 ? (
          <button type="button" onClick={onClear} className="tap quiet-button">
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-[var(--line)] px-2 pb-2 pt-1.5">
          {done.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-[var(--label)]">Nothing finished yet.</p>
          ) : (
            <ul className="flex flex-col">
              {done.map((task) => (
                <li
                  key={task.id}
                  data-tone={QUADRANT_BY_ID[task.quadrant].tone}
                  className="notice-row group"
                >
                  <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--tone)] opacity-60" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--secondary)] line-through decoration-[var(--label)]">
                    {task.text}
                  </span>
                  <span className="flex flex-none items-center gap-0.5 transition-opacity focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
                    <button type="button" onClick={() => onToggle(task.id)} className="tap quiet-button">
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(task.id)}
                      aria-label={`Delete ${task.text} permanently`}
                      className="tap quiet-button hover:!text-[var(--warn)]"
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
