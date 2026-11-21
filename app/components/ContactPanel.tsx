"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { EMAIL, EMAIL_HREF, GITHUB, LINKEDIN } from "./contact";

/*
 * Contact: one small card floating over the world, opened from the dock.
 * Three rows, one per way to reach me, each marked by a tile in one of
 * the name's hues. Email can also be copied in one click.
 */

type Contact = {
  id: string;
  label: string;
  /** What the row shows: the address or handle, without the https://. */
  value: string;
  href: string;
  /** Which of the name's hues marks the row, --name-1 to --name-4. */
  hue: 1 | 2 | 3 | 4;
  icon: ReactNode;
  /** Whether the row also offers to copy `value`. */
  copy?: boolean;
};

const CONTACTS: Contact[] = [
  {
    id: "email",
    label: "Email",
    value: EMAIL,
    href: EMAIL_HREF,
    hue: 1,
    copy: true,
    icon: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
      </>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    value: "linkedin.com/in/jasonyequeens",
    href: LINKEDIN,
    hue: 2,
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        <path d="M8 10.5V16M8 7.75v.01M11.5 16v-5.5M11.5 13a2.5 2.5 0 0 1 5 0v3" />
      </>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    value: "github.com/JasonYe914",
    href: GITHUB,
    hue: 3,
    icon: (
      <path d="M9 19c-4 1.3-4-2-6-2.5m12 4.5v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.6 2.6 5.6 2.9 5.6 2.9a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.3c0 4.6 2.9 5.7 5.6 6a3 3 0 0 0-.8 2.3V21" />
    ),
  },
];

/**
 * An address with places it may break onto a second line, after its "@"
 * and each "/", for a phone too narrow to show it whole on one.
 */
function breakable(value: string) {
  return value.split(/(?<=[@/])/).map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

export default function ContactPanel({ onClose }: { onClose: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // Keep keys from walking the chicken while the card is open.
    event.stopPropagation();
    if (event.key === "Escape") onClose();
  }

  async function copy(contact: Contact) {
    try {
      await navigator.clipboard.writeText(contact.value);
      setCopied(contact.id);
    } catch {
      // No clipboard (an insecure page, or permission refused): the link still works.
    }
  }

  return (
    <div className="contact-scrim" onClick={onClose}>
      <section
        ref={root}
        id="contact-panel"
        className="contact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="contact-head">
          <h2 id="contact-title">Say hello</h2>
          <button
            type="button"
            className="gallery-close"
            onClick={onClose}
            aria-label="Close contact"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <ul className="contact-list">
          {CONTACTS.map((contact) => (
            <li
              key={contact.id}
              className="contact-row"
              style={{ "--hue": `var(--name-${contact.hue})` } as React.CSSProperties}
            >
              <a
                className="contact-link"
                href={contact.href}
                {...(contact.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <span className="contact-tile" aria-hidden="true">
                  <svg viewBox="0 0 24 24">{contact.icon}</svg>
                </span>
                <span className="contact-text">
                  <span className="contact-label">{contact.label}</span>
                  <span className="contact-value">{breakable(contact.value)}</span>
                </span>
                <svg className="contact-arrow" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
              {contact.copy && (
                <button
                  type="button"
                  className="contact-copy"
                  onClick={() => copy(contact)}
                  aria-label={`Copy ${contact.label.toLowerCase()} address`}
                >
                  {copied === contact.id ? "Copied" : "Copy"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">
          {copied ? "Copied to clipboard" : ""}
        </p>
      </section>
    </div>
  );
}
