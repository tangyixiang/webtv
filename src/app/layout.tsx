import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "webtv - 高清视频流媒体平台",
  description: "全网最新的影视、短剧、综艺、动漫一网打尽，纯净无广告的观影体验。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        
        <main className="min-h-screen">
          {children}
        </main>
        
        <footer className="bg-slate-900 border-t border-slate-800 py-8 text-center mt-12">
          <p className="text-gray-500 text-xs">© 2026 webtv Media Platform. Powered by Cloudflare Workers.</p>
        </footer>
      </body>
    </html>
  );
}
