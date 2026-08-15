import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "弦音 Tuner — 极简 Android 调音器",
  description: "免费、开源、保护隐私的 Android 乐器调音器，支持吉他、尤克里里和小提琴。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

