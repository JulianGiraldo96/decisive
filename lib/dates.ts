/* Deadlines are days, not moments.

   Every date in the app is a local yyyy-mm-dd string. Parsing one back into a
   Date always lands at noon: midnight plus a DST shift can roll a date into
   the previous day, and a deadline that quietly moves is worse than no
   deadline at all. */

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = fromISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/* Negative means the deadline has passed. */
export function daysUntil(iso: string, from: string = todayISO()): number {
  const ms = fromISO(iso).getTime() - fromISO(from).getTime();
  return Math.round(ms / 86_400_000);
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const WEEKDAY_INITIALS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/* How a deadline reads in a task row. Short, and it says late out loud,
   because a row that only shows a date makes you do the subtraction. */
export function formatDue(iso: string, from: string = todayISO()): string {
  const delta = daysUntil(iso, from);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "1 day late";
  if (delta < 0) return `${Math.abs(delta)} days late`;
  if (delta < 7) return `In ${delta} days`;
  const date = fromISO(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
}

export type DueState = "none" | "late" | "today" | "soon" | "later";

export function dueState(iso: string | null, from: string = todayISO()): DueState {
  if (!iso) return "none";
  const delta = daysUntil(iso, from);
  if (delta < 0) return "late";
  if (delta === 0) return "today";
  if (delta <= 3) return "soon";
  return "later";
}

/* Six weeks of cells, Monday first, so the grid never changes height between
   months and the rows below it do not jump when you page through. */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1, 12);
  /* getDay() is Sunday based, the grid is Monday based */
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead, 12);
  const cells: string[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    cells.push(toISO(day));
  }
  return cells;
}

export function isSameMonth(iso: string, year: number, month: number): boolean {
  const date = fromISO(iso);
  return date.getFullYear() === year && date.getMonth() === month;
}

/* Capture parsing.

   The capture field is one line, so the deadline has to travel inside the
   text. A trailing token after @ is read as a date and removed from the title:
   "Send the estimate @friday" becomes a task called "Send the estimate" due on
   the next Friday. Anything unrecognised is left in the title untouched, which
   means typing an email address can never eat half your sentence. */
export function parseCapture(input: string, from: string = todayISO()): {
  text: string;
  due: string | null;
} {
  const match = input.match(/\s@([^\s@]+)\s*$/);
  if (!match) return { text: input.trim(), due: null };

  const due = parseDueToken(match[1], from);
  if (!due) return { text: input.trim(), due: null };

  return { text: input.slice(0, match.index).trim(), due };
}

export function parseDueToken(raw: string, from: string = todayISO()): string | null {
  const token = raw.toLowerCase();

  if (token === "today") return from;
  if (token === "tomorrow" || token === "tmr") return addDays(from, 1);

  /* @3d, @2w */
  const span = token.match(/^(\d+)([dw])$/);
  if (span) {
    const n = Number(span[1]);
    return addDays(from, span[2] === "w" ? n * 7 : n);
  }

  /* @friday, @fri: the next one, today included */
  const weekday = WEEKDAYS.findIndex((d) => d === token || d.slice(0, 3) === token);
  if (weekday >= 0) {
    const current = fromISO(from).getDay();
    const ahead = (weekday - current + 7) % 7;
    return addDays(from, ahead);
  }

  /* @2026-10-12 */
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;

  /* @12/10 and @12/10/2026, day first */
  const slash = token.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    const year = slash[3]
      ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3])
      : fromISO(from).getFullYear();
    const date = new Date(year, month, day, 12);
    if (date.getMonth() !== month) return null;
    return toISO(date);
  }

  return null;
}
