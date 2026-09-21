"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { QUADRANTS, type QuadrantId } from "@/lib/types";
import { formatDue, parseCapture } from "@/lib/dates";

/* One capture field.

   Everything enters the board here. It defaults to Do because the cost of
   sorting a task later is near zero and the cost of stopping to choose a
   quadrant while you are still holding the thought is not.

   The deadline travels inside the text as a trailing @token, so capture stays
   a single keystroke path: type, Enter, gone. The parsed date appears as a
   chip while you type, which is the only way to trust a parser. */
export function Capture({
  onAdd,
}: {
  onAdd: (text: string, quadrant: QuadrantId, due: string | null) => void;
}) {
  const [value, setValue] = useState("");
  const [quadrant, setQuadrant] = useState<QuadrantId>("do");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        input.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const preview = parseCapture(value);

  function submit() {
    if (!preview.text) return;
    onAdd(preview.text, quadrant, preview.due);
    setValue("");
  }

  return (
    <div className="capture">
      <div className="flex items-center gap-1.5">
        <svg
          viewBox="0 0 20 20"
          className="ml-2.5 h-4 w-4 flex-none text-[var(--label)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path strokeLinecap="round" d="M10 4.5v11M4.5 10h11" />
        </svg>
        <input
          ref={input}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") setValue("");
          }}
          aria-label="Add a task"
          placeholder="What needs deciding?"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--label)]"
        />

        {preview.due ? (
          <span className="due-chip tabular-nums">{formatDue(preview.due)}</span>
        ) : null}

        <button type="button" onClick={submit} disabled={!preview.text} className="tap add-button">
          Add
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1 border-t border-[var(--line)] px-1 pt-2">
        <span className="axis mr-1">Into</span>
        {QUADRANTS.map((q) => (
          <button
            key={q.id}
            type="button"
            data-tone={q.tone}
            aria-pressed={quadrant === q.id}
            onClick={() => setQuadrant(q.id)}
            className={clsx("tap quadrant-chip", quadrant === q.id && "is-on")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--tone)]" />
            {q.label}
          </button>
        ))}

        <span className="ml-auto hidden pr-1 text-[11px] text-[var(--label)] lg:block">
          End with <kbd className="kbd">@friday</kbd>, <kbd className="kbd">@tomorrow</kbd> or{" "}
          <kbd className="kbd">@12/10</kbd> to set a deadline
        </span>
      </div>
    </div>
  );
}
