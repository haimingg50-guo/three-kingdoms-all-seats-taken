import type { Metadata } from "next";
import localFont from "next/font/local";
import { LocaleProvider } from "@/i18n/provider";
import "./globals.css";

const fontZh = localFont({
  src: "../fonts/fusion-pixel-12px-zh_hans.woff2",
  variable: "--font-zh",
  display: "swap",
  adjustFontFallback: false,
});

const fontJa = localFont({
  src: "../fonts/fusion-pixel-12px-ja.woff2",
  variable: "--font-ja",
  display: "swap",
  adjustFontFallback: false,
});

const fontKo = localFont({
  src: "../fonts/fusion-pixel-12px-ko.woff2",
  variable: "--font-ko",
  display: "swap",
  adjustFontFallback: false,
});

const fontEn = localFont({
  src: "../fonts/fusion-pixel-12px-latin.woff2",
  variable: "--font-en",
  display: "swap",
  adjustFontFallback: false,
});

const BOOT = `try{var k=localStorage.getItem("tianxia-locale");var n=(navigator.language||"").toLowerCase();var l=k||(n.indexOf("ja")===0?"ja":n.indexOf("ko")===0?"ko":n.indexOf("zh")===0?"zh":n?"en":"zh");var lang=l==="zh"?"zh-CN":l==="ja"?"ja":l==="ko"?"ko":"en";document.documentElement.lang=lang;document.documentElement.dataset.locale=l;var titles={zh:"三国全员在线",en:"Three Kingdoms: All Seats Taken",ja:"三国全員オンライン",ko:"삼국 전원 접속"};document.title=titles[l]||titles.zh;}catch(e){}`;

export const metadata: Metadata = {
  title: "三国全员在线",
  description: "三国全员在线。没有剧本，席位由真人坐满。有人统一，这一局就结束。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-locale="zh" suppressHydrationWarning className={`${fontZh.variable} ${fontJa.variable} ${fontKo.variable} ${fontEn.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
