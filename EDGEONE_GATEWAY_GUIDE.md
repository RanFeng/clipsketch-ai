# EdgeOne Workers + AI Gateway 完整指南

## 🎯 核心概念澄清

### EdgeOne Workers 是什么？

**不是 VPN**，而是：
- 在 CDN 边缘节点运行的 **Serverless 函数**
- 能在 EdgeOne 的服务器上执行代码
- 可以转发（代理）HTTP 请求

**作用**：
```
浏览器 → EdgeOne Workers → 目标 API
         (服务器端，无 CORS 限制)
```

### 为什么需要？

```
❌ 浏览器直接请求：
浏览器 → api.mir6.com (返回 403 CORS 错误)

✅ 通过 Workers 代理：
浏览器 → EdgeOne Workers (你的服务器) → api.mir6.com
         (服务器端，没有 CORS 限制)
```

### EdgeOne AI Gateway 是什么？

你已开通的 `https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent` 是：
- 专门为 AI API 优化的网关
- 内置速率限制、认证、日志等功能
- 适用于 OpenAI、Gemini、Claude 等标准 API

---

## 🏗️ 推荐架构

### 方案一：使用你的 AI Gateway + Workers 代理其他请求

这是最佳实践，分工明确：

```
┌─────────────────────────────────────────────────────────────┐
│                    ClipSketch AI 应用                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      EdgeOne Pages                          │
│                    (部署你的应用)                          │
└─────────────────────────────────────────────────────────────┘
         ↓                              ↓
    ┌────────────┐              ┌──────────────┐
    │ AI Gateway │              │ Workers      │
    │ (Gemini)   │              │ (代理其他)   │
    └────────────┘              └──────────────┘
         ↓                              ↓
    ┌────────────┐              ┌──────────────┐
    │ aistudio   │              │ api.mir6.com │
    │ google.com │              │ xiaohongshu  │
    └────────────┘              │ instagram    │
                                 └──────────────┘
```

### 具体对应

| 请求类型 | 来源 | 处理方式 | 目标 |
|---------|------|--------|------|
| AI 生成（故事板、文案） | 前端 | 直接用 AI Gateway URL | Gemini API |
| 视频元数据解析 | 前端 | 通过 Workers 代理 | api.mir6.com, xiaohongshu |
| 静态资源 | 前端 | EdgeOne Pages 直接返回 | dist/ |

---

## 📋 部署步骤

### 步骤 1：获取 AI Gateway 信息

你已经有了：
```
https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent
```

需要：
- 确认这个 URL 是否需要认证头（如 Authorization）
- 获取 API Key（如果有的话）

### 步骤 2：修改代码使用 AI Gateway

编辑 `services/llm.ts`，找到 Gemini API 调用部分，改为：

```typescript
// 改前
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// 改后
const url = 'https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent';

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // 如果 AI Gateway 需要认证，添加这行
    // 'Authorization': `Bearer ${your_api_key}`
  },
  body: JSON.stringify({...})
});
```

### 步骤 3：部署 Workers（用于视频解析）

EdgeOne Workers 部署有 2 种方式：

#### 方式 A：通过 EdgeOne Console UI（推荐新手）

1. 登录 [EdgeOne Console](https://console.edgeone.ai)
2. **Workers** → **+ 新建脚本**
3. 粘贴以下代码：

```typescript
// workers-proxy.ts
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // 获取目标 URL
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    // 白名单检查
    const allowedDomains = [
      'bilibili.com', 'b23.tv',
      'xiaohongshu.com', 'xhslink.com',
      'instagram.com', 'instagr.am',
      'api.mir6.com',
      'api.cobalt.tools'
    ];

    const targetUrlObj = new URL(targetUrl);
    const isAllowed = allowedDomains.some(d => targetUrlObj.hostname.includes(d));
    
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Domain not allowed' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 转发请求
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('host');
    proxyHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' ? await request.text() : undefined,
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
```

4. **保存脚本**，记下 Worker URL，如：
   ```
   https://my-workers-abc123.eo-edgefunctions7.com
   ```

#### 方式 B：通过 Pages 函数目录（我们之前的方式）

在 Pages 项目的 `functions/` 目录放 `proxy.ts`，部署时自动创建 Worker

#### 方式 C：通过 wrangler CLI（高级，本地开发）

```bash
# 安装 wrangler
npm install -g wrangler

# 登录
wrangler login

# 创建项目
wrangler init my-proxy-worker

# 编辑 wrangler.toml 和 src/index.ts

# 部署
wrangler deploy
```

---

### 步骤 4：配置 Pages 路由规则

在 EdgeOne Pages 项目中，添加路由规则：

**方式 1：在 Pages 中使用 Functions**

如果你的 Pages 项目使用 `functions/proxy.ts`，路由会自动映射到 `/api/proxy`。

**方式 2：指向外部 Worker**

如果 Worker 是独立部署的，需要在 Pages 中配置重写规则：

在项目根目录创建 `_routes.json`：

```json
{
  "version": 1,
  "include": ["/api/proxy*"],
  "exclude": [],
  "routes": [
    {
      "pattern": "/api/proxy*",
      "methods": ["GET", "POST", "OPTIONS"],
      "function": "proxy"
    }
  ]
}
```

或者直接在 Pages 配置中添加路由规则（如果控制台支持）。

---

### 步骤 5：更新前端代码

修改 `services/parsers.ts`：

```typescript
// 改前
const PROXY_BASE = 'https://cros.alphaxiv.cn/';

// 改后
// 如果 Worker 部署在同一 Pages 项目
const PROXY_BASE = '/api/proxy?url=';

// 或者如果 Worker 是独立的
// const PROXY_BASE = 'https://my-workers-abc123.eo-edgefunctions7.com?url=';
```

---

### 步骤 6：修改 Gemini API 调用

编辑 `services/llm.ts`，找到所有 Gemini API 调用：

```typescript
// 改前
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}`;

// 改后（使用 AI Gateway）
const url = `https://ai-gateway.eo-edgefunctions7.com/v1/models/${model}:${endpoint}`;

// 添加认证（如果需要）
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,  // 如果 AI Gateway 需要
};
```

---

## 🧪 本地测试

### 测试 Workers 代理

```bash
# 测试代理是否工作
curl "http://localhost:3000/api/proxy?url=https://bilibili.com" \
  -H "Accept: text/html"

