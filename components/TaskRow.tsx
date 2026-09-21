"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { QuadrantId, Task } from "@/lib/types";
import { dueState, formatDue } from "@/lib/dates";
import { useDrag } from "@/lib/drag";
import { TaskMenu } from "./TaskMenu";

/* Only the two states that cost you something get a colour. Giving every date
   one turns the board into a rainbow and the two that matter stop shouting. */
const DUE_TONE: Record<string, string> = {
  late: "var(--warn)",
  today: "var(--accent)",
  soon: "var(--secondary)",
  later: "var(--label)",
  none: "var(--label)",
};

export type RowActions = {
  onToggle: () => void;
  onRename: (text: string) => void;
  onSchedule: (due: string | null) => void;
  onMove: (quadrant: QuadrantId) => void;
  onRemove: () => void;
};

export function TaskRow({
  task,
  actions,
  /* the copy that rides under the pointer while dragging: same markup, no
     handlers, so what you are holding is exactly what you picked up */
  ghost = false,
}: {
  task: Task;
  actions?: RowActions;
  ghost?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [menu, setMenu] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const drag = useDrag();

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (next && next !== task.text) actions?.onRename(next);
    else setDraft(task.text);
    setEditing(false);
  }

  const state = dueState(task.due);
  const lifted = !ghost && drag.state?.task.id === task.id;

  return (
    <div
      onPointerDown={ghost || editing ? undefined : (event) => drag.start(event, task)}
      className={clsx(
        "task-row group relative flex items-start gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] py-1.5 pl-1.5 pr-1",
        !ghost && "touch-none select-none",
        lifted && "is-lifted",
        task.done && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={actions?.onToggle}
        aria-pressed={task.done}
        aria-label={task.done ? `Mark ${task.text} as not done` : `Mark ${task.text} as done`}
        data-no-drag
        /* the visible circle is 18px, the thing you can hit is 36px */
        className="tap grid h-9 w-9 flex-none place-items-center rounded-lg"
      >
        <span
          className={clsx(
            "grid h-[18px] w-[18px] place-items-center rounded-full border transition-colors duration-150",
            task.done
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--line-strong)] text-transparent group-hover:border-[var(--secondary)]",
          )}
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.2 4.8 8.5 9.5 3.8" />
          </svg>
        </span>
      </button>

      <div className="min-w-0 flex-1 pt-1.5">
        {editing ? (
          <input
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraft(task.text);
                setEditing(false);
              }
            }}
            aria-label="Task name"
            className="w-full bg-transparent text-[14px] leading-snug text-[var(--ink)] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (ghost) return;
              /* The draft is seeded here rather than kept in sync by an
                 effect: it only has to be right at the moment the editor
                 opens, and syncing it on every render of every row is work
                 nobody asked for. */
              setDraft(task.text);
              setEditing(true);
            }}
            className={clsx(
              "block w-full text-left text-[14px] leading-snug text-[var(--ink)]",
              task.done && "line-through decoration-[var(--label)]",
            )}
          >
            {task.text}
          </button>
        )}

        <div className="mt-0.5 flex h-5 items-center">
          {task.due ? (
            <span
              style={{ color: DUE_TONE[state] }}
              className="flex items-center gap-1.5 text-[11px] font-medium tabular-nums"
            >
              <span
                className={clsx(
                  "h-1.5 w-1.5 rounded-full bg-current",
                  state === "late" && !task.done && "breathe",
                )}
              />
              {formatDue(task.due)}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--label)] opacity-0 transition-opacity group-hover:opacity-100">
              No deadline
            </span>
          )}
        </div>
      </div>

      {!ghost && actions ? (
        <div className="relative flex-none" data-no-drag>
          <button
            type="button"
            onClick={() => setMenu((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label={`Actions for ${task.text}`}
            className={clsx(
              "tap grid h-9 w-9 place-items-center rounded-lg text-[var(--label)] transition-colors hover:text-[var(--ink)]",
              "focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-0",
              menu && "!opacity-100 text-[var(--ink)]",
            )}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <circle cx="3" cy="8" r="1.4" />
              <circle cx="8" cy="8" r="1.4" />
              <circle cx="13" cy="8" r="1.4" />
            </svg>
          </button>
          {menu ? (
            <TaskMenu
              task={task}
              onMove={actions.onMove}
              onSchedule={actions.onSchedule}
              onRemove={actions.onRemove}
              onClose={() => setMenu(false)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
