import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchWd, setSearchWd] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchWd.trim()) return;
    navigate(`/?wd=${encodeURIComponent(searchWd.trim())}`);
  };

  return (
    <nav className="glass-nav fixed top-0 w-full z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Navbar Row */}
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Category Navigation */}
          <div className="flex items-center space-x-3 md:space-x-8">
            <Link to="/" className="flex-shrink-0">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                webtv
              </span>
            </Link>
            
            {/* Desktop Nav Links */}
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-1 lg:space-x-2">
                <Link to="/" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  首页
                </Link>
                <Link to="/?type=1207" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  短剧
                </Link>
                <Link to="/?type=1" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  电影
                </Link>
                <Link to="/?type=2" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  电视剧
                </Link>
                <Link to="/?type=3" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  综艺
                </Link>
                <Link to="/?type=4" className="text-gray-300 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  动漫
                </Link>
              </div>
            </div>
          </div>

          {/* Desktop Search Form & Logout */}
          <div className="hidden md:flex items-center space-x-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input 
                type="text" 
                value={searchWd}
                onChange={(e) => setSearchWd(e.target.value)}
                placeholder="搜索你想看的影片..." 
                className="bg-slate-800/80 border border-slate-700 text-sm rounded-full px-4 py-1.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-56" 
              />
              <button type="submit" className="absolute right-2.5 top-2 text-gray-400 hover:text-white cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            <button
              onClick={() => {
                localStorage.removeItem('webtv_auth');
                document.cookie = 'webtv_auth=; path=/; max-age=0';
                navigate('/login');
              }}
              className="text-xs text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 px-2.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap"
              title="退出登录"
            >
              退出
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center space-x-1.5 overflow-x-auto py-2">
            <Link to="/?type=1207" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">短剧</Link>
            <Link to="/?type=1" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">电影</Link>
            <Link to="/?type=2" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">剧集</Link>
            <Link to="/?type=3" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">综艺</Link>
            <Link to="/?type=4" className="text-xs bg-slate-800 px-2 py-1 rounded text-gray-300 whitespace-nowrap">动漫</Link>
            
            <button 
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-1.5 bg-blue-600/80 text-white rounded-md flex-shrink-0 cursor-pointer ml-1"
              aria-label="搜索"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('webtv_auth');
                document.cookie = 'webtv_auth=; path=/; max-age=0';
                navigate('/login');
              }}
              className="text-xs bg-rose-950/40 text-rose-300 border border-rose-800/40 px-2 py-1 rounded whitespace-nowrap ml-1"
            >
              退出
            </button>
          </div>

        </div>

        {/* Mobile Search Bar */}
        {showMobileSearch && (
          <div className="md:hidden pb-3 pt-1 border-t border-slate-800/60 animate-fadeIn">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input 
                type="text" 
                value={searchWd}
                onChange={(e) => setSearchWd(e.target.value)}
                placeholder="全网搜索片名、演员、关键字..." 
                className="w-full bg-slate-900 border border-blue-500/50 text-sm rounded-lg pl-3 pr-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                autoFocus
              />
              <button 
                type="submit" 
                className="absolute right-2 text-blue-400 hover:text-white p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
        )}

      </div>
    </nav>
  );
}
