"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { QUADRANT_BY_ID, type Task } from "@/lib/types";
import { addDays, daysUntil, formatDue, todayISO } from "@/lib/dates";

/* Notifications, at the top, where a deadline can still change the day.

   This is not a feed and it does not accumulate. It is a live reading of the
   board, derived from the same tasks everything else renders, so it can never
   disagree with them. Three bands, ordered by how little time is left rather
   than by when the task was written.

   Nothing here can be dismissed, because a dismissed deadline is still a
   deadline. What it offers instead is the two actions that actually resolve
   one: finish it, or move it. */

type Band = {
  id: "late" | "today" | "soon";
  label: string;
  tone: "warn" | "accent" | "cool";
  tasks: Task[];
};

export function Notifications({
  tasks,
  onToggle,
  onSchedule,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onSchedule: (id: string, due: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const today = todayISO();

  const bands = useMemo<Band[]>(() => {
    const dated = tasks
      .filter((t) => !t.done && t.due)
      .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));

    const groups: Band[] = [
      {
        id: "late",
        label: "Overdue",
        tone: "warn",
        tasks: dated.filter((t) => daysUntil(t.due as string, today) < 0),
      },
      {
        id: "today",
        label: "Due today",
        tone: "accent",
        tasks: dated.filter((t) => daysUntil(t.due as string, today) === 0),
      },
      {
        id: "soon",
        label: "Next three days",
        tone: "cool",
        tasks: dated.filter((t) => {
          const delta = daysUntil(t.due as string, today);
          return delta > 0 && delta <= 3;
        }),
      },
    ];

    return groups.filter((band) => band.tasks.length > 0);
  }, [tasks, today]);

  const total = bands.reduce((sum, band) => sum + band.tasks.length, 0);
  const urgent = bands.find((b) => b.id === "late");

  if (total === 0) {
    return (
      <div className="notice rise" role="status" aria-live="polite">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" />
          <p className="text-[13px] text-[var(--secondary)]">
            Nothing is due in the next three days. The board is yours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-tone={urgent ? "warn" : "accent"}
      className="notice rise"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <span
          className={clsx(
            "h-1.5 w-1.5 flex-none rounded-full bg-[var(--tone)]",
            urgent && "breathe",
          )}
        />
        <span className="text-[13px] font-medium text-[var(--ink)]">
          {urgent
            ? `${urgent.tasks.length} ${urgent.tasks.length === 1 ? "deadline has" : "deadlines have"} passed`
            : "Deadlines ahead"}
        </span>

        <span className="flex flex-wrap items-center gap-1.5">
          {bands.map((band) => (
            <span key={band.id} data-tone={band.tone} className="band-chip">
              <span className="tabular-nums">{band.tasks.length}</span>
              {band.label.toLowerCase()}
            </span>
          ))}
        </span>

        <svg
          viewBox="0 0 16 16"
          className={clsx(
            "chevron ml-auto h-3.5 w-3.5 flex-none text-[var(--label)]",
            open && "is-open",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 6 4.5 4.5L12.5 6" />
        </svg>
      </button>

      {open ? (
        <div className="border-t border-[var(--line)] px-2 pb-2 pt-1.5">
          {bands.map((band) => (
            <div key={band.id} data-tone={band.tone} className="mb-1 last:mb-0">
              <p className="axis px-2 py-1">{band.label}</p>
              <ul className="flex flex-col">
                {band.tasks.map((task) => (
                  <li key={task.id} className="notice-row group">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--tone)]" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink)]">
                      {task.text}
                    </span>
                    <span className="hidden flex-none text-[11px] text-[var(--label)] sm:inline">
                      {QUADRANT_BY_ID[task.quadrant].label}
                    </span>
                    <span className="flex-none text-right text-[11px] font-medium tabular-nums text-[var(--tone)] sm:w-[76px]">
                      {formatDue(task.due as string)}
                    </span>

                    {/* hover reveals nothing on a touch screen, so below sm
                        these stay visible and the row is simply taller */}
                    <span className="flex flex-none items-center gap-0.5 transition-opacity focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
                      <button
                        type="button"
                        onClick={() => onSchedule(task.id, addDays(today, 1))}
                        className="tap quiet-button"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggle(task.id)}
                        className="tap quiet-button"
                      >
                        Done
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
