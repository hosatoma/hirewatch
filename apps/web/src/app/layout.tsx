import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HireWatch",
  description: "採用候補者の停滞を検知する採用支援ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}