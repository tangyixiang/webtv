import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  try {
    let fullUrl = targetUrl;
    if (fullUrl.startsWith('//')) {
      fullUrl = `https:${fullUrl}`;
    }

    const targetParsed = new URL(fullUrl);
    const isM3u8 = fullUrl.includes('.m3u8');
    const baseUrl = `${targetParsed.protocol}//${targetParsed.host}${targetParsed.pathname.substring(0, targetParsed.pathname.lastIndexOf('/') + 1)}`;

    // 净化请求头：删除可能透传的中国大陆 IP 标头，伪装为海外请求头以绕过源站 Geo-IP 拦截
    const proxyHeaders = new Headers();
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    proxyHeaders.set('Referer', 'https://olevod.com/');
    proxyHeaders.set('Origin', 'https://olevod.com');
    proxyHeaders.set('Accept', '*/*');
    proxyHeaders.set('X-Forwarded-For', '103.21.244.1');

    // 开启 Cloudflare 原生 CDN 边缘缓存 (cf: { cacheEverything: true })
    const fetchOptions: RequestInit & { cf?: any } = {
      headers: proxyHeaders,
      cf: {
        cacheEverything: true,
        cacheTtl: isM3u8 ? 10 : 86400, // TS 视频切片在 Cloudflare 全球边缘节点强行缓存 24 小时
        cacheEverythingByHeader: true,
      }
    };

    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      return new Response(`Failed to proxy stream: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';

    // 1. M3U8 播放列表处理：重写内部所有 ts / key 切片链接
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

    // 2. TS 视频切片文件：开启浏览器与 CDN 的极速强缓存
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable', // 极致强缓存，切片瞬间读取
      },
    });

  } catch (error: any) {
    return new Response(`Edge Proxy Error: ${error.message}`, { status: 500 });
  }
}
