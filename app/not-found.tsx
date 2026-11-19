import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "./components/SiteFooter";

export const metadata: Metadata = { title: "Page not found · Jason Ye" };

/** Any address the site doesn't have. Laid out like a project page. */
export default function NotFound() {
  return (
    <main className="project">
      <nav className="project-nav">
        <Link href="/" className="project-back">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back to the world
        </Link>
      </nav>

      <header className="project-head">
        <p className="project-meta">404</p>
        <h1>Page not found</h1>
      </header>

      <section className="project-section">
        <p>
          There&apos;s nothing at this address. Head back to the world, or open
          the projects from the dock.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
