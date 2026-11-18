/*
 * The email address, assembled when the page runs rather than written out
 * whole, so simple scrapers reading the site's files don't find it. It is
 * only ever shown in panels opened by a visitor, never in the page's HTML.
 */
// Kept reversed: a build's minifier folds a simple join back into the
// whole address, but not this.
const REVERSED = "moc.liamg@419ey.nosaj";

export const EMAIL = REVERSED.split("").reverse().join("");
export const EMAIL_HREF = `mailto:${EMAIL}`;
export const LINKEDIN = "https://www.linkedin.com/in/jasonyequeens/";
export const GITHUB = "https://github.com/JasonYe914";
