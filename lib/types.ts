/* One task, one place. Everything the app renders is derived from this shape:
   the matrix reads `quadrant`, the calendar reads `due`, the notification bar
   reads both plus `done`. Nothing is stored twice. */

export type QuadrantId = "do" | "schedule" | "delegate" | "eliminate";

export type Task = {
  id: string;
  text: string;
  quadrant: QuadrantId;
  /* ISO date, yyyy-mm-dd, or null when the task has no deadline. Stored as a
     plain date rather than a timestamp: a deadline is a day, not a moment, and
     a timestamp would drift across timezones on export. */
  due: string | null;
  done: boolean;
  createdAt: number;
  completedAt: number | null;
};

export type QuadrantMeta = {
  id: QuadrantId;
  label: string;
  rule: string;
  /* the css custom property this quadrant borrows from the theme */
  tone: "warn" | "accent" | "cool" | "label";
  empty: string;
};

/* Axis order is fixed by the method, not by taste: urgent on the left,
   important on top. The grid is authored in this order and never sorted. */
export const QUADRANTS: QuadrantMeta[] = [
  {
    id: "do",
    label: "Do",
    rule: "Urgent and important",
    tone: "warn",
    empty: "Nothing on fire.",
  },
  {
    id: "schedule",
    label: "Schedule",
    rule: "Important, not urgent",
    tone: "accent",
    empty: "Nothing booked yet.",
  },
  {
    id: "delegate",
    label: "Delegate",
    rule: "Urgent, not important",
    tone: "cool",
    empty: "Nothing to hand over.",
  },
  {
    id: "eliminate",
    label: "Eliminate",
    rule: "Neither, and it shows",
    tone: "label",
    empty: "Nothing to cut.",
  },
];

export const QUADRANT_BY_ID: Record<QuadrantId, QuadrantMeta> = Object.fromEntries(
  QUADRANTS.map((q) => [q.id, q]),
) as Record<QuadrantId, QuadrantMeta>;
