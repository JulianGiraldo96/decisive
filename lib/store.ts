"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { QuadrantId, Task } from "./types";
import { addDays, todayISO } from "./dates";

const KEY = "todone.tasks.v1";

/* The app was called Decisive before it was called ToDone. Anyone who used it
   under the old name still has their board sitting under the old key, and a
   rename is no reason to lose it: the first read falls back to it, the first
   write lands on the new key, and the old one is cleared once its contents are
   safely moved. */
const LEGACY_KEY = "decisive.tasks.v1";

/* Local first, and that is the whole backend.

   Tasks live in this browser and nowhere else: no account, no sync, no
   network call on the critical path. The trade is that the store has to be
   defensive, because localStorage can be full, disabled, or holding whatever
   an older version of the app wrote. Every read is validated and a bad record
   is dropped rather than crashing the board. */

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.text === "string" &&
    typeof t.quadrant === "string" &&
    ["do", "schedule", "delegate", "eliminate"].includes(t.quadrant) &&
    (t.due === null || typeof t.due === "string") &&
    typeof t.done === "boolean"
  );
}

function read(): Task[] | null {
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isTask);
  } catch {
    return null;
  }
}

function write(tasks: Task[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(tasks));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* a full or blocked store is not a reason to lose the session: the board
       keeps working in memory until the tab closes */
  }
}

function id(): string {
  return `t_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function makeTask(
  text: string,
  quadrant: QuadrantId = "do",
  due: string | null = null,
): Task {
  return {
    id: id(),
    text,
    quadrant,
    due,
    done: false,
    createdAt: Date.now(),
    completedAt: null,
  };
}

/* Enough content to show what the four quadrants are for without explaining
   them, and dated relative to now so the calendar and the notification bar are
   never empty on a first visit. */
export function demoTasks(): Task[] {
  const today = todayISO();
  return [
    makeTask("Send the revised estimate to the client", "do", addDays(today, -1)),
    makeTask("Fix the broken export on the ops dashboard", "do", today),
    makeTask("Write the case study for the warehouse project", "schedule", addDays(today, 2)),
    makeTask("Book the quarterly research sessions", "schedule", addDays(today, 9)),
    makeTask("Set up the design token sync", "schedule", null),
    makeTask("Chase the invoice from last month", "delegate", addDays(today, 3)),
    makeTask("Collect the screenshots for the release notes", "delegate", null),
    makeTask("Rebuild the slide deck nobody asked for", "eliminate", null),
  ];
}

export type Snapshot = { tasks: Task[]; label: string };

/* Nothing to subscribe to: this only ever needs the difference between the
   server render and the first client render. */
const noSubscribe = () => () => {};

export function useTasks() {
  /* The board is read from localStorage in the state initialiser rather than
     in an effect, so it is there on the very first client render instead of
     arriving one render later. The server cannot read it, so `ready` is false
     during hydration and true immediately after: the markup React hydrates
     matches the markup the server sent, and no state is set from an effect to
     make that happen. */
  const ready = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    typeof window === "undefined" ? [] : (read() ?? demoTasks()),
  );
  const [undo, setUndo] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!ready) return;
    write(tasks);
  }, [tasks, ready]);

  /* Every mutation goes through here so undo is free: the snapshot is taken
     from the state the reducer ran against, not from a copy the caller
     remembered to make. */
  const commit = useCallback(
    (label: string, next: (current: Task[]) => Task[]) => {
      setTasks((current) => {
        setUndo({ tasks: current, label });
        return next(current);
      });
    },
    [],
  );

  const add = useCallback(
    (text: string, quadrant: QuadrantId, due: string | null) => {
      if (!text.trim()) return;
      commit("Task added", (current) => [makeTask(text.trim(), quadrant, due), ...current]);
    },
    [commit],
  );

  const patch = useCallback(
    (taskId: string, label: string, fields: Partial<Task>) => {
      commit(label, (current) =>
        current.map((t) => (t.id === taskId ? { ...t, ...fields } : t)),
      );
    },
    [commit],
  );

  const move = useCallback(
    (taskId: string, quadrant: QuadrantId) => {
      commit("Task moved", (current) =>
        current.map((t) => (t.id === taskId ? { ...t, quadrant } : t)),
      );
    },
    [commit],
  );

  const schedule = useCallback(
    (taskId: string, due: string | null) => {
      commit(due ? "Deadline set" : "Deadline cleared", (current) =>
        current.map((t) => (t.id === taskId ? { ...t, due } : t)),
      );
    },
    [commit],
  );

  const toggle = useCallback(
    (taskId: string) => {
      commit("Task updated", (current) =>
        current.map((t) =>
          t.id === taskId
            ? { ...t, done: !t.done, completedAt: t.done ? null : Date.now() }
            : t,
        ),
      );
    },
    [commit],
  );

  const remove = useCallback(
    (taskId: string) => {
      commit("Task deleted", (current) => current.filter((t) => t.id !== taskId));
    },
    [commit],
  );

  const clearArchive = useCallback(() => {
    commit("Archive cleared", (current) => current.filter((t) => !t.done));
  }, [commit]);

  const restoreDemo = useCallback(() => {
    commit("Demo content restored", () => demoTasks());
  }, [commit]);

  const undoLast = useCallback(() => {
    setUndo((snapshot) => {
      if (snapshot) setTasks(snapshot.tasks);
      return null;
    });
  }, []);

  const dismissUndo = useCallback(() => setUndo(null), []);

  return {
    tasks,
    ready,
    undo,
    add,
    patch,
    move,
    schedule,
    toggle,
    remove,
    clearArchive,
    restoreDemo,
    undoLast,
    dismissUndo,
  };
}
