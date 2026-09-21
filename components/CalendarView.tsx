"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { QUADRANT_BY_ID, type Task } from "@/lib/types";
import {
  WEEKDAY_INITIALS,
  fromISO,
  isSameMonth,
  monthGrid,
  monthLabel,
  todayISO,
} from "@/lib/dates";
import { useDrag } from "@/lib/drag";
import { TaskRow } from "./TaskRow";
import { rowActions, type BoardActions } from "./Matrix";

/* The deadline calendar.

   The matrix answers what a task is worth. This answers when it lands, which
   is the question the matrix cannot hold: "important, not urgent" is a
   category, not a date, and a quadrant full of them hides the week they all
   come due in.

   Dragging a chip to another day reschedules it. That is deliberately the same
   gesture as dragging a card between quadrants: one thing to learn, two places
   it works. */
export function CalendarView({ tasks, actions }: { tasks: Task[]; actions: BoardActions }) {
  const today = todayISO();
  const now = fromISO(today);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string>(today);
  const drag = useDrag();

  const active = useMemo(() => tasks.filter((t) => !t.done), [tasks]);

  /* One pass, not one filter per cell: forty two cells times every task is a
     lot of work to redo whenever anything else on the page changes. */
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of active) {
      if (!task.due) continue;
      const bucket = map.get(task.due);
      if (bucket) bucket.push(task);
      else map.set(task.due, [task]);
    }
    return map;
  }, [active]);

  const undated = active.filter((t) => !t.due);
  const cells = monthGrid(cursor.year, cursor.month);
  const selectedTasks = byDay.get(selected) ?? [];
  const dragging = Boolean(drag.state);

  function step(delta: number) {
    setCursor((current) => {
      const date = new Date(current.year, current.month + delta, 1, 12);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rise">
        <header className="mb-2.5 flex items-center justify-between">
          <h2 className="month-title">{monthLabel(cursor.year, cursor.month)}</h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="tap pill-icon">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
                setSelected(today);
              }}
              className="tap pill"
            >
              Today
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next month" className="tap pill-icon">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 3.5 4.5 4.5L6 12.5" />
              </svg>
            </button>
          </div>
        </header>

        <div className="mb-1 grid grid-cols-7 gap-1 px-1">
          {WEEKDAY_INITIALS.map((day) => (
            <span key={day} className="axis">{day}</span>
          ))}
        </div>

        <div className={clsx("calendar-grid", dragging && "is-receiving")}>
          {cells.map((iso) => {
            const dayTasks = byDay.get(iso) ?? [];
            const outside = !isSameMonth(iso, cursor.year, cursor.month);
            const weekend = [0, 6].includes(fromISO(iso).getDay());
            const passed = iso < today;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                data-drop-kind="day"
                data-drop-value={iso}
                data-outside={outside}
                data-today={iso === today}
                data-weekend={weekend}
                aria-label={`${fullDate(iso)}, ${dayTasks.length} due`}
                aria-pressed={selected === iso}
                className={clsx(
                  "calendar-cell",
                  drag.state?.over === `day:${iso}` && "is-over",
                  selected === iso && "is-selected",
                )}
              >
                <span className="calendar-date">{fromISO(iso).getDate()}</span>

                <div className="mt-1 flex flex-col gap-[3px]">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      onPointerDown={(event) => drag.start(event, task)}
                      data-tone={QUADRANT_BY_ID[task.quadrant].tone}
                      className={clsx("day-chip touch-none", passed && "opacity-70")}
                      title={task.text}
                    >
                      <span className="h-1 w-1 flex-none rounded-full bg-current" />
                      <span className="truncate">{task.text}</span>
                    </span>
                  ))}
                  {dayTasks.length > 3 ? (
                    <span className="px-1 text-[10px] tabular-nums text-[var(--label)]">
                      {dayTasks.length - 3} more
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="flex flex-col gap-3">
        <section className="panel rise rise-1">
          <h3 className="panel-title">{selected === today ? "Today" : headingDate(selected)}</h3>
          {selectedTasks.length === 0 ? (
            <p className="px-1 py-4 text-[13px] text-[var(--label)]">
              Nothing due. Drag a task onto this day to give it the deadline.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {selectedTasks.map((task) => (
                <TaskRow key={task.id} task={task} actions={rowActions(actions, task)} />
              ))}
            </div>
          )}
        </section>

        {/* The staging rail. Everything in here is real work with no date on
            it, which is exactly how work goes quietly missing. */}
        <section className="panel rise rise-2">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="panel-title !mb-0">No deadline</h3>
            <span className="text-[12px] tabular-nums text-[var(--label)]">{undated.length}</span>
          </div>
          {undated.length === 0 ? (
            <p className="px-1 py-3 text-[13px] text-[var(--label)]">Every task has a date.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {undated.map((task) => (
                <span
                  key={task.id}
                  onPointerDown={(event) => drag.start(event, task)}
                  data-tone={QUADRANT_BY_ID[task.quadrant].tone}
                  className="rail-chip touch-none"
                  title={task.text}
                >
                  <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--tone)]" />
                  <span className="truncate">{task.text}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function fullDate(iso: string): string {
  return fromISO(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function headingDate(iso: string): string {
  return fromISO(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
