import { Hono } from 'hono';
import { build4kvmPlayUrl } from './wasm-signer';

const app = new Hono();

// 统一跨域处理中间件
app.use('*', async (c, next) => {
  await next();
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
});

// API 鉴权中间件：校验密码凭证 'tyx'（排除媒体分片代理与预检请求）
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (c.req.method === 'OPTIONS' || path.startsWith('/api/proxy-img') || path.startsWith('/api/proxy-m3u8')) {
    return next();
  }

  const cookieHeader = c.req.header('Cookie') || '';
  const authCookie = cookieHeader.split(';').find(item => item.trim().startsWith('webtv_auth='));
  const authHeader = c.req.header('Authorization');
  const token = authCookie ? authCookie.split('=')[1].trim() : (authHeader ? authHeader.replace('Bearer ', '').trim() : '');

  if (token !== 'tyx') {
    return c.json({ success: false, error: 'Unauthorized: 请先登录' }, 401);
  }

  await next();
});

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface VideoCard {
  id: string;
  title: string;
  img: string;
  playUrl: string;
  score: string;
  source: 'olevod' | '4kvm';
  sourceName: string;
  badge: string;
  year?: string;
}

// -------------------------------------------------------------
// 1. 欧乐影视 (Olevod) 解析模块
// -------------------------------------------------------------
async function fetchOlevodCategoryItems(origin: string, typeId: string, limit = 12): Promise<VideoCard[]> {
  const targetUrl = typeId === 'home'
    ? 'https://olevod.com/index.html'
    : `https://olevod.com/index.php/vod/type/id/${typeId}.html`;

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const videoList: VideoCard[] = [];
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
        playUrl: `/play/${id}?source=olevod`,
        score: (8.0 + (parseInt(id) % 15) * 0.1).toFixed(1),
        source: 'olevod',
        sourceName: '欧乐影视',
        badge: 'HD',
      });
    }

    return videoList;
  } catch (e) {
    return [];
  }
}

async function fetchOlevodSearch(origin: string, wd: string, page = '1'): Promise<VideoCard[]> {
  const targetUrl = `https://olevod.com/index.php/vod/search/page/${page}/wd/${encodeURIComponent(wd)}.html`;
  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const videoList: VideoCard[] = [];
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
        playUrl: `/play/${id}?source=olevod`,
        score: (8.0 + (parseInt(id) % 15) * 0.1).toFixed(1),
        source: 'olevod',
        sourceName: '欧乐影视',
        badge: 'HD',
      });
    }
    return videoList;
  } catch (e) {
    return [];
  }
}

async function fetchOlevodCategory(origin: string, type: string, page = '1'): Promise<VideoCard[]> {
  const targetUrl = page !== '1'
    ? `https://olevod.com/index.php/vod/show/id/${type}/page/${page}.html`
    : `https://olevod.com/index.php/vod/show/id/${type}.html`;

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const videoList: VideoCard[] = [];
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
        playUrl: `/play/${id}?source=olevod`,
        score: (8.0 + (parseInt(id) % 15) * 0.1).toFixed(1),
        source: 'olevod',
        sourceName: '欧乐影视',
        badge: 'HD',
      });
    }
    return videoList;
  } catch (e) {
    return [];
  }
}

async function fetchOlevodDetail(origin: string, id: string, sid = '1', nid = '1') {
  const targetUrls = [
    `https://olevod.com/index.php/vod/play/id/${id}/sid/${sid}/nid/${nid}.html`,
    `https://olevod.com/index.php/vod/play/id/${id}/sid/1/nid/1.html`,
    `https://olevod.com/index.php/vod/detail/id/${id}.html`,
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
    } catch (e) {}
  }

  let rawVideoUrl = '';
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

  const proxiedVideoUrl = rawVideoUrl ? `${origin}/api/proxy-m3u8?url=${encodeURIComponent(rawVideoUrl)}` : '';

  return {
    success: true,
    source: 'olevod' as const,
    sourceName: '欧乐影视',
    title: videoTitle || `影片 ${id}`,
    videoUrl: proxiedVideoUrl,
    rawVideoUrl,
    currentSid: sid,
    currentNid: nid,
    playlist: playlist.length > 0 ? playlist : [{ name: '第01集', id, sid: '1', nid: '1' }],
  };
}

