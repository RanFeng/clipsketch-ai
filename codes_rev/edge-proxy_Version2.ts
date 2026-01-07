// Edge / Serverless 统一 proxy 示例（支持 /api/gemini 和 /api/proxy?url=...）
// 在 EdgeOne 上部署时，请把 GEMINI_API_KEY 和 GEMINI_API_URL 作为环境变量设置（不放在前端）
// 注意：根据 EdgeOne runtime，访问 env 的方式可能是 process.env 或其它（确认平台文档）

const ALLOWED_HOSTS = ['api.mir6.com', 'www.bilibili.com'] // 可扩展白名单

function isAllowed(targetUrl: string) {
  try {
    const u = new URL(targetUrl)
    return ALLOWED_HOSTS.includes(u.hostname)
  } catch {
    return false
  }
}

function getEnv(key: string) {
  // 兼容不同 runtime：尝试 process.env，然后 globalThis
  // 在 EdgeOne 控制台将 GEMINI_API_KEY 与 GEMINI_API_URL 设置为环境变量
  return (typeof process !== 'undefined' && (process.env as any)[key]) || (globalThis as any)[key] || ''
}

export default async function handler(request: Request) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const urlObj = new URL(request.url)
  const pathname = urlObj.pathname

  // --- /api/gemini: 专门转发到 Gemini API，使用后端环境变量的 key ---
  if (pathname === '/api/gemini') {
    const GEMINI_API_KEY = getEnv('GEMINI_API_KEY')
    const GEMINI_API_URL = getEnv('GEMINI_API_URL') // e.g. "https://api.your-gemini-endpoint.com/v1/..."
    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      return new Response(JSON.stringify({ error: 'Gemini API not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    try {
      // 将前端请求体转发给 Gemini
      const body = await request.arrayBuffer()
      // 构造转发请求，可根据 Gemini API 需要调整 Authorization / 特定 headers
      const upstream = await fetch(GEMINI_API_URL, {
        method: request.method || 'POST',
        headers: {
          'Content-Type': request.headers.get('Content-Type') || 'application/json',
          // 这里用 Authorization Bearer 作为示例；若 Gemini 使用不同 header，请改成对应 header（X-API-Key / Authorization）
          'Authorization': `Bearer ${GEMINI_API_KEY}`,
        },
        body: body.byteLength ? body : undefined,
      })

      const resultBody = await upstream.arrayBuffer()
      const headers = new Headers(upstream.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      // 删除或调整可能导致浏览器拒绝的响应头
      headers.delete('Content-Security-Policy')

      return new Response(resultBody, {
        status: upstream.status,
        headers,
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
  }

  // --- /api/proxy?url=...: 通用代理（白名单） ---
  if (pathname === '/api/proxy') {
    const urlParam = urlObj.searchParams.get('url')
    if (!urlParam) {
      return new Response(JSON.stringify({ error: 'missing url param' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    const target = decodeURIComponent(urlParam)
    if (!isAllowed(target)) {
      return new Response(JSON.stringify({ error: 'target not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    try {
      // 转发请求方法与 headers（小心不要把敏感 header 转发给 upstream）
      const upstream = await fetch(target, {
        method: 'GET',
        headers: {
          // 如需转发特定 header，可从 request.headers 里筛选
          'User-Agent': 'EdgeOne-Proxy',
        },
      })

      const body = await upstream.arrayBuffer()
      const headers = new Headers(upstream.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      headers.delete('Content-Security-Policy')

      return new Response(body, {
        status: upstream.status,
        headers,
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
  }

  // 其他路径：返回 404
  return new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}