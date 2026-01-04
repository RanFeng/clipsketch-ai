/**
 * EdgeOne Edge Functions - CORS 代理
 */

export async function onRequest(context: any) {
  const request = context.request;
  
  try {
    // 仅允许 GET 和 POST 请求
    if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'OPTIONS') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 处理 CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // 解析目标 URL
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证目标 URL - 仅允许特定域名
    const allowedDomains = [
      'bilibili.com',
      'b23.tv',
      'xiaohongshu.com',
      'xhslink.com',
      'instagram.com',
      'instagr.am',
      'api.mir6.com',
      'api.cobalt.tools',
      'sns-video-bd.xhscdn.com',
      'aistudio.google.com',
    ];

    let isAllowed = false;
    try {
      const targetUrlObj = new URL(targetUrl);
      isAllowed = allowedDomains.some(domain => 
        targetUrlObj.hostname.includes(domain)
      );
    } catch (e) {
      console.error('Invalid target URL:', targetUrl);
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Target domain not in allowlist' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构建代理请求头
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('host');
    proxyHeaders.delete('origin');
    proxyHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 发送代理请求
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    const response = await fetch(proxyRequest);

    // 添加 CORS 头到响应
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    responseHeaders.set('Cache-Control', 'public, max-age=3600');
    
    // 移除 Content-Encoding 以避免浏览器解码错误
    responseHeaders.delete('content-encoding');

    // 返回代理响应
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
