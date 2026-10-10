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



export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body className={`${ui.variable} ${document.variable} ${numeric.variable}`}>
        {children}
      </body>
    </html>
  );
}
