import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setError(null);

    try {
      if (artRef.current) {
        artRef.current.destroy();
        artRef.current = null;
      }

      const art = new Artplayer({
        container,
        url: src,
        type: 'm3u8',
        customType: {
          m3u8: function (video, url, artInstance) {
            // 1. 原生 HLS (Safari/iOS)
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
              return;
            }

            // 2. 使用 HLS.js 解码
            if (Hls.isSupported()) {
              if ((artInstance as any).hls) {
                (artInstance as any).hls.destroy();
              }

              const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 120,
                maxBufferHole: 0.5,
                enableWorker: true,
              });

              hls.loadSource(url);
              hls.attachMedia(video);
              artInstance.hls = hls;

              // 当元数据加载完成，读取【分辨率与清晰度列表】
              hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
                if (data.levels && data.levels.length > 1) {
                  const qualityList = data.levels.map((level: any, index: number) => ({
                    default: index === hls.currentLevel,
                    html: `${level.height || 720}P (${Math.round((level.bitrate || 0) / 1000)} Kbps)`,
                    level: index,
                  }));

                  qualityList.unshift({
                    default: hls.currentLevel === -1,
                    html: '自动 (Auto)',
                    level: -1,
                  });

                  artInstance.controls.update({
                    name: 'quality',
                    index: 10,
                    position: 'right',
                    html: '清晰度',
                    selector: qualityList,
                    onSelect: (item: any) => {
                      hls.currentLevel = item.level;
                      return item.html;
                    },
                  });
                }
              });

              video.addEventListener('loadedmetadata', () => {
                if (video.videoWidth && video.videoHeight) {
                  (artInstance as any).notice?.show?.(`真实分辨率: ${video.videoWidth} x ${video.videoHeight}`);
                }
              });

              hls.on(Hls.Events.ERROR, (_: any, errorData: any) => {
                if (errorData.fatal) {
                  switch (errorData.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      hls.recoverMediaError();
                      break;
                    default:
                      (artInstance as any).notice?.show?.('视频播放异常，点击右侧重新加载');
                      break;
                  }
                }
              });
            } else {
              (artInstance as any).notice?.show?.('您的浏览器不支持播放 HLS 视频');
            }
          },
        },
        autoplay: false,
        isLive: false,
        fullscreen: true,
        fullscreenWeb: true,
        setting: true,
        pip: true,
        screenshot: true,
        playbackRate: true,
        aspectRatio: true,
        miniProgressBar: true,
        playsInline: true,
        autoSize: false,
        autoMini: false,
        theme: '#2563eb',
        controls: [
          {
            name: 'reload-btn',
            position: 'right',
            html: '<span style="cursor:pointer;font-size:12px;padding:2px 8px;background:rgba(37,99,235,0.8);border-radius:4px;color:#fff;">🔄 重新加载</span>',
            click: function (artInstance: any) {
              (artInstance as any).notice?.show?.('正在重新加载视频流...');
              if ((artInstance as any).hls) {
                const currentTime = artInstance.video.currentTime;
                (artInstance as any).hls.destroy();
                (artInstance as any).hls = null;
                artInstance.switchUrl(src).then(() => {
                  if (currentTime > 0) artInstance.video.currentTime = currentTime;
                  artInstance.play();
                });
              } else {
                artInstance.switchUrl(src);
              }
            },
          },
        ],
      });

      artRef.current = art;
    } catch (err: any) {
      console.error('ArtPlayer Init Error:', err);
      setError('播放器初始化失败');
    }

    return () => {
      if (artRef.current) {
        artRef.current.destroy();
        artRef.current = null;
      }
    };
  }, [src]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-30 p-4 text-center">
          <p className="text-amber-400 font-medium mb-3">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-all cursor-pointer"
          >
            刷新页面
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
