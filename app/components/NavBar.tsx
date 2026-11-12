"use client";

import { useState, type ReactNode } from "react";

/**
 * Placeholder destinations. Swap the labels and icons once the pages
 * exist; each will most likely become a <Link href="..."> instead of a
 * button.
 */
const ITEMS: { id: string; label: string; icon: ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" />
    ),
  },
  {
    id: "projects",
    label: "Projects",
    icon: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.75" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </>
    ),
  },
  {
    id: "contact",
    label: "Contact",
    icon: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
      </>
    ),
  },
];

/**
 * A vertical dock on the left edge, in the same frosted glass as the theme
 * toggle. Each icon shows its name to the right on hover or focus.
 */
export default function NavBar() {
  const [active, setActive] = useState("home");

  return (
    <nav
      aria-label="Main"
      className="chrome fixed top-1/2 left-4 z-40 flex -translate-y-1/2 flex-col gap-1.5 rounded-full p-1.5"
    >
      {ITEMS.map((item) => {
        const current = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            aria-label={item.label}
            aria-current={current ? "page" : undefined}
            className="nav-item group relative grid size-11 place-items-center rounded-full"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {item.icon}
            </svg>
            <span className="nav-tip chrome pointer-events-none absolute left-full ml-3 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
