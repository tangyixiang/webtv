import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const sid = searchParams.get('sid') || '1';
  const nid = searchParams.get('nid') || '1';
  
  // 尝试的 URL 优先级
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
        // 只要包含 player_aaaa 或剧集列表就算有效
        if (text.includes('var player_aaaa') || text.includes('vod/play/id/')) {
          html = text;
          fetchedOk = true;
          break;
        }
      }
    } catch (e) {
      // 忽略单次错误，尝试下一个
    }
  }

  if (!fetchedOk || !html) {
    console.warn(`[Proxy Warning] Video ID ${id} (sid:${sid}, nid:${nid}) returns 404 on all endpoints.`);
    return NextResponse.json({
      success: true,
      title: '演示影片 (链接失效)',
      videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      playlist: [{ name: '第01集', id, sid: '1', nid: '1' }],
    });
  }

  // 1. 提取当前集的播放地址 JSON (player_aaaa)
  const playerRegex = /var player_aaaa\s*=\s*({[^;]+})/;
  const playerMatch = html.match(playerRegex);
  let videoUrl = '';
  let videoTitle = '';

  if (playerMatch) {
    try {
      const playerData = JSON.parse(playerMatch[1]);
      if (playerData.url) {
        videoUrl = playerData.url.replace(/\\/g, '');
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

  // 3. 全面精确正则：匹配所有剧集 (支持 detail 页和 play 页的所有 a 标签)
  // 能够匹配: <a ... href="/index.php/vod/play/id/20130/sid/1/nid/2.html" ... >第02集</a>
  const playlist: Array<{ name: string; id: string; sid: string; nid: string }> = [];
  const seenNids = new Set<string>();

  const episodeRegex = /<a\s+[^>]*href="\/index.php\/vod\/play\/id\/(\d+)\/sid\/(\d+)\/nid\/(\d+)\.html"[^>]*>([^<]+)<\/a>/g;
  let itemMatch;

  while ((itemMatch = episodeRegex.exec(html)) !== null) {
    const [, playId, playSid, playNid, rawName] = itemMatch;
    const name = rawName.trim();
    
    // 按 sid + nid 去重
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

  // 如果源站视频格式不合法或缺失，用标准测试流兜底
  if (!videoUrl || !videoUrl.startsWith('http')) {
    videoUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  }

  return NextResponse.json({
    success: true,
    title: videoTitle || `电视剧 ${id}`,
    videoUrl,
    currentSid: sid,
    currentNid: nid,
    playlist: playlist.length > 0 ? playlist : [{ name: '第01集', id, sid: '1', nid: '1' }],
  });
}