# 应该返回 HTML 内容，而非 403
```

### 测试 AI Gateway

```bash
# 测试 AI Gateway
curl "https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'

# 检查是否需要认证头
```

---

## 🌐 完整流程图

```
用户在浏览器打开应用
    ↓
┌─────────────────────────────────────────────┐
│   https://clipsketch.edgeone.app            │
│   (EdgeOne Pages - 你的应用)                │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│            应用加载 React                   │
│   - 加载 HTML/CSS/JS from EdgeOne Pages    │
└─────────────────────────────────────────────┘
    ↓
用户粘贴 Bilibili 链接，点击导入
    ↓
┌─────────────────────────────────────────────┐
│   fetch('/api/proxy?url=...')               │
│   (发送到 EdgeOne Workers)                  │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│   EdgeOne Workers 代理                       │
│   - 检查白名单                               │
│   - fetch(api.mir6.com)                     │
│   - 添加 CORS 头                             │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│   api.mir6.com                              │
│   返回视频信息 JSON                         │
└─────────────────────────────────────────────┘
         ↓
Workers 返回带 CORS 头的响应
    ↓
浏览器接收，解析视频 URL
    ↓
用户标记几个视频帧，点击 AI 绘图
    ↓
┌─────────────────────────────────────────────┐
│   fetch('https://ai-gateway...')            │
│   POST 带上所有帧和 API Key                 │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│   EdgeOne AI Gateway                        │
│   - 认证 API Key                             │
│   - 转发给 Gemini API                       │
│   - 记录日志和费用                         │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│   Google Gemini API                         │
│   生成故事板和文案                         │
└─────────────────────────────────────────────┘
    ↓
结果返回给浏览器显示
```

---

## 🔐 安全配置

### 在 Workers 中保护 API Key

不要在 Workers 代码中硬编码密钥！改用环境变量：

```typescript
// workers-proxy.ts
export default {
  async fetch(request, env) {
    // env.API_KEY 来自 EdgeOne 的环境变量配置
    const apiKey = env.API_KEY;
    
    // 在这里使用 apiKey
  }
}
```

在 EdgeOne Console 中配置环境变量：
1. **Workers** → **你的脚本** → **设置**
2. **环境变量** → **+ 添加**
   - Key: `API_KEY`
   - Value: `your_actual_key`

### AI Gateway 认证

如果 AI Gateway 需要认证，在 Pages 的环境变量中设置：

```
GEMINI_API_KEY=your_key
AI_GATEWAY_URL=https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent
```

然后在代码中使用：

```typescript
const apiKey = process.env.GEMINI_API_KEY;
const url = process.env.AI_GATEWAY_URL;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({...})
});
```

---

## 📊 成本考量

### EdgeOne Pages
- 免费额度：足够个人/小规模使用
- 按需付费：超出免费额度按流量计费

### EdgeOne Workers
- 免费额度：100 万请求/月
- 按需付费：超出后按百万请求计费（¥0.15/百万）

### EdgeOne AI Gateway
- 转发费用：通常免费或很便宜（只是 API 转发）
- Gemini API 费用：按 Google 官方价格（通常更便宜）

---

## ✅ 最终检查清单

### 部署前

- [ ] AI Gateway URL 已获取
- [ ] 确认 AI Gateway 是否需要认证
- [ ] Workers 代码已准备
- [ ] 前端代码已修改（使用 `/api/proxy` 和 AI Gateway URL）
- [ ] 白名单配置正确

### 部署时

- [ ] Workers 已部署到 EdgeOne
- [ ] Pages 路由规则已配置
- [ ] 环境变量已设置（API Key 等）
- [ ] CORS 头已在 Workers 中添加

### 部署后

- [ ] 打开网站，F12 查看 Network
- [ ] 导入视频 → 检查 `/api/proxy` 请求是否 200
- [ ] 生成故事板 → 检查 AI Gateway 请求是否成功
- [ ] 不应该有 403 或 CORS 错误

---

## 🆘 常见问题

**Q: Worker 返回 403？**
A: 检查目标域名是否在白名单中

**Q: AI Gateway 返回 401？**
A: 检查 API Key 是否正确、是否需要 Authorization 头

**Q: 仍然 CORS 错误？**
A: 确保 Workers 返回的响应包含：
```
Access-Control-Allow-Origin: *
```

**Q: Workers 部署后找不到？**
A: 检查 EdgeOne Console 中的 Workers 列表，确认状态为"已发布"

**Q: 如何监控 Workers 使用？**
A: EdgeOne Console → **Workers** → **监控** → 查看请求数、CPU 时间等

---

**建议**：使用你的 AI Gateway 作为 AI 请求的网关，EdgeOne Workers 作为其他 API 的代理，这样职责分离、易于管理。

