import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stride — Habit Accountability",
  description: "Track habits and share proof with an accountability buddy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
