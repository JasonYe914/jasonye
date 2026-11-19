/**
 * The site's public address, for metadata, the sitemap and robots.txt.
 * Set NEXT_PUBLIC_SITE_URL in Vercel to the custom domain once it is
 * connected (e.g. https://jasonye.dev). Until then Vercel's own production
 * address is used; VERCEL_PROJECT_PRODUCTION_URL is set by Vercel itself.
 */
function siteUrl() {
  const set = process.env.NEXT_PUBLIC_SITE_URL;
  if (set) return set.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_URL = siteUrl();
export const SITE_NAME = "Jason Ye";
export const SITE_DESCRIPTION =
  "Jason Ye: a Mechanical Engineering student at Queen's University who builds software. Walk an isometric world through his internships and projects.";
