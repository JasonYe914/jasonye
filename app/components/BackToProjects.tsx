"use client";

import Link from "next/link";
import { requestGallery } from "./villageStore";

/**
 * A project page's link back to the gallery. It asks for the gallery as it
 * is clicked, so the home page opens straight onto it rather than showing
 * the world for a frame while the address catches up.
 */
export default function BackToProjects() {
  return (
    <Link href="/?projects" className="project-back" onClick={requestGallery}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
      Projects
    </Link>
  );
}
