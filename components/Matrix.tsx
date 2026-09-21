"use client";

import clsx from "clsx";
import { QUADRANTS, type QuadrantId, type Task } from "@/lib/types";
import { dueState } from "@/lib/dates";
import { useDrag } from "@/lib/drag";
import { TaskRow, type RowActions } from "./TaskRow";

/* The matrix.

   Four panels in the order the method fixes: urgent on the left, important on
   top. They are never sorted or reflowed, because the position of a quadrant
   is the meaning of a quadrant.

   Within a panel, tasks with a deadline float to the top and the latest one
   leads, so a panel answers "what is about to hurt" before it answers "what is
   in here". */
function order(tasks: Task[]): Task[] {
  const weight: Record<string, number> = { late: 0, today: 1, soon: 2, later: 3, none: 4 };
  return [...tasks].sort((a, b) => {
    const delta = weight[dueState(a.due)] - weight[dueState(b.due)];
    if (delta !== 0) return delta;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    return b.createdAt - a.createdAt;
  });
}

export type BoardActions = {
  toggle: (id: string) => void;
  rename: (id: string, text: string) => void;
  schedule: (id: string, due: string | null) => void;
  move: (id: string, quadrant: QuadrantId) => void;
  remove: (id: string) => void;
};

export function rowActions(actions: BoardActions, task: Task): RowActions {
  return {
    onToggle: () => actions.toggle(task.id),
    onRename: (text) => actions.rename(task.id, text),
    onSchedule: (due) => actions.schedule(task.id, due),
    onMove: (quadrant) => actions.move(task.id, quadrant),
    onRemove: () => actions.remove(task.id),
  };
}

export function Matrix({ tasks, actions }: { tasks: Task[]; actions: BoardActions }) {
  const drag = useDrag();
  const active = tasks.filter((t) => !t.done);

  return (
    <div className="mt-6">
      <div className="mb-2 hidden pl-[30px] md:grid md:grid-cols-2 md:gap-3">
        <span className="axis">Urgent</span>
        <span className="axis">Not urgent</span>
      </div>

      <div className="flex gap-3">
        {/* The axes are the only thing that explains why a panel sits where it
            does, so they are labels rather than chrome. */}
        <div className="hidden w-[18px] flex-none flex-col justify-between py-8 md:flex">
          <span className="axis axis-v">Important</span>
          <span className="axis axis-v">Not important</span>
        </div>

        <div className="grid flex-1 gap-3 md:grid-cols-2">
          {QUADRANTS.map((meta, index) => {
            const mine = order(active.filter((t) => t.quadrant === meta.id));
            const isOver = drag.state?.over === `quadrant:${meta.id}`;
            const isTarget = Boolean(drag.state) && drag.state?.task.quadrant !== meta.id;

            return (
              <section
                key={meta.id}
                data-tone={meta.tone}
                data-drop-kind="quadrant"
                data-drop-value={meta.id}
                aria-label={`${meta.label}: ${meta.rule}`}
                className={clsx(
                  "quadrant grain rise",
                  `rise-${index + 1}`,
                  isOver && "is-over",
                  isTarget && !isOver && "is-candidate",
                )}
              >
                <header className="mb-2.5 flex items-baseline gap-2 px-1.5">
                  <span className="h-2 w-2 flex-none translate-y-[-1px] rounded-full bg-[var(--tone)]" />
                  <h2 className="quadrant-title">{meta.label}</h2>
                  <span className="hidden text-[12px] text-[var(--label)] sm:inline">
                    {meta.rule}
                  </span>
                  <span className="ml-auto text-[12px] tabular-nums text-[var(--label)]">
                    {mine.length}
                  </span>
                </header>

                <div className="flex flex-1 flex-col gap-1">
                  {mine.length === 0 ? (
                    <p className="flex flex-1 items-center justify-center px-3 py-8 text-center text-[13px] text-[var(--label)]">
                      {isTarget ? "Drop it here" : meta.empty}
                    </p>
                  ) : (
                    mine.map((task) => (
                      <TaskRow key={task.id} task={task} actions={rowActions(actions, task)} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
