/**
 * A script that runs while the HTML is being parsed, before the first
 * paint. On the server it renders as a normal script; on the client React
 * sees it as inert text, so it doesn't warn about rendering a script tag.
 * suppressHydrationWarning covers the type differing between the two.
 * (Pattern from Next's "Preventing flash before hydration" guide.)
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
