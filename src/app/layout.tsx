import type { Metadata, Viewport } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import InstallBanner from "@/components/InstallBanner";
import "./globals.css";

const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-georgian",
  subsets: ["georgian", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shavisia.ge"),
  title: "shavisia.ge",
  description:
    "დაამატე ან გადაამოწმე მძღოლი მართვის მოწმობის ნომრით — შავი სია ავტომობილების გამქირავებლებისთვის",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "shavisia.ge",
    title: "მძღოლების შავი სია",
    description:
      "დაამატე ან გადაამოწმე მძღოლი მართვის მოწმობის ნომრით — შავი სია ავტომობილების გამქირავებლებისთვის",
    locale: "ka_GE",
  },
  twitter: {
    card: "summary_large_image",
    title: "shavisia.ge — მძღოლების შავი სია",
    description:
      "დაამატე ან გადაამოწმე მძღოლი მართვის მოწმობის ნომრით — შავი სია ავტომობილების გამქირავებლებისთვის",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "shavisia.ge",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" className={`${notoGeorgian.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
        <InstallBanner />
      </body>
    </html>
  );
}
