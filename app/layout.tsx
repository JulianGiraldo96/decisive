import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/Theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Decisive | A local first decision matrix",
  description:
    "One capture field, four consequence quadrants, a calendar of deadlines. Your tasks stay in your browser.",
  openGraph: {
    title: "Decisive",
    description: "A local first decision matrix with a deadline calendar.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* The theme is written onto <html> before React hydrates, which is the
       point: it is what stops a dark board from flashing white. React then
       finds an attribute the server never rendered, and this is the documented
       way to tell it that this element is expected to differ. */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable}`}
    >
      <body className="bg-bg text-ink">
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
