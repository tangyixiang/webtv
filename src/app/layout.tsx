import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
        <nav className="glass-nav fixed top-0 w-full z-50 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Logo & Category Navigation */}
              <div className="flex items-center">
                <Link href="/" className="flex-shrink-0">
                  <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    webtv
                  </span>
                </Link>
                
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-1 lg:space-x-2">
                    <Link href="/" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      首页
                    </Link>
                    <Link href="/?type=1207" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      短剧
                    </Link>
                    <Link href="/?type=1" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      电影
                    </Link>
                    <Link href="/?type=2" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      电视剧
                    </Link>
                    <Link href="/?type=3" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      综艺
                    </Link>
                    <Link href="/?type=4" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      动漫
                    </Link>
                  </div>
                </div>
              </div>

              {/* Search Form */}
              <div className="hidden md:block">
                <form action="/" method="GET" className="relative">
                  <input 
                    type="text" 
                    name="wd" 
                    placeholder="搜索你想看的影片..." 
                    className="bg-slate-800/80 border border-slate-700 text-sm rounded-full px-4 py-1.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-56" 
                  />
                  <button type="submit" className="absolute right-2.5 top-2 text-gray-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
              </div>

              {/* Mobile Menu Quick Links */}
              <div className="flex md:hidden items-center space-x-1.5 overflow-x-auto py-2">
                <Link href="/?type=1207" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">短剧</Link>
                <Link href="/?type=1" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">电影</Link>
                <Link href="/?type=2" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">剧集</Link>
                <Link href="/?type=3" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">综艺</Link>
                <Link href="/?type=4" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">动漫</Link>
              </div>

            </div>
          </div>
        </nav>
        
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
