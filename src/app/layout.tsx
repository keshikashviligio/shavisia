import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";

const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-georgian",
  subsets: ["georgian", "latin"],
});

export const metadata: Metadata = {
  title: "shavisia.ge",
  description:
    "დაამატე ან გადაამოწმე მძღოლი მართვის მოწმობის ნომრით — შავი სია ავტომობილების გამქირავებლებისთვის",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" className={`${notoGeorgian.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
