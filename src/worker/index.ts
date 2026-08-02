import { Hono } from 'hono';

const app = new Hono();

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// 抓取单个类目的通用工具函数
async function fetchCategoryItems(origin: string, typeId: string, limit = 12) {
  const targetUrl = typeId === 'home' 
    ? 'https://olevod.com/index.html' 
    : `https://olevod.com/index.php/vod/type/id/${typeId}.html`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const videoList: Array<{ id: string; title: string; img: string; playUrl: string; score: string }> = [];
    const seenIds = new Set<string>();

    const cardRegex = /<a\s+class="[^"]*(?:vodlist_thumb|zbvodlist_box)[^"]*"\s+[^>]*href="([^"]+)"\s+title="([^"]+)"\s+data-original="([^"]+)"/g;
    let match;
    while ((match = cardRegex.exec(html)) !== null && videoList.length < limit) {
      const [, href, title, rawImg] = match;
      const idMatch = href.match(/\/id\/(\d+)/);
      if (!idMatch) continue;

      const id = idMatch[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      let img = rawImg;
      if (img.startsWith('/')) {
        img = `https://olevod.com${img}`;
      }

      const proxiedImg = `${origin}/api/proxy-img?url=${encodeURIComponent(img)}`;

      videoList.push({
        id,
        title: title.trim(),
        img: proxiedImg,
        playUrl: `/play/${id}`,
        score: (8.0 + (parseInt(id) % 15) * 0.1).toFixed(1)
      });
    }

    return videoList;
  } catch (e) {
    return [];
  }
}

// 1. /api/videos - 视频列表与分类/搜索
app.get('/api/videos', async (c) => {
  const url = new URL(c.req.url);
  const origin = url.origin;
  const type = c.req.query('type');
  const page = c.req.query('page') || '1';
  const wd = c.req.query('wd');

  if (!type && !wd) {
    const [shortDramas, movies, series, variety, anime] = await Promise.all([
      fetchCategoryItems(origin, '1207', 6), // 短剧
      fetchCategoryItems(origin, '1', 12),   // 电影
      fetchCategoryItems(origin, '2', 12),   // 电视剧
      fetchCategoryItems(origin, '3', 6),    // 综艺
      fetchCategoryItems(origin, '4', 6),    // 动漫
    ]);

    return c.json({
      success: true,
      isHome: true,
      sections: [
        { typeId: '1207', title: '🔥 热门微短剧', data: shortDramas },
        { typeId: '1', title: '🎬 热门电影推荐', data: movies },
        { typeId: '2', title: '📺 热门电视剧场', data: series },
        { typeId: '3', title: '🎪 精彩综艺热播', data: variety },
        { typeId: '4', title: '✨ 热门动漫推荐', data: anime },
      ]
    });
  }

  let targetUrl = 'https://olevod.com/index.html';
  if (wd) {
    targetUrl = `https://olevod.com/index.php/vod/search/page/${page}/wd/${encodeURIComponent(wd)}.html`;
  } else if (type) {
    targetUrl = page !== '1'
      ? `https://olevod.com/index.php/vod/show/id/${type}/page/${page}.html`
      : `https://olevod.com/index.php/vod/show/id/${type}.html`;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Source site status: ${response.status}`);
    }

    const html = await response.text();
    const videoList: Array<{ id: string; title: string; img: string; playUrl: string; score: string }> = [];
    const seenIds = new Set<string>();

    const cardRegex = /<a\s+class="[^"]*(?:vodlist_thumb|zbvodlist_box)[^"]*"\s+[^>]*href="([^"]+)"\s+title="([^"]+)"\s+data-original="([^"]+)"/g;
    let match;
    while ((match = cardRegex.exec(html)) !== null) {
      const [, href, title, rawImg] = match;
      const idMatch = href.match(/\/id\/(\d+)/);
      if (!idMatch) continue;

      const id = idMatch[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      let img = rawImg;
      if (img.startsWith('/')) {
        img = `https://olevod.com${img}`;
      }

      const proxiedImg = `${origin}/api/proxy-img?url=${encodeURIComponent(img)}`;

      videoList.push({
        id,
        title: title.trim(),
        img: proxiedImg,
        playUrl: `/play/${id}`,
        score: (8.0 + (parseInt(id) % 15) * 0.1).toFixed(1)
      });
    }

    return c.json({
      success: true,
      isHome: false,
      count: videoList.length,
      page: parseInt(page),
      type,
      data: videoList,
    });

  } catch (error: any) {
    return c.json(
      { success: false, error: '抓取失败', message: error.message },
      500
    );
  }
});

