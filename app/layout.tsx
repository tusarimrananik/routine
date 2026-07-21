import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Routine Attendance Tracker",
  description: "Class routine, CT schedule, and attendance tracker",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
