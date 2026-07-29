import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams, origin } = new URL(request.url);
  const sid = searchParams.get('sid') || '1';
  const nid = searchParams.get('nid') || '1';
  
  const targetUrls = [
    `https://olevod.com/index.php/vod/play/id/${id}/sid/${sid}/nid/${nid}.html`,
    `https://olevod.com/index.php/vod/play/id/${id}/sid/1/nid/1.html`,
    `https://olevod.com/index.php/vod/detail/id/${id}.html`
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  let html = '';
  let fetchedOk = false;

  for (const url of targetUrls) {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 300 } });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('var player_aaaa') || text.includes('vod/play/id/')) {
          html = text;
          fetchedOk = true;
          break;
        }
      }
    } catch (e) {
      // 忽略单个错误
    }
  }

  // 默认测试兜底视频地址
  let rawVideoUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  let videoTitle = '';

  if (fetchedOk && html) {
    // 1. 提取视频播放 JSON (player_aaaa)
    const playerRegex = /var player_aaaa\s*=\s*({[^;]+})/;
    const playerMatch = html.match(playerRegex);

    if (playerMatch) {
      try {
        const playerData = JSON.parse(playerMatch[1]);
        if (playerData.url && playerData.url.startsWith('http')) {
          rawVideoUrl = playerData.url.replace(/\\/g, '');
        }
      } catch (e) {
        console.error('Failed to parse player_aaaa JSON:', e);
      }
    }

    // 2. 提取影片标题
    const titleRegex = /<title>([\s\S]*?)<\/title>/;
    const titleMatch = html.match(titleRegex);
    if (titleMatch) {
      videoTitle = titleMatch[1].split('_')[0].split('-')[0].trim();
    }
  } else {
    console.warn(`[Proxy Warning] Video ID ${id} returns 404. Using fallback preview stream.`);
  }

  // 3. 提取剧集/选集列表
  const playlist: Array<{ name: string; id: string; sid: string; nid: string }> = [];
  const seenNids = new Set<string>();

  if (html) {
    const episodeRegex = /<a\s+[^>]*href="\/index.php\/vod\/play\/id\/(\d+)\/sid\/(\d+)\/nid\/(\d+)\.html"[^>]*>([^<]+)<\/a>/g;
    let itemMatch;

    while ((itemMatch = episodeRegex.exec(html)) !== null) {
      const [, playId, playSid, playNid, rawName] = itemMatch;
      const name = rawName.trim();
      
      const key = `${playSid}_${playNid}`;
      if (!seenNids.has(key)) {
        seenNids.add(key);
        playlist.push({
          id: playId,
          sid: playSid,
          nid: playNid,
          name: name || `第${playNid}集`,
        });
      }
    }
  }

  // 关键部分：将原始视频 URL 包装为通过我们的 Cloudflare Edge Proxy (/api/proxy-m3u8) 中转！
  const proxiedVideoUrl = `${origin}/api/proxy-m3u8?url=${encodeURIComponent(rawVideoUrl)}`;

  return NextResponse.json({
    success: true,
    title: videoTitle || `影片 ${id}`,
    videoUrl: proxiedVideoUrl,
    rawVideoUrl, // 备用原始地址
    currentSid: sid,
    currentNid: nid,
    playlist: playlist.length > 0 ? playlist : [{ name: '第01集', id, sid: '1', nid: '1' }],
  });
}
