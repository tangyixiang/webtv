import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  try {
    // 补全协议相对 URL (如 //cdn.com/stream.m3u8)
    let fullUrl = targetUrl;
    if (fullUrl.startsWith('//')) {
      fullUrl = `https:${fullUrl}`;
    }

    const targetParsed = new URL(fullUrl);
    const baseUrl = `${targetParsed.protocol}//${targetParsed.host}${targetParsed.pathname.substring(0, targetParsed.pathname.lastIndexOf('/') + 1)}`;

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Referer': `${targetParsed.protocol}//${targetParsed.host}/`,
        'Accept': '*/*',
      },
      next: { revalidate: fullUrl.includes('.m3u8') ? 10 : 86400 } // ts切片可缓存1天，m3u8缓存10秒
    });

    if (!response.ok) {
      return new Response(`Failed to proxy stream: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3u8 = fullUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('apple');

    // 1. 如果是 M3U8 文本索引文件：重写内部所有切片和子播放列表的 URL 走 Worker 代理
    if (isM3u8) {
      const content = await response.text();
      const lines = content.split('\n');
      
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        // 忽略空行和以 # 开头的 M3U8 标签（除 #EXT-X-KEY 外）
        if (!trimmed || (trimmed.startsWith('#') && !trimmed.startsWith('#EXT-X-KEY'))) {
          return line;
        }

        // 处理加密 Key URL (#EXT-X-KEY:METHOD=AES-128,URI="...")
        if (trimmed.startsWith('#EXT-X-KEY')) {
          return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
            const absoluteKeyUrl = uri.startsWith('http') ? uri : new URL(uri, baseUrl).toString();
            return `URI="${origin}/api/proxy-m3u8?url=${encodeURIComponent(absoluteKeyUrl)}"`;
          });
        }

        // 处理 .ts 切片或子 .m3u8 的绝对/相对 URL
        const absoluteSegmentUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
        return `${origin}/api/proxy-m3u8?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      });

      return new Response(rewrittenLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'public, max-age=10',
        },
      });
    }

    // 2. 如果是 .ts 视频切片或二进制数据：直接通过 Worker 将字节流管道透传，补全 CORS 跨域头
    const body = response.body;
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=86400', // Worker 节点缓存 24 小时切片
      },
    });

  } catch (error: any) {
    console.error('M3U8 Worker Proxy Error:', error);
    return new Response(`Edge Proxy Error: ${error.message}`, { status: 500 });
  }
}
