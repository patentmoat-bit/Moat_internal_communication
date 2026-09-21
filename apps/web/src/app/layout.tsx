import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const ui = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

/* Document voice: headings, disclosure bodies, claim text. */
const document = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-document",
  display: "swap",
});

/* Identifiers and figures: publication numbers, docket refs, scores. */
const numeric = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-numeric",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MOAT",
    template: "%s · MOAT",
  },
  description: "Invention disclosure, prior-art evidence and patent matter management.",
};

/**
 * Applied before first paint so a dark-theme user never sees a white flash.
 * Wrapped in try/catch: storage access throws outright in some privacy modes.
 */
const themeScript = `
try {
  var stored = localStorage.getItem('moat-theme');
  if (stored === 'dark' || stored === 'light') {
    document.documentElement.setAttribute('data-theme', stored);
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${ui.variable} ${document.variable} ${numeric.variable}`}>
        {children}
      </body>
    </html>
  );
}
