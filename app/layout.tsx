import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import { InlineScript } from "./components/InlineScript";
import { THEME_SCRIPT } from "./components/theme";
import "./globals.css";

/**
 * Rounded and friendly, like the name's letters and the words on the
 * world's floor: the one font for the whole site, in every weight.
 */
const fredoka = Fredoka({
  variable: "--font-fun",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Personal portfolio",
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
