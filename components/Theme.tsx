"use client";

import { useEffect, useState } from "react";

/* Dark on every load, deliberately.

   The portfolio this borrows its palette from opens dark every single time,
   with no persistence and no system preference sniffing, and the same rule
   holds here so the two surfaces never disagree. The toggle is still real, it
   just only lasts the visit. */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.setAttribute("data-theme","dark")`,
      }}
    />
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light" : "Switch to dark"}
      className="tap pill-icon"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
