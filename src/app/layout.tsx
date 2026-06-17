import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "Take Seat | 智慧排位工具",
  description: "專業的座位安排工具，輕鬆搞定婚宴、會議與各式活動的座位安排。讓每一位嘉賓都賓至如歸。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
