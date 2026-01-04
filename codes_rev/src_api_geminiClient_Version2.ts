// 在前端调用 /api/gemini，由 edge 函数使用后端 key 转发到 Gemini
export async function callGemini(payload: any) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini proxy error: ${res.status} ${err}`)
  }
  return res.json()
}