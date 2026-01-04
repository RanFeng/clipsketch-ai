# EdgeOne AI Gateway 快速部署指南

你已经有 EdgeOne AI Gateway，这是最简洁的方案。

## 🎯 方案对比

### ❌ 原始方案
```
浏览器 → Google Gemini API (需要 VPN/代理)
```

### ✅ 你的方案（使用 AI Gateway）
```
浏览器 → EdgeOne AI Gateway → Google Gemini API (无需 VPN)
```

这样做的好处：
- ✅ 国内可直接访问（不需要 VPN）
- ✅ 自动转发 API 请求
- ✅ 可以监控费用和日志
- ✅ 自动处理速率限制

---

## 📋 三步完成配置

### 1️⃣ 确认 AI Gateway 信息

你已有：
```
https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent
```

**需要检查**：
```bash
# 测试这个 URL 是否工作
curl -X POST https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'

# 应该返回 Gemini 的回复，而非 403
```

**如果返回 403**：
- 检查 API Key 是否正确
- 确认 API Gateway 权限设置
- 验证请求格式是否符合 Gemini API 规范

### 2️⃣ 修改前端代码

#### 选项 A：直接使用 AI Gateway（推荐）

编辑 `services/llm.ts`，找到 Gemini API 调用的地方：

```typescript
// 改前
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// 改后
const url = `https://ai-gateway.eo-edgefunctions7.com/v1/models/${model}:generateContent`;

// 或使用环境变量（更安全）
const aiGatewayUrl = process.env.REACT_APP_AI_GATEWAY_URL;
const url = `${aiGatewayUrl}`;
```

#### 选项 B：使用我们提供的适配文件

我们已经创建了 `services/llm-ai-gateway.ts`，可以直接替换：

```bash
# 备份原文件
cp services/llm.ts services/llm.ts.bak

# 使用新文件
cp services/llm-ai-gateway.ts services/llm.ts
```

### 3️⃣ 配置环境变量

在 `.env.local` 中添加：

```env
# Gemini API Key（从 Google Cloud 获取）
GEMINI_API_KEY=your_actual_gemini_key

# EdgeOne AI Gateway URL
REACT_APP_AI_GATEWAY_URL=https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-2.0-flash:generateContent
```

或者在 EdgeOne Pages 的环境变量配置中添加相同内容。

---

## 🚀 部署步骤（简化版）

### Step 1: 本地测试

```bash
cd /Users/qinxiaoqiang/Downloads/clipsketch-ai

# 安装依赖（如果还没做）
npm install -D tailwindcss postcss autoprefixer

# 构建
npm run build

