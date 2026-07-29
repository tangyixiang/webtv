'use client';

export const runtime = 'edge';

import { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import VideoPlayer from '../../components/VideoPlayer';

interface Episode {
  name: string;
  id: string;
  sid: string;
  nid: string;
}

interface VideoDetail {
  title: string;
  videoUrl: string;
  currentSid: string;
  currentNid: string;
  playlist: Episode[];
}

function PlayContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const initialSid = searchParams.get('sid') || '1';
  const initialNid = searchParams.get('nid') || '1';
  
  const [videoData, setVideoData] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingEpisode, setSwitchingEpisode] = useState(false);
  const [activeSid, setActiveSid] = useState(initialSid);
  const [activeNid, setActiveNid] = useState(initialNid);

  // 初次加载影片信息
  useEffect(() => {
    async function loadVideoDetails() {
      setLoading(true);
      try {
        const res = await fetch(`/api/video/${id}?sid=${initialSid}&nid=${initialNid}`);
        const data = await res.json();
        if (data.success) {
          setVideoData(data);
          setActiveSid(data.currentSid || initialSid);
          setActiveNid(data.currentNid || initialNid);
        }
      } catch (err) {
        console.error('Failed to load video details:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadVideoDetails();
  }, [id, initialSid, initialNid]);

  // 后台无刷新切换集数 (AJAX / Background Fetch)
  const handleSwitchEpisode = async (episode: Episode) => {
    if (episode.sid === activeSid && episode.nid === activeNid) return;
    
    setSwitchingEpisode(true);
    setActiveSid(episode.sid);
    setActiveNid(episode.nid);

    // 优雅更新浏览器 URL 地址栏而不触发页面重新渲染/加载
    const newUrl = `/play/${id}?sid=${episode.sid}&nid=${episode.nid}`;
    window.history.replaceState(null, '', newUrl);

    try {
      const res = await fetch(`/api/video/${id}?sid=${episode.sid}&nid=${episode.nid}`);
      const data = await res.json();
      if (data.success && videoData) {
        setVideoData({
          ...videoData,
          videoUrl: data.videoUrl,
          currentSid: episode.sid,
          currentNid: episode.nid,
        });
      }
    } catch (err) {
      console.error('Failed to switch episode in background:', err);
    } finally {
      setSwitchingEpisode(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-24 pb-12 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">正在获取正片与集数列表...</p>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-slate-950 pt-24 pb-12 text-center flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-white mb-2">获取视频失败</h2>
        <p className="text-gray-400 mb-6">暂时无法获取到该视频的数据流，请返回首页重试。</p>
        <Link href="/" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors text-sm">
          返回首页
        </Link>
      </div>
    );
  }

  // 当前播放的集数名称
  const currentEpisodeObj = videoData.playlist.find(ep => ep.nid === activeNid && ep.sid === activeSid);
  const currentEpisodeName = currentEpisodeObj ? currentEpisodeObj.name : `第${activeNid}集`;

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <div className="text-gray-400 text-xs md:text-sm mb-4 flex items-center space-x-2">
          <Link href="/" className="hover:text-blue-500 transition-colors">首页</Link>
          <span>/</span>
          <span className="text-gray-200 truncate max-w-[200px]">{videoData.title}</span>
          <span>/</span>
          <span className="text-blue-400 font-medium">{currentEpisodeName}</span>
        </div>

        {/* Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left: Player + Title */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              {switchingEpisode && (
                <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-xs rounded-lg">
                  <div className="flex items-center space-x-2 text-white bg-slate-900/90 px-4 py-2 rounded-full shadow-lg border border-slate-700">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">后台切集中...</span>
                  </div>
                </div>
              )}
              <VideoPlayer key={`${id}_${activeSid}_${activeNid}`} src={videoData.videoUrl} />
            </div>
            
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
                  {videoData.title} <span className="text-blue-400 text-lg">({currentEpisodeName})</span>
                </h1>
              </div>
              <div className="flex space-x-2 text-xs text-gray-400 mb-3">
                <span className="bg-slate-800 px-2 py-0.5 rounded text-blue-400">HLS 超清流</span>
                <span>·</span>
                <span>后台无刷新切集</span>
                <span>·</span>
                <span>共 {videoData.playlist.length} 集</span>
              </div>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                点击右侧集数按钮可实现后台后台无缝切换，无需刷新全页。播放卡顿可尝试刷新页面。
              </p>
            </div>
          </div>

          {/* Right: Playlist Selection */}
          <div className="p-5 bg-slate-900/60 rounded-lg border border-slate-800 backdrop-blur-sm h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white border-l-4 border-blue-500 pl-3">
                剧集选集 ({videoData.playlist.length})
              </h2>
            </div>
            
            {videoData.playlist.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无集数</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-3 gap-2.5 max-h-[50vh] lg:max-h-[65vh] overflow-y-auto pr-1">
                {videoData.playlist.map((episode) => {
                  const isActive = episode.nid === activeNid && episode.sid === activeSid;
                  return (
                    <button
                      key={`${episode.sid}_${episode.nid}`}
                      onClick={() => handleSwitchEpisode(episode)}
                      className={`py-2 px-2.5 rounded text-center text-xs font-medium transition-all truncate border cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                          : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-700 hover:border-slate-600 text-gray-300'
                      }`}
                      title={episode.name}
                    >
                      {episode.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 pt-24 text-center text-gray-400">加载剧集...</div>}>
      <PlayContent id={id} />
    </Suspense>
  );
}
