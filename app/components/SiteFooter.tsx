/**
 * The site's small print: the copyright.
 */
export default function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`site-foot ${className}`.trim()}>
      <span>© 2026 Jason Ye</span>
    </footer>
  );
}
