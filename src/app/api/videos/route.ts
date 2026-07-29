import { NextResponse } from 'next/server';

export const runtime = 'edge';

// 抓取单个类目的通用工具函数
async function fetchCategoryItems(typeId: string, limit = 12) {
  const targetUrl = typeId === 'home' 
    ? 'https://olevod.com/index.html' 
    : `https://olevod.com/index.php/vod/type/id/${typeId}.html`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
      next: { revalidate: 300 }
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

      videoList.push({
        id,
        title: title.trim(),
        img,
        playUrl: `/play/${id}`,
        score: (8.0 + (parseInt(id) % 15) * 0.1).toFixed(1)
      });
    }

    return videoList;
  } catch (e) {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const page = searchParams.get('page') || '1';
  const wd = searchParams.get('wd');

  // 如果没有分类参数且没有搜索词，说明是【首页模式】，按版块分组并行抓取
  if (!type && !wd) {
    const [shortDramas, movies, series, variety, anime] = await Promise.all([
      fetchCategoryItems('1207', 6), // 短剧
      fetchCategoryItems('1', 12),   // 电影
      fetchCategoryItems('2', 12),   // 电视剧
      fetchCategoryItems('3', 6),    // 综艺
      fetchCategoryItems('4', 6),    // 动漫
    ]);

    return NextResponse.json({
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

  // 否则是【单分类/搜索模式】
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
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
      next: { revalidate: 120 }
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

      videoList.push({
        id,
        title: title.trim(),
        img,
        playUrl: `/play/${id}`,
        score: (8.0 + (parseInt(id) % 15) * 0.1).toFixed(1)
      });
    }

    return NextResponse.json({
      success: true,
      isHome: false,
      count: videoList.length,
      page: parseInt(page),
      type,
      data: videoList,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: '抓取失败', message: error.message },
      { status: 500 }
    );
  }
}
