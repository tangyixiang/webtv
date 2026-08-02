import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

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

const TV_SUB_CATEGORIES = [
  { id: '2', name: '全部剧集' },
  { id: '202', name: '国产剧' },
  { id: '201', name: '欧美剧' },
  { id: '203', name: '港台剧' },
  { id: '204', name: '日韩剧' },
  { id: '1207', name: '微短剧' },
];

const VARIETY_SUB_CATEGORIES = [
  { id: '3', name: '全部综艺' },
  { id: '305', name: '真人秀' },
  { id: '304', name: '搞笑' },
  { id: '302', name: '音乐' },
  { id: '303', name: '曲艺' },
  { id: '301', name: '家庭' },
];

const ANIME_SUB_CATEGORIES = [
  { id: '4', name: '全部动漫' },
  { id: '401', name: '日本动漫' },
  { id: '402', name: '国产动漫' },
  { id: '403', name: '欧美动漫' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || '';
  const pageStr = searchParams.get('page') || '1';
  const page = parseInt(pageStr) || 1;
  const wd = searchParams.get('wd') || '';

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [singleCategoryVideos, setSingleCategoryVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isMovieType = type === '1' || (parseInt(type) >= 101 && parseInt(type) <= 113);
  const isTvType = type === '2' || ['201', '202', '203', '204', '1207'].includes(type);
  const isVarietyType = type === '3' || (parseInt(type) >= 301 && parseInt(type) <= 305);
  const isAnimeType = type === '4' || (parseInt(type) >= 401 && parseInt(type) <= 403);

  const getSubCategories = () => {
    if (isMovieType) return MOVIE_SUB_CATEGORIES;
    if (isTvType) return TV_SUB_CATEGORIES;
    if (isVarietyType) return VARIETY_SUB_CATEGORIES;
    if (isAnimeType) return ANIME_SUB_CATEGORIES;
    return [];
  };

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
        const json = (await res.json()) as any;
        
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
    navigate(`/?${params.toString()}`);
  };

  const renderVideoCard = (video: VideoItem) => (
    <Link to={video.playUrl} key={video.id}>
      <div className="glass-card rounded-lg overflow-hidden group cursor-pointer relative transition-all duration-300 hover:scale-105">
        <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10 shadow-md backdrop-blur-sm">
          HD {video.score}
        </div>
        
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-800">
          <img 
            src={video.img} 
            alt={video.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-blue-400 transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 flex justify-between items-center">
            <span>正片高清</span>
            <span className="text-blue-400/80">立即播放</span>
          </p>
        </div>
      </div>
    </Link>
  );

  const subCategories = getSubCategories();

  return (
    <div className="min-h-screen pb-16">
      {/* Secondary Sub-Category Filter Bar */}
      {subCategories.length > 0 && !wd && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 sticky top-16 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 overflow-x-auto no-scrollbar flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap mr-2">子分类:</span>
            {subCategories.map((sub) => {
              const isActive = type === sub.id;
              return (
                <Link
                  key={sub.id}
                  to={`/?type=${sub.id}`}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap font-medium ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {sub.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 animate-pulse">加载全网最新海量高清影视资源...</p>
          </div>
        ) : (!type && !wd) ? (
          /* 【首页模式】：展示各版块热门视频分组 */
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.typeId} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h2 className="text-xl font-bold text-slate-100 flex items-center">
                    {section.title}
                  </h2>
                  <Link 
                    to={`/?type=${section.typeId}`}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center transition-colors font-medium"
                  >
                    查看更多
                    <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {section.data.map(renderVideoCard)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* 【单分类 / 搜索结果模式】：展示列表 + 分页导航 */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-100">{getTitle()}</h2>
              <span className="text-xs text-slate-400">第 {page} 页</span>
            </div>

            {singleCategoryVideos.length === 0 ? (
              <div className="text-center py-24 text-slate-400">
                <p className="text-lg">暂未搜索到匹配的相关影片</p>
                <p className="text-xs text-slate-500 mt-2">建议缩短关键字或尝试其他影片名称</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {singleCategoryVideos.map(renderVideoCard)}
              </div>
            )}

            {/* Pagination Controls */}
            {singleCategoryVideos.length > 0 && (
              <div className="flex items-center justify-center space-x-4 pt-8">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className={`px-4 py-2 text-sm rounded-md transition-all ${
                    page <= 1
                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shadow'
                  }`}
                >
                  上一页
                </button>
                <span className="text-sm font-medium text-slate-400">第 {page} 页</span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow cursor-pointer"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
