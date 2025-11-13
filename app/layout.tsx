import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoodMatch - Personalized Recommendations",
  description: "Get personalized book, meal, and activity recommendations based on how you feel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

