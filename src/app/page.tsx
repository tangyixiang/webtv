'use client';

export const runtime = 'edge';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface VideoItem {
  id: string;
  title: string;
  img: string;
  playUrl: string;
  score: string;
}

interface HomeSection {
  typeId: string;
  title: string;
  data: VideoItem[];
}

// 电影子分类
const MOVIE_SUB_CATEGORIES = [
  { id: '1', name: '全部电影' },
  { id: '101', name: '动作片' },
  { id: '102', name: '喜剧片' },
  { id: '103', name: '爱情片' },
  { id: '104', name: '科幻片' },
  { id: '105', name: '恐怖片' },
  { id: '106', name: '剧情片' },
  { id: '107', name: '战争片' },
  { id: '108', name: '动画片' },
  { id: '109', name: '悬疑片' },
  { id: '110', name: '惊悚片' },
  { id: '111', name: '纪录片' },
  { id: '112', name: '奇幻片' },
  { id: '113', name: '犯罪片' },
];

// 电视剧子分类
const TV_SUB_CATEGORIES = [
  { id: '2', name: '全部剧集' },
  { id: '202', name: '国产剧' },
  { id: '201', name: '欧美剧' },
  { id: '203', name: '港台剧' },
  { id: '204', name: '日韩剧' },
  { id: '1207', name: '微短剧' },
];

// 综艺子分类
const VARIETY_SUB_CATEGORIES = [
  { id: '3', name: '全部综艺' },
  { id: '305', name: '真人秀' },
  { id: '304', name: '搞笑' },
  { id: '302', name: '音乐' },
  { id: '303', name: '曲艺' },
  { id: '301', name: '家庭' },
];

// 动漫子分类
const ANIME_SUB_CATEGORIES = [
  { id: '4', name: '全部动漫' },
  { id: '401', name: '日本动漫' },
  { id: '402', name: '国产动漫' },
  { id: '403', name: '欧美动漫' },
];

function MainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || '';
  const pageStr = searchParams.get('page') || '1';
  const page = parseInt(pageStr) || 1;
  const wd = searchParams.get('wd') || '';

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [singleCategoryVideos, setSingleCategoryVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 类别归属判定
  const isMovieType = type === '1' || (parseInt(type) >= 101 && parseInt(type) <= 113);
  const isTvType = type === '2' || ['201', '202', '203', '204', '1207'].includes(type);
  const isVarietyType = type === '3' || (parseInt(type) >= 301 && parseInt(type) <= 305);
  const isAnimeType = type === '4' || (parseInt(type) >= 401 && parseInt(type) <= 403);

  // 获取子分类映射列表
  const getSubCategories = () => {
    if (isMovieType) return MOVIE_SUB_CATEGORIES;
    if (isTvType) return TV_SUB_CATEGORIES;
    if (isVarietyType) return VARIETY_SUB_CATEGORIES;
    if (isAnimeType) return ANIME_SUB_CATEGORIES;
    return [];
  };

  // 当前分类标题
  const getTitle = () => {
    if (wd) return `搜索 “${wd}” 的结果`;
    const allSubs = [...MOVIE_SUB_CATEGORIES, ...TV_SUB_CATEGORIES, ...VARIETY_SUB_CATEGORIES, ...ANIME_SUB_CATEGORIES];
    const matched = allSubs.find(c => c.id === type);
    if (matched) return matched.name;
    return '分类正片';
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let url = `/api/videos?page=${page}`;
        if (type) url += `&type=${type}`;
        if (wd) url += `&wd=${encodeURIComponent(wd)}`;

        const res = await fetch(url);
        const json = await res.json();
        
        if (json.success) {
          if (json.isHome && json.sections) {
            setSections(json.sections);
          } else if (Array.isArray(json.data)) {
            setSingleCategoryVideos(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [type, page, wd]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/?${params.toString()}`);
  };

  const renderVideoCard = (video: VideoItem) => (
    <Link href={video.playUrl} key={video.id}>
      <div className="glass-card rounded-lg overflow-hidden group cursor-pointer relative transition-all duration-300 hover:scale-105">
        <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10 shadow-md backdrop-blur-sm">
          HD {video.score}
        </div>
        
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800">
          <img 
            src={video.img} 
            alt={video.title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=500&h=750&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-blue-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4l12 6-12 6z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="p-2 md:p-2.5">
          <h3 className="text-white font-medium text-xs md:text-sm truncate group-hover:text-blue-400 transition-colors">
            {video.title}
          </h3>
        </div>
      </div>
    </Link>
  );

  const activeSubCategories = getSubCategories();

  return (
    <div className="pb-12 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 【模式 1】：首页模式 (!type && !wd) —— 多区块卡片展台 */}
        {!type && !wd ? (
          loading ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="h-6 w-40 bg-slate-800 rounded animate-pulse" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse glass-card rounded-lg h-60 bg-slate-800/40" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              {sections.map((section) => (
                <div key={section.typeId} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center">
                      <span className="w-1.5 h-5 bg-blue-500 rounded-full mr-2.5"></span>
                      {section.title}
                    </h2>
                    <Link 
                      href={`/?type=${section.typeId}`} 
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center"
                    >
                      更多 {section.title.replace(/[^\u4e00-\u9fa5]/g, '')} <span className="ml-1">→</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 md:gap-5">
                    {section.data.map((video) => renderVideoCard(video))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* 【模式 2】：单分类页面 或 搜索页面 */
          <div>
            {/* 子分类标签栏 (Sub-Categories Pills) */}
            {activeSubCategories.length > 0 && (
              <div className="mb-6 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 backdrop-blur-sm">
                <div className="text-xs text-gray-400 mb-2 font-medium flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v25a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                  </svg>
                  子分类筛选：
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {activeSubCategories.map((sub) => {
                    const isActive = (type === sub.id) || (!type && sub.id === activeSubCategories[0].id);
                    return (
                      <Link
                        key={sub.id}
                        href={`/?type=${sub.id}`}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                            : 'bg-slate-800/80 text-gray-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 列表标题 */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-2">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center">
                <span className="w-1.5 h-5 bg-blue-500 rounded-full mr-2.5"></span>
                {getTitle()} <span className="text-xs font-normal text-gray-400 ml-2">(第 {page} 页)</span>
              </h2>
              <span className="text-xs text-gray-400">实时匹配 {singleCategoryVideos.length} 个正片源</span>
            </div>

            {/* 视频卡片网格 */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse glass-card rounded-lg h-60 bg-slate-800/40" />
                ))}
              </div>
            ) : singleCategoryVideos.length === 0 ? (
              <div className="text-center py-20 text-gray-400 bg-slate-900/40 rounded-xl border border-slate-800">
                <p className="text-base font-medium mb-2">未匹配到相关影片数据</p>
                <button onClick={() => handlePageChange(1)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs cursor-pointer">
                  返回第 1 页
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 md:gap-5">
                {singleCategoryVideos.map((video) => renderVideoCard(video))}
              </div>
            )}

            {/* 分页控制条 */}
            {!loading && singleCategoryVideos.length > 0 && (
              <div className="mt-10 flex items-center justify-center space-x-3">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    page <= 1
                      ? 'bg-slate-900 border-slate-800 text-gray-600 cursor-not-allowed'
                      : 'bg-slate-800 border-slate-700 text-white hover:bg-blue-600 hover:border-blue-500'
                  }`}
                >
                  ← 上一页
                </button>

                <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 text-xs font-medium text-gray-300 rounded-lg">
                  第 <span className="text-blue-400 font-bold">{page}</span> 页
                </div>

                <button
                  onClick={() => handlePageChange(page + 1)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-white hover:bg-blue-600 hover:border-blue-500 transition-all cursor-pointer"
                >
                  下一页 →
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 pt-24 text-center text-gray-400">加载数据...</div>}>
      <MainContent />
    </Suspense>
  );
}