// 2. /api/video/:id - 视频详情与播放解析
app.get('/api/video/:id', async (c) => {
  const id = c.req.param('id');
  const url = new URL(c.req.url);
  const origin = url.origin;
  const sid = c.req.query('sid') || '1';
  const nid = c.req.query('nid') || '1';

  const targetUrls = [
    `https://olevod.com/index.php/vod/play/id/${id}/sid/${sid}/nid/${nid}.html`,
    `https://olevod.com/index.php/vod/play/id/${id}/sid/1/nid/1.html`,
    `https://olevod.com/index.php/vod/detail/id/${id}.html`
  ];

  const headers = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  let html = '';
  let fetchedOk = false;

  for (const tUrl of targetUrls) {
    try {
      const res = await fetch(tUrl, { headers });
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

  let rawVideoUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  let videoTitle = '';

  if (fetchedOk && html) {
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

    const titleRegex = /<title>([\s\S]*?)<\/title>/;
    const titleMatch = html.match(titleRegex);
    if (titleMatch) {
      videoTitle = titleMatch[1].split('_')[0].split('-')[0].trim();
    }
  }

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

  const proxiedVideoUrl = `${origin}/api/proxy-m3u8?url=${encodeURIComponent(rawVideoUrl)}`;

  return c.json({
    success: true,
    title: videoTitle || `影片 ${id}`,
    videoUrl: proxiedVideoUrl,
    rawVideoUrl,
    currentSid: sid,
    currentNid: nid,
    playlist: playlist.length > 0 ? playlist : [{ name: '第01集', id, sid: '1', nid: '1' }],
  });
});

// 3. /api/proxy-img - 图片代理
app.get('/api/proxy-img', async (c) => {
  const targetUrl = c.req.query('url');

  if (!targetUrl) {
    return c.text('Missing "url" parameter', 400);
  }

  try {
    let fullUrl = targetUrl;
    if (fullUrl.startsWith('//')) {
      fullUrl = `https:${fullUrl}`;
    }

    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://olevod.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return c.text(`Image fetch failed: ${res.status}`, res.status as any);
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch (err: any) {
    return c.text(`Image Proxy Error: ${err.message}`, 500);
  }
});

// 4. /api/proxy-m3u8 - M3U8 及视频切片代理
app.get('/api/proxy-m3u8', async (c) => {
  const url = new URL(c.req.url);
  const origin = url.origin;
  const targetUrl = c.req.query('url');

  if (!targetUrl) {
    return c.text('Missing "url" query parameter', 400);
  }

  try {
    let fullUrl = targetUrl;
    if (fullUrl.startsWith('//')) {
      fullUrl = `https:${fullUrl}`;
    }

    const targetParsed = new URL(fullUrl);
    const isM3u8 = fullUrl.includes('.m3u8');
    const baseUrl = `${targetParsed.protocol}//${targetParsed.host}${targetParsed.pathname.substring(0, targetParsed.pathname.lastIndexOf('/') + 1)}`;

    const proxyHeaders = new Headers();
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    proxyHeaders.set('Referer', 'https://olevod.com/');
    proxyHeaders.set('Origin', 'https://olevod.com');
    proxyHeaders.set('Accept', '*/*');
    proxyHeaders.set('X-Forwarded-For', '103.21.244.1');

    const fetchOptions: RequestInit & { cf?: any } = {
      headers: proxyHeaders,
      cf: {
        cacheEverything: true,
        cacheTtl: isM3u8 ? 10 : 86400,
        cacheEverythingByHeader: true,
      }
    };

    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      return c.text(`Failed to proxy stream: ${response.status}`, response.status as any);
    }

    const contentType = response.headers.get('content-type') || '';

    if (isM3u8 || contentType.includes('mpegurl') || contentType.includes('apple')) {
      const content = await response.text();
      const lines = content.split('\n');
      
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || (trimmed.startsWith('#') && !trimmed.startsWith('#EXT-X-KEY'))) {
          return line;
        }

        if (trimmed.startsWith('#EXT-X-KEY')) {
          return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
            const absoluteKeyUrl = uri.startsWith('http') ? uri : new URL(uri, baseUrl).toString();
            return `URI="${origin}/api/proxy-m3u8?url=${encodeURIComponent(absoluteKeyUrl)}"`;
          });
        }

        const absoluteSegmentUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
        return `${origin}/api/proxy-m3u8?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      });

      return new Response(rewrittenLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'public, max-age=10, s-maxage=10',
        },
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    return c.text(`Edge Proxy Error: ${error.message}`, 500);
  }
});

export default app;
