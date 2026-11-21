import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import { InlineScript } from "./components/InlineScript";
import { THEME_SCRIPT } from "./components/theme";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

/**
 * Rounded and friendly, like the name's letters and the words on the
 * world's floor: the one font for the whole site, in every weight.
 */
const fredoka = Fredoka({
  variable: "--font-fun",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION },
};

/**
 * The world runs edge to edge, under a phone's notch and home indicator
 * too; everything fixed over it keeps clear of them with
 * env(safe-area-inset-*) in globals.css. Zooming stays allowed. The
 * theme-color tag is written by THEME_SCRIPT, which knows the theme.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} h-full antialiased`}
      // The inline script sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
