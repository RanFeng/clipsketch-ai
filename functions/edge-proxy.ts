// Edge / Serverless 统一 proxy 示例（支持 /api/gemini 和 /api/proxy?url=...）
// 部署到 EdgeOne 时，请把 GEMINI_API_KEY 与 GEMINI_API_URL 配置为环境变量（不要把密钥放在仓库或前端）
// 注意：根据 EdgeOne 的 runtime，读取环境变量可能直接通过 process.env

const ALLOWED_HOSTS = ['api.mir6.com', 'www.bilibili.com'] // 根据需要扩展白名单

function isAllowed(targetUrl: string) {
  try {
    const u = new URL(targetUrl)
    return ALLOWED_HOSTS.includes(u.hostname)
  } catch {
    return false
  }
}

function getEnv(key: string) {
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

  // --- /api/gemini: 后端转发到 Gemini，使用环境变量的 key ---
  if (pathname === '/api/gemini') {
    const GEMINI_API_KEY = getEnv('GEMINI_API_KEY')
    const GEMINI_API_URL = getEnv('GEMINI_API_URL') // 例如: "https://api.mygemini.example/v1/..."
    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      return new Response(JSON.stringify({ error: 'Gemini API not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    try {
      // 将前端请求体转发给 Gemini（支持 POST/GET，根据实际 API 调整）
      const body = await request.arrayBuffer()
      const upstream = await fetch(GEMINI_API_URL, {
        method: request.method || 'POST',
        headers: {
          'Content-Type': request.headers.get('Content-Type') || 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`, // 若 Gemini 用其它头请改成对应 header
        },
        body: body.byteLength ? body : undefined,
      })

      const resultBody = await upstream.arrayBuffer()
      const headers = new Headers(upstream.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
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
      const upstream = await fetch(target, {
        method: 'GET',
        headers: {
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
