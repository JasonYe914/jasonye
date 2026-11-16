/*
 * Whether the intro has already played on this page load. Kept in a module,
 * so it lasts across client-side navigation (a project page and back) but
 * resets on a reload, which is the one time the intro should play again.
 */

let played = false;

export const intro = {
  played: () => played,
  markPlayed() {
    played = true;
  },
};

/**
 * Fired on `window` when the intro is passed over (the gallery closed onto
 * another panel, not the world), so the world settles straight away.
 */
export const INTRO_SKIPPED_EVENT = "intro:skipped";
