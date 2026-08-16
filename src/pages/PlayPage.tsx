import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';

interface Episode {
  name: string;
  id: string;
  sid: string;
  nid: string;
  dataid?: string;
}

interface VideoDetail {
  title: string;
  videoUrl: string;
  rawVideoUrl?: string;
  currentSid: string;
  currentNid: string;
  source: 'olevod' | '4kvm';
  sourceName: string;
  playlist: Episode[];
}

export default function PlayPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const source = (searchParams.get('source') || 'olevod') as 'olevod' | '4kvm';
  const initialSid = searchParams.get('sid') || '1';
  const initialNid = searchParams.get('nid') || '1';

  const [videoData, setVideoData] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingEpisode, setSwitchingEpisode] = useState(false);
  const [activeEpisodeId, setActiveEpisodeId] = useState(id || '');
  const [activeSid, setActiveSid] = useState(initialSid);
  const [activeNid, setActiveNid] = useState(initialNid);

  // 初次加载影片信息
  useEffect(() => {
    async function loadVideoDetails() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/video/${id}?source=${source}&sid=${initialSid}&nid=${initialNid}`);
        const data = (await res.json()) as any;
        if (data.success) {
          setVideoData(data);
          setActiveEpisodeId(id);
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
  }, [id, source, initialSid, initialNid]);

  // 后台无刷新切换集数
  const handleSwitchEpisode = async (episode: Episode) => {
    if (!id) return;
    if (episode.id === activeEpisodeId && episode.sid === activeSid && episode.nid === activeNid) return;

    setSwitchingEpisode(true);
    setActiveEpisodeId(episode.id);
    setActiveSid(episode.sid);
    setActiveNid(episode.nid);

    const targetPlayId = source === '4kvm' ? episode.id : id;
    const newUrl = `/play/${targetPlayId}?source=${source}&sid=${episode.sid}&nid=${episode.nid}`;
    window.history.replaceState(null, '', newUrl);

    try {
      const res = await fetch(`/api/video/${targetPlayId}?source=${source}&sid=${episode.sid}&nid=${episode.nid}`);
      const data = (await res.json()) as any;
      if (data.success && videoData) {
        setVideoData({
          ...videoData,
          videoUrl: data.videoUrl,
          rawVideoUrl: data.rawVideoUrl,
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
        <p className="text-gray-400 text-sm">正在获取影片与解析高清数据流...</p>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-slate-950 pt-24 pb-12 text-center flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-white mb-2">获取视频失败</h2>
        <p className="text-gray-400 mb-6">暂时无法获取到该视频的数据流，请尝试更换其他数据源或返回首页重试。</p>
        <Link to="/" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors text-sm">
          返回首页
        </Link>
      </div>
    );
  }

  const currentEpisodeObj = videoData.playlist.find(ep => 
    source === '4kvm' ? (ep.id === activeEpisodeId || ep.nid === activeNid) : (ep.nid === activeNid && ep.sid === activeSid)
  );
  const currentEpisodeName = currentEpisodeObj ? currentEpisodeObj.name : `第${activeNid}集`;
  const is4kvm = videoData.source === '4kvm';

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs & Source Indicator */}
        <div className="text-gray-400 text-xs md:text-sm mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <Link to="/" className="hover:text-blue-500 transition-colors">首页</Link>
            <span>/</span>
            <span className="text-gray-200 truncate max-w-[200px]">{videoData.title}</span>
            <span>/</span>
            <span className="text-blue-400 font-medium">{currentEpisodeName}</span>
          </div>

          <div className="flex-shrink-0 ml-2">
            {is4kvm ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <span>🌟</span> 当前播放源：4K 影视
              </span>
            ) : (
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <span>🎬</span> 当前播放源：欧乐影视
              </span>
            )}
          </div>
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
              <VideoPlayer key={`${id}_${source}_${activeEpisodeId}_${activeSid}_${activeNid}`} src={videoData.videoUrl} />
            </div>
            
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                  {videoData.title} <span className="text-blue-400 text-lg">({currentEpisodeName})</span>
                </h1>
                
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/?wd=${encodeURIComponent(videoData.title.split(' ')[0])}`}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1"
                    title="在全网搜索切换其他播放源"
                  >
                    <span>🔄</span> 搜索换源
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 my-3">
                <span className={`px-2 py-0.5 rounded font-medium ${is4kvm ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50' : 'bg-blue-950/70 text-blue-400 border border-blue-800/50'}`}>
                  {is4kvm ? '🌟 4K 影视超清源' : '🎬 欧乐影视高清源'}
                </span>
                <span>·</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-blue-400">HLS 代理流</span>
                <span>·</span>
                <span>后台无刷新切集</span>
                <span>·</span>
                <span>共 {videoData.playlist.length} 集</span>
              </div>
              
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                点击右侧集数按钮可实现后台无缝切换，无需刷新全页。播放卡顿可点击播放器右上角【🔄 重新加载】或尝试刷新。
              </p>
            </div>
          </div>

          {/* Right: Playlist Selection */}
          <div className="p-5 bg-slate-900/60 rounded-lg border border-slate-800 backdrop-blur-sm h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white border-l-4 border-blue-500 pl-3">
                剧集选集 ({videoData.playlist.length})
              </h2>
              <span className="text-xs text-slate-500">
                {is4kvm ? '4K 专属线路' : '默认线路'}
              </span>
            </div>
            
            {videoData.playlist.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无集数</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-3 gap-2.5 max-h-[50vh] lg:max-h-[65vh] overflow-y-auto pr-1">
                {videoData.playlist.map((episode) => {
                  const isActive = source === '4kvm' 
                    ? (episode.id === activeEpisodeId || episode.nid === activeNid)
                    : (episode.nid === activeNid && episode.sid === activeSid);

                  return (
                    <button
                      key={`${episode.sid}_${episode.id || episode.nid}`}
                      onClick={() => handleSwitchEpisode(episode)}
                      className={`py-2 px-2.5 rounded text-center text-xs font-medium transition-all truncate border cursor-pointer ${
                        isActive
                          ? is4kvm 
                            ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                            : 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
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
