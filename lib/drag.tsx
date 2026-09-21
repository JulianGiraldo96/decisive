"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { animate } from "motion";
import type { Task } from "./types";

/* Dragging, done properly.

   The HTML5 drag and drop API was the obvious first choice and the wrong one.
   It gives you a browser drawn ghost you cannot style, no position updates
   between dragover events, no velocity, and nothing to interrupt: the card
   detaches from the pointer the moment you start moving it. On a board whose
   entire purpose is moving things around, that is the interaction.

   So this tracks the pointer directly. The card stays glued to the finger from
   the exact point it was grabbed, tilts the way it is being thrown, and when it
   lands it settles on a spring rather than snapping. Dropping nowhere springs
   it home instead of vanishing it.

   Everything a task can be dropped on declares itself with data-drop, so the
   two surfaces that accept drops, quadrants and calendar days, need no shared
   registry: the element under the pointer is the answer. */

export type DropPayload = { kind: "quadrant" | "day"; value: string };

type DragState = {
  task: Task;
  /* where the pointer is now, and where inside the card it was grabbed, so the
     card keeps the offset it was picked up by instead of snapping to centre */
  x: number;
  y: number;
  grabX: number;
  grabY: number;
  width: number;
  tilt: number;
  over: string | null;
};

type DragApi = {
  state: DragState | null;
  /* returns the props a draggable card spreads onto itself */
  start: (event: React.PointerEvent, task: Task) => void;
};

const Context = createContext<DragApi | null>(null);

const THRESHOLD = 8;

/* The portal has nowhere to go until there is a document. Nothing to
   subscribe to: this is only the server render against the client one. */
const noSubscribe = () => () => {};

export function useDrag(): DragApi {
  const api = useContext(Context);
  if (!api) throw new Error("useDrag must be used inside DragProvider");
  return api;
}

/* The element under the pointer, or the nearest ancestor of it, that accepts
   drops. The floating card sets pointer-events: none so it never shadows the
   surface it is hovering. */
function dropUnder(x: number, y: number): { key: string; payload: DropPayload } | null {
  const element = document.elementFromPoint(x, y);
  const zone = element?.closest<HTMLElement>("[data-drop-kind]");
  if (!zone) return null;
  const kind = zone.dataset.dropKind as DropPayload["kind"] | undefined;
  const value = zone.dataset.dropValue;
  if (!kind || !value) return null;
  return { key: `${kind}:${value}`, payload: { kind, value } };
}

export function DragProvider({
  children,
  onDrop,
  renderCard,
}: {
  children: React.ReactNode;
  onDrop: (taskId: string, target: DropPayload) => void;
  renderCard: (task: Task) => React.ReactNode;
}) {
  const [state, setState] = useState<DragState | null>(null);
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const floating = useRef<HTMLDivElement>(null);

  /* Refs, not state, for everything the pointer handlers read: a move event
     fires far more often than React should re-render, and reading stale state
     inside a listener is the classic way this goes wrong. */
  const session = useRef<{
    task: Task;
    pointerId: number;
    originX: number;
    originY: number;
    grabX: number;
    grabY: number;
    width: number;
    origin: DOMRect;
    active: boolean;
    lastX: number;
    lastT: number;
    velocity: number;
    over: string | null;
    payload: DropPayload | null;
  } | null>(null);

  const finish = useCallback(
    (commit: boolean) => {
      const current = session.current;
      session.current = null;
      if (!current) return;

      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");

      if (!current.active) {
        setState(null);
        return;
      }

      const node = floating.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (commit && current.payload) {
        onDrop(current.task.id, current.payload);
        setState(null);
        return;
      }

      /* Dropped on nothing. The card goes back where it came from, at the
         velocity it was released with, because a card that simply disappears
         reads as data loss. */
      if (!node || reduced) {
        setState(null);
        return;
      }

      const rect = node.getBoundingClientRect();
      animate(
        node,
        { x: current.origin.left - rect.left, y: current.origin.top - rect.top, scale: 1 },
        { type: "spring", bounce: 0.1, duration: 0.42, velocity: current.velocity },
      ).finished.finally(() => setState(null));
    },
    [onDrop],
  );

  const start = useCallback(
    (event: React.PointerEvent, task: Task) => {
      /* Left button or touch only, and never from a control inside the card.
         The guard names the controls explicitly rather than excluding every
         button: the task title is itself a button, so blocking buttons
         wholesale makes the largest part of the card undraggable. Below the
         movement threshold nothing is claimed, so a click on the title still
         opens the editor. */
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, a, [data-no-drag]")) return;

      const card = event.currentTarget as HTMLElement;
      const rect = card.getBoundingClientRect();

      session.current = {
        task,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        grabX: event.clientX - rect.left,
        grabY: event.clientY - rect.top,
        /* a calendar chip is a fraction of the width of the card it stands
           for, so the thing in the air is always a real card */
        width: Math.max(rect.width, 248),
        origin: rect,
        active: false,
        lastX: event.clientX,
        lastT: event.timeStamp,
        velocity: 0,
        over: null,
        payload: null,
      };

      card.setPointerCapture(event.pointerId);
    },
    [],
  );

  /* One listener set for the whole board rather than one per card. */
  useEffect(() => {
    function move(event: PointerEvent) {
      const current = session.current;
      if (!current || event.pointerId !== current.pointerId) return;

      const dx = event.clientX - current.originX;
      const dy = event.clientY - current.originY;

      if (!current.active) {
        /* Hysteresis: below the threshold this is still a click, and treating
           it as a drag would make every checkbox tap feel unstable. */
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        current.active = true;
        document.body.style.setProperty("cursor", "grabbing");
        document.body.style.setProperty("user-select", "none");
      }

      const dt = Math.max(event.timeStamp - current.lastT, 1);
      current.velocity = ((event.clientX - current.lastX) / dt) * 1000;
      current.lastX = event.clientX;
      current.lastT = event.timeStamp;

      const zone = dropUnder(event.clientX, event.clientY);
      current.over = zone?.key ?? null;
      current.payload = zone?.payload ?? null;

      setState({
        task: current.task,
        x: event.clientX,
        y: event.clientY,
        grabX: current.grabX,
        grabY: current.grabY,
        width: current.width,
        /* the card leans the way it is being thrown, which is the cheapest
           possible way to telegraph where it is going */
        tilt: Math.max(-4, Math.min(4, current.velocity / 460)),
        over: current.over,
      });
    }

    function up(event: PointerEvent) {
      const current = session.current;
      if (!current || event.pointerId !== current.pointerId) return;
      finish(true);
    }

    function cancel() {
      if (session.current) finish(false);
    }

    function key(event: KeyboardEvent) {
      /* Escape aborts a drag in flight, the same as every other drag surface
         the user has ever used. */
      if (event.key === "Escape" && session.current) finish(false);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
  }, [finish]);

  const api = useMemo<DragApi>(() => ({ state, start }), [state, start]);

  return (
    <Context.Provider value={api}>
      {children}
      {mounted && state
        ? createPortal(
            <div
              ref={floating}
              aria-hidden
              /* fixed and pointer-events none: it rides above the board without
                 ever being the element the pointer resolves to */
              className="pointer-events-none fixed left-0 top-0 z-50 will-change-transform"
              style={{
                width: state.width,
                transform: `translate3d(${state.x - state.grabX}px, ${state.y - state.grabY}px, 0) rotate(${state.tilt}deg) scale(1.02)`,
              }}
            >
              <div className="drag-ghost">{renderCard(state.task)}</div>
            </div>,
            document.body,
          )
        : null}
    </Context.Provider>
  );
}