# 预览
npm run preview
```

打开 http://localhost:4173，检查：
- ✅ 页面加载正常
- ✅ 样式正确（深灰背景）
- ✅ DevTools 无错误

### Step 2: 推送代码

```bash
git add -A
git commit -m "Use EdgeOne AI Gateway instead of direct Google API"
git push origin main
```

### Step 3: EdgeOne Pages 部署

1. 登录 [EdgeOne Console](https://console.edgeone.ai)
2. **Pages** → **+ 新建项目** → 选择 GitHub 仓库
3. 构建设置：
   - 命令：`npm install && npm run build`
   - 输出目录：`dist`
4. 环境变量：
   ```
   GEMINI_API_KEY=your_key
   REACT_APP_AI_GATEWAY_URL=https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-2.0-flash:generateContent
   ```
5. **部署**

### Step 4: 为什么不需要 Workers？

因为：
- ✅ **AI 请求**：直接走 AI Gateway，无需代理
- ✅ **视频解析**：还是需要代理（Bilibili、小红书有 CORS 限制）

所以我们需要一个轻量级的代理，只用于视频元数据请求。

---

## 🔧 如果还需要视频解析代理

### 快速方案：使用 Pages Functions

在 EdgeOne Pages 中使用内置的 Functions，无需额外部署 Workers：

**步骤**：

1. 在项目根目录创建 `functions/proxy.ts`：

```typescript
export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url', { status: 400 });
  }

  // 白名单
  const allowed = ['bilibili.com', 'xiaohongshu.com', 'api.mir6.com', 'api.cobalt.tools'];
  const allowed_all = allowed.some(d => targetUrl.includes(d));
  if (!allowed_all) return new Response('Not allowed', { status: 403 });

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    const newHeaders = new Headers(res.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(res.body, {
      status: res.status,
      headers: newHeaders,
    });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
```

2. Pages 会自动将 `functions/proxy.ts` 映射到 `/api/proxy`

3. 修改 `services/parsers.ts`：
```typescript
const PROXY_BASE = '/api/proxy?url=';  // 自动指向本地函数
```

4. 部署 Pages 时，函数会一起部署

---

## 📊 架构图

```
┌──────────────────────────────────────┐
│        你的应用                      │
│   https://app.edgeone.app           │
└──────────────────────────────────────┘
              ↓
      ┌───────────────┬──────────────┐
      ↓               ↓              ↓
  AI 请求       视频请求      静态资源
      ↓               ↓              ↓
┌─────────────┐  ┌─────────┐  ┌──────────┐
│ AI Gateway  │  │Functions│  │EdgeOne   │
│             │  │ Proxy   │  │Pages CDN │
└─────────────┘  └─────────┘  └──────────┘
      ↓               ↓
┌─────────────┐  ┌──────────────────┐
│Google       │  │Bilibili API      │
│Gemini API   │  │Xiaohongshu API   │
└─────────────┘  │api.mir6.com      │
                 └──────────────────┘
```

---

## ✅ 最终检查清单

### 本地验证
- [ ] `npm run build` 成功
- [ ] `npm run preview` 可访问
- [ ] 没有 404 或样式错误

### 代码修改
- [ ] 修改了 llm.ts 使用 AI Gateway URL
- [ ] 设置了 .env.local 中的 API Key
- [ ] （可选）创建了 functions/proxy.ts 用于视频解析

### 部署配置
- [ ] EdgeOne Pages 环境变量已设置
- [ ] 构建命令和输出目录正确
- [ ] API Key 已安全保存（不要提交到 GitHub）

### 生产验证
- [ ] 网站打开正常
- [ ] 生成故事板时能调用 AI Gateway
- [ ] 导入视频时代理正常工作（如果有）

---

## 🆘 常见问题

**Q: AI Gateway 返回 401/403？**
A: 检查：
1. API Key 是否正确
2. 环境变量是否正确设置
3. AI Gateway URL 是否正确拷贝
4. Authorization 头格式是否为 `Bearer {key}`

**Q: 还需要设置什么吗？**
A: 不需要！就这么简单：
- ✅ 代码改用 AI Gateway URL
- ✅ 设置环境变量
- ✅ 部署

**Q: Workers 是必需的吗？**
A: 不是。如果你只使用生成功能（不导入视频），就不需要 Workers。
如果需要导入视频，可以用 Pages Functions 代替 Workers，更简单。

**Q: 能监控费用吗？**
A: 能。在 EdgeOne Console → AI Gateway 中可以看到：
- API 调用次数
- 总费用
- 错误日志

---

## 📝 文件清单

已创建的文件：
- ✅ `services/llm-ai-gateway.ts` - 适配 AI Gateway 的 LLM 服务
- ✅ `EDGEONE_GATEWAY_GUIDE.md` - 详细指南
- ✅ `EDGE_GATEWAY_QUICK_START.md` - 本文档

需要修改的文件：
- `services/llm.ts` - 改用 AI Gateway URL
- `.env.local` - 添加环境变量
- `package.json` - （可选）如果构建失败

---

## 🎉 完成！

只需 3 步：
1. ✅ 修改代码使用 AI Gateway URL
2. ✅ 设置环境变量
3. ✅ 部署到 EdgeOne Pages

无需 VPN，无需复杂配置，国内直接使用 Gemini API。

祝你使用愉快！

