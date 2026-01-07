# EdgeOne 代理 Worker 部署指南

你的应用已部署成功，但代理还未配置。需要独立部署一个 Worker。

## 🚀 快速部署步骤

### Step 1: 打开 EdgeOne Console

https://console.edgeone.ai

### Step 2: 创建 Worker

左侧菜单 → **Workers** → **+ 新建脚本**

### Step 3: 粘贴代码

把下面的代码复制粘贴到编辑器：

```typescript
export default {
  async fetch(request) {
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
      proxyHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // 发送代理请求
      const method = url.searchParams.get('method') || request.method;
      const proxyRequest = new Request(targetUrl, {
        method: method,
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

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
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
};
```

### Step 4: 保存脚本

点击 **保存** 按钮

### Step 5: 获取 Worker URL

保存后，你会看到类似这样的 URL：
```
https://your-script-name-xxxxx.eo-edgefunctions7.com
```

记下这个 URL

### Step 6: 配置应用中的代理 URL

有两个选择：

**选择 A：修改代码（推荐）**

在 `services/parsers.ts` 第 10 行，改成你的 Worker URL：

```typescript
// 改前
const PROXY_BASE = '/api/proxy?url=';

// 改后（替换成你的 Worker URL）
const PROXY_BASE = 'https://your-script-name-xxxxx.eo-edgefunctions7.com?url=';
```

**选择 B：配置 EdgeOne Pages 路由**

在 EdgeOne Pages 项目中添加路由规则：
```
路径: /api/proxy*
目标: 你的 Worker URL
```

### Step 7: 重新构建和部署

```bash
# 如果选择 A（修改代码）
npm run build
git commit -am "Use EdgeOne Worker proxy URL"
git push myrepo edgeone-deployment

# EdgeOne Pages 会自动重新部署
```

### Step 8: 测试

部署完成后，在应用中输入 Bilibili 链接，测试是否能导入视频。

---

## 🧪 如何知道 Worker 是否工作

在浏览器控制台测试：

```javascript
// 测试代理是否工作
fetch('https://your-script-name-xxxxx.eo-edgefunctions7.com?url=https://www.bilibili.com/video/BV1...')
  .then(r => r.text())
  .then(html => console.log('Success! Got HTML:', html.length, 'bytes'))
  .catch(e => console.error('Error:', e))
```

如果返回 HTML 内容，说明 Worker 工作正常。

---

## ⚠️ 常见问题

**Q: Worker 返回 403？**
A: 检查目标 URL 的域名是否在 allowedDomains 列表中

**Q: Worker 返回 500？**
A: 检查请求 URL 格式是否正确，应该是 `?url=TARGET_URL`

**Q: 仍然显示 "Could not find video stream"？**
A: 
1. 确认代理 URL 正确
2. 检查浏览器 Network 标签，看 `/api/proxy` 或 Worker URL 的请求是否返回 200
3. 如果返回 403，说明域名被拦截了

---

## 📋 完整检查清单

- [ ] Worker 脚本已创建
- [ ] Worker 已保存并获得 URL
- [ ] services/parsers.ts 已更新为 Worker URL（或配置了路由）
- [ ] 代码已推送 (git push)
- [ ] EdgeOne Pages 已重新部署
- [ ] 测试导入视频是否成功

---

## 💡 提示

如果你不想修改代码，可以在 EdgeOne Pages 项目中配置路由重写：

```
所有 /api/proxy* 的请求 → 转发到你的 Worker
```

这样前端代码保持不变，只需 EdgeOne 配置。
