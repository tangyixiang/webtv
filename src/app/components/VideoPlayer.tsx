'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 清理之前的播放状态
    video.pause();
    setIsLoaded(false);
    setError(null);

    // 1. 如果浏览器原生支持 HLS (例如 Safari, iOS Chrome)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      setIsLoaded(true);
      return;
    }

    // 2. 如果不支持原生 HLS，动态加载 hls.js (如 Android Chrome, PC Chrome/Firefox)
    let hlsInstance: any = null;
    const loadHls = () => {
      // 避免重复加载
      if ((window as any).Hls) {
        initHls((window as any).Hls);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).Hls) {
          initHls((window as any).Hls);
        } else {
          setError('HLS 播放引擎加载失败');
        }
      };
      script.onerror = () => {
        setError('无法加载播放引擎，请检查网络连接');
      };
      document.body.appendChild(script);
    };

    const initHls = (HlsClass: any) => {
      if (!HlsClass.isSupported()) {
        setError('您的浏览器不支持 HLS 视频播放');
        return;
      }

      hlsInstance = new HlsClass({
        maxMaxBufferLength: 10,
        enableWorker: true,
      });

      hlsInstance.loadSource(src);
      hlsInstance.attachMedia(video);
      hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, () => {
        setIsLoaded(true);
      });
      hlsInstance.on(HlsClass.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case HlsClass.ErrorTypes.NETWORK_ERROR:
              hlsInstance.startLoad();
              break;
            case HlsClass.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError();
              break;
            default:
              setError('视频加载出错，请尝试刷新页面');
              hlsInstance.destroy();
              break;
          }
        }
      });
    };

    loadHls();

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [src]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400 text-sm">正在加载视频流...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-10 p-4 text-center">
          <svg className="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-white font-medium mb-1">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
          >
            重试
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full h-full object-contain"
        poster="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop"
      />
    </div>
  );
}
