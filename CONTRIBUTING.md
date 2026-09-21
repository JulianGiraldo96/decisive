# Contributing

Issues and pull requests are welcome. A few things worth knowing before you
open one.

## Running it

```bash
npm install
npm run dev
```

There is no database, no environment file and no service to start. The board
lives in `localStorage`, so the only state you have to reason about is in
`lib/store.ts`.

## The shape of the code

- `lib/types.ts` holds the task shape and the four quadrants. The quadrant
  order is fixed by the method, not by taste. Do not sort it.
- `lib/dates.ts` holds every date decision. Deadlines are local `yyyy-mm-dd`
  strings and parse back at noon, so a timezone shift can never roll a date
  into the previous day.
- `lib/store.ts` is the whole persistence layer. Every mutation goes through
  `commit`, which is what makes undo free.
- `lib/drag.tsx` is the pointer based drag. Anything that accepts a drop says
  so with `data-drop-kind` and `data-drop-value`, and nothing has to register
  itself anywhere.
- `app/globals.css` holds the tokens and every component class. Components do
  not name colours directly.

## What a pull request should hold to

- **No em dashes in user facing copy.** Commas, full stops or a middle dot.
- **Keep the keyboard path.** Anything the drag can do, the row menu has to do
  too. A feature that only works by dragging is not finished.
- **Respect the three motion preferences.** `prefers-reduced-motion`,
  `prefers-reduced-transparency` and `prefers-contrast` all have blocks at the
  end of `globals.css`.
- **Animate `transform` and `opacity` only.** Never `filter`, never `width`.
- **Run `npm run lint` and `npm run build` before pushing.** CI runs both.

## What this project is not

It is a decision board with deadlines. It is deliberately not a team tool, a
sync service or a project manager. Features that need an account, a server or
another person are out of scope, and a pull request that adds one will be
closed with thanks.