// -------------------------------------------------------------
// 2. 4K 影视 (4kvm.net) 解析模块
// -------------------------------------------------------------
async function fetch4kvmSearch(origin: string, wd: string, page = '1'): Promise<VideoCard[]> {
  const targetUrl = page !== '1'
    ? `https://www.4kvm.net/search?q=${encodeURIComponent(wd)}&page=${page}`
    : `https://www.4kvm.net/search?q=${encodeURIComponent(wd)}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://www.4kvm.net/',
      },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const videoList: VideoCard[] = [];
    const seenIds = new Set<string>();

    const cardRegex = /<a\s+href="\/play\/([a-zA-Z0-9]+)"[\s\S]*?<img\s+[^>]*data-src="([^"]+)"[\s\S]*?alt="([^"]+)"[\s\S]*?<\/a>/g;
    let match;
    while ((match = cardRegex.exec(html)) !== null) {
      const [, id, rawImg, rawTitle] = match;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const title = rawTitle.replace(/&amp;/g, '&').trim();
      let img = rawImg.replace(/&amp;/g, '&');
      if (img.startsWith('//')) img = `https:${img}`;
      const proxiedImg = `${origin}/api/proxy-img?url=${encodeURIComponent(img)}`;

      const cardSegment = match[0];
      const yearMatch = cardSegment.match(/top-2\s+left-2[^>]*>\s*(\d{4})\s*</);
      const year = yearMatch ? yearMatch[1] : undefined;

      const is4k = cardSegment.includes('4k') || cardSegment.includes('4K');

      videoList.push({
        id,
        title,
        img: proxiedImg,
        playUrl: `/play/${id}?source=4kvm`,
        score: '9.2',
        source: '4kvm',
        sourceName: '4K影视',
        badge: is4k ? '4K' : '1080P',
        year,
      });
    }

    return videoList;
  } catch (e) {
    return [];
  }
}

async function fetch4kvmDetail(origin: string, id: string, nid = '1', sid = '1') {
  const targetUrl = `https://www.4kvm.net/play/${id}`;
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://www.4kvm.net/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`4kvm play page returned HTTP ${res.status}`);
  }

  const html = await res.text();

  // 1. 提取签名依赖参数
  const nbStMatch = html.match(/<meta id="nb-st" content="([^"]+)">/);
  const nbSt = nbStMatch ? nbStMatch[1] : String(Date.now());

  const userlinkMatch = html.match(/userlink:'([^']+)'/);
  const userlink = userlinkMatch ? userlinkMatch[1] : '0';

  // 2. 提取片名
  let videoTitle = '';
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    videoTitle = titleMatch[1].split('-')[0].trim();
  }

  // 3. 提取选集列表
  const playlist: Array<{ name: string; id: string; dataid: string; nid: string; sid: string }> = [];
  const seenSlugs = new Set<string>();

  // 方式 A：正则匹配带有 dataid 的选集标签
  const epRegex = /<a\s+[^>]*href="\/play\/([a-zA-Z0-9]+)"[^>]*dataid="(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = epRegex.exec(html)) !== null) {
    const [, epSlug, dataid, innerHtml] = m;
    if (seenSlugs.has(epSlug)) continue;
    seenSlugs.add(epSlug);

    const spanMatch = innerHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/);
    let epName = spanMatch ? spanMatch[1].replace(/<[^>]+>/g, '').trim() : innerHtml.replace(/<[^>]+>/g, '').trim();
    if (!epName || epName.length > 20) {
      epName = `第${playlist.length + 1}集`;
    } else if (/^\d+$/.test(epName)) {
      epName = `第${epName}集`;
    }

    playlist.push({
      id: epSlug,
      dataid,
      nid: String(playlist.length + 1),
      sid: '1',
      name: epName,
    });
  }

  // 方式 B：若方式 A 未匹配到，通过 handleEpisodeClick 匹配
  if (playlist.length === 0) {
    const clickRegex = /href="\/play\/([a-zA-Z0-9]+)"[\s\S]*?handleEpisodeClick\([^,]+,\s*'(\d+)'/g;
    while ((m = clickRegex.exec(html)) !== null) {
      const [, epSlug, dataid] = m;
      if (seenSlugs.has(epSlug)) continue;
      seenSlugs.add(epSlug);
      playlist.push({
        id: epSlug,
        dataid,
        nid: String(playlist.length + 1),
        sid: '1',
        name: `第${playlist.length + 1}集`,
      });
    }
  }

  // 4. 定位当前集与 dataid
  let activeEpisode = playlist.find(p => p.id === id);
  if (!activeEpisode) {
    activeEpisode = playlist.find(p => p.nid === nid) || playlist[0];
  }

  let currentDataid = activeEpisode?.dataid;
  if (!currentDataid) {
    const fallbackDataid = html.match(/dataid="(\d+)"/) || html.match(/data-v-id="(\d+)"/) || html.match(/handleEpisodeClick\([^,]+,\s*'(\d+)'/);
    currentDataid = fallbackDataid ? fallbackDataid[1] : '0';
  }
  const currentSecretKey = activeEpisode?.id || id;
  const currentNid = activeEpisode?.nid || nid;

  // 5. Wasm 生成签名播放 URL 并换取超清流
  let rawVideoUrl = '';
  try {
    const signedPlayPath = await build4kvmPlayUrl(currentDataid, currentSecretKey, '1080', userlink, nbSt);
    if (signedPlayPath) {
      const fullPlayApiUrl = `https://www.4kvm.net${signedPlayPath}`;
      const playApiRes = await fetch(fullPlayApiUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': targetUrl,
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (playApiRes.ok) {
        const playJson = (await playApiRes.json()) as any;
        if (playJson.code === 200 && playJson.data) {
          if (playJson.data.url && typeof playJson.data.url === 'string' && playJson.data.url.startsWith('http')) {
            rawVideoUrl = playJson.data.url;
          } else if (Array.isArray(playJson.data.quality_urls)) {
            const unlocked = playJson.data.quality_urls.filter((q: any) => !q.locked && q.url && (q.url.startsWith('http') || q.url.startsWith('//')));
            if (unlocked.length > 0) {
              rawVideoUrl = unlocked[unlocked.length - 1].url;
              if (rawVideoUrl.startsWith('//')) {
                rawVideoUrl = `https:${rawVideoUrl}`;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to get 4kvm stream:', err);
  }

  const proxiedVideoUrl = rawVideoUrl ? `${origin}/api/proxy-m3u8?url=${encodeURIComponent(rawVideoUrl)}` : '';

  return {
    success: true,
    source: '4kvm' as const,
    sourceName: '4K影视',
    title: videoTitle || `4K影片 ${id}`,
    videoUrl: proxiedVideoUrl,
    rawVideoUrl,
    currentSid: '1',
    currentNid,
    playlist: playlist.length > 0 ? playlist : [{ name: '正片', id, dataid: currentDataid, sid: '1', nid: '1' }],
  };
}

// -------------------------------------------------------------
// 3. API 路由定义
// -------------------------------------------------------------

// /api/videos - 视频列表与多源聚合检索
app.get('/api/videos', async (c) => {
  const url = new URL(c.req.url);
  const origin = url.origin;
  const type = c.req.query('type');
  const page = c.req.query('page') || '1';
  const wd = c.req.query('wd');
  const source = c.req.query('source') || 'all'; // 'all' | 'olevod' | '4kvm'

  // A. 首页模式（无 type 且无 wd）
  if (!type && !wd) {
    const [shortDramas, movies, series, variety, anime] = await Promise.all([
      fetchOlevodCategoryItems(origin, '1207', 6), // 短剧
      fetchOlevodCategoryItems(origin, '1', 12),   // 电影
      fetchOlevodCategoryItems(origin, '2', 12),   // 电视剧
      fetchOlevodCategoryItems(origin, '3', 6),    // 综艺
      fetchOlevodCategoryItems(origin, '4', 6),    // 动漫
    ]);

    return c.json({
      success: true,
      isHome: true,
      sections: [
        { typeId: '1207', title: '热门微短剧', data: shortDramas },
        { typeId: '1', title: '热门电影推荐', data: movies },
        { typeId: '2', title: '热门电视剧场', data: series },
        { typeId: '3', title: '精彩综艺热播', data: variety },
        { typeId: '4', title: '热门动漫推荐', data: anime },
      ],
    });
  }

  // B. 搜索模式 (存在 wd)
  if (wd) {
    try {
      if (source === '4kvm') {
        const results4k = await fetch4kvmSearch(origin, wd, page);
        return c.json({
          success: true,
          isHome: false,
          source: '4kvm',
          count: results4k.length,
          total4kvm: results4k.length,
          totalOlevod: 0,
          page: parseInt(page),
          data: results4k,
        });
      }

      if (source === 'olevod') {
        const resultsOle = await fetchOlevodSearch(origin, wd, page);
        return c.json({
          success: true,
          isHome: false,
          source: 'olevod',
          count: resultsOle.length,
          total4kvm: 0,
          totalOlevod: resultsOle.length,
          page: parseInt(page),
          data: resultsOle,
        });
      }

      // 聚合双源检索 (source === 'all')
      const [oleRes, res4k] = await Promise.allSettled([
        fetchOlevodSearch(origin, wd, page),
        fetch4kvmSearch(origin, wd, page),
      ]);

      const oleData = oleRes.status === 'fulfilled' ? oleRes.value : [];
      const data4k = res4k.status === 'fulfilled' ? res4k.value : [];

      // 聚合排列：优先展示 4K 影视结果，随后展示欧乐影视
      const combined = [...data4k, ...oleData];

      return c.json({
        success: true,
        isHome: false,
        source: 'all',
        count: combined.length,
        total4kvm: data4k.length,
        totalOlevod: oleData.length,
        page: parseInt(page),
        data: combined,
      });
    } catch (error: any) {
      return c.json({ success: false, error: '搜索失败', message: error.message }, 500);
    }
  }

  // C. 单分类浏览模式 (存在 type)
  try {
    const videoList = await fetchOlevodCategory(origin, type || '1', page);
    return c.json({
      success: true,
      isHome: false,
      count: videoList.length,
      page: parseInt(page),
      type: type || '1',
      data: videoList,
    });
  } catch (error: any) {
    return c.json({ success: false, error: '抓取失败', message: error.message }, 500);
  }
});

// /api/video/:id - 视频详情与流解析
app.get('/api/video/:id', async (c) => {
  const id = c.req.param('id');
  const url = new URL(c.req.url);
  const origin = url.origin;
  const source = c.req.query('source') || 'olevod';
  const sid = c.req.query('sid') || '1';
  const nid = c.req.query('nid') || '1';

  try {
    if (source === '4kvm') {
      const data = await fetch4kvmDetail(origin, id, nid, sid);
      return c.json(data);
    }

    const data = await fetchOlevodDetail(origin, id, sid, nid);
    return c.json(data);
  } catch (error: any) {
    return c.json({ success: false, error: '详情解析失败', message: error.message }, 500);
  }
});

// /api/proxy-img - 图片代理（防盗链绕过与缓存）
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

    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };

    if (fullUrl.includes('olevod.com') || fullUrl.includes('olelive')) {
      headers['Referer'] = 'https://olevod.com/';
    } else if (fullUrl.includes('4kvm.net') || fullUrl.includes('4kvm.site')) {
      headers['Referer'] = 'https://www.4kvm.net/';
    }
    // 对 baidu, staticimgjs, tmdb 等开放图床不添加违规 Referer

    const res = await fetch(fullUrl, { headers });
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

// /api/proxy-m3u8 - M3U8 及视频切片代理（解除防盗链与切片重写）
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
    proxyHeaders.set('User-Agent', USER_AGENT);
    proxyHeaders.set('Accept', '*/*');

    // 精确设置 Referer：针对不同 CDN 采用白名单策略
    if (fullUrl.includes('olevod.com') || fullUrl.includes('olelive') || fullUrl.includes('olevod')) {
      proxyHeaders.set('Referer', 'https://olevod.com/');
      proxyHeaders.set('Origin', 'https://olevod.com');
    } else if (fullUrl.includes('4kvm.net') || fullUrl.includes('4kvm.site')) {
      proxyHeaders.set('Referer', 'https://www.4kvm.net/');
      proxyHeaders.set('Origin', 'https://www.4kvm.net');
    } else {
      // 对国内开放 CDN (如 xhscdn, douyinbit, alicdn, qcloud, byteimg 等)，不发送防盗链 Referer
      proxyHeaders.set('Referer', '');
    }

    const fetchOptions: RequestInit & { cf?: any } = {
      headers: proxyHeaders,
      cf: {
        cacheEverything: true,
        cacheTtl: isM3u8 ? 10 : 86400,
        cacheEverythingByHeader: true,
      },
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
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'public, max-age=10, s-maxage=10',
        },
      });
    }

    const rawBuffer = new Uint8Array(await response.arrayBuffer());
    let outputBuffer: Uint8Array = rawBuffer;

    // 自动检测并剥离图片伪装头（如 4KVM / ICVE / Douyinbit 等切片的 73 字节 PNG 伪装头）
    if (rawBuffer.length > 188 * 2 && rawBuffer[0] !== 0x47) {
      for (let i = 0; i < Math.min(rawBuffer.length - 188 * 2, 2048); i++) {
        if (rawBuffer[i] === 0x47 && rawBuffer[i + 188] === 0x47 && rawBuffer[i + 188 * 2] === 0x47) {
          outputBuffer = rawBuffer.subarray(i);
          break;
        }
      }
    }

    return new Response(outputBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return c.text(`Edge Proxy Error: ${error.message}`, 500);
  }
});

export default app;
