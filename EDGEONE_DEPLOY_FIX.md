# EdgeOne Pages 部署修复方案

## 问题分析

### 1. **静态资源 404**
- **原因**：Vite 构建后的 `index.html` 中引用 `/index.css` 和 `/index.tsx`，但这些文件在 EdgeOne 上的路径不对
- **本地可用**：localhost:3000 是开发服务器，Vite 自动处理模块转换
- **生产失败**：EdgeOne Pages 部署需要明确的 base 路径配置

### 2. **Tailwind CDN 警告**
- **问题**：index.html 使用 `<script src="https://cdn.tailwindcss.com"></script>`
- **为什么不好**：
  - CDN 脚本在生产环境不稳定，可能被阻止
  - 无法优化 CSS 包大小
  - 依赖外部 CDN 可用性
- **解决**：使用 PostCSS + Tailwind 在构建时生成 CSS

### 3. **CORS 跨域阻止（403）**
- **根本原因**：浏览器直接 fetch `api.mir6.com` / Bilibili / `cros.alphaxiv.cn` 时被阻止
- **当前代码问题**：
  - Bilibili 解析：`fetch(\`${PROXY_BASE}${encodeURIComponent(apiUrl)}\`)` 双重代理不可靠
  - Xiaohongshu 解析：`fetch(\`${PROXY_BASE}${encodeURIComponent(url)}\`)` 依赖第三方代理
  - `cros.alphaxiv.cn` 已失效，返回 403
- **解决方案**：在 EdgeOne 上创建 Serverless Function，由后端代理这些请求

---

## 修复方案（分步骤）

### Step 1: 修复 Vite 配置 + 添加 Tailwind 构建

**文件**：`vite.config.ts`

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      // 生产环境 base 路径配置
      base: mode === 'production' ? '/' : '/',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      
      plugins: [react()],
      
      build: {
        // 确保输出到标准 dist 目录
        outDir: 'dist',
        emptyOutDir: true,
        // 优化资源大小
        minify: 'terser',
        // 生成 sourcemap 便于调试
        sourcemap: mode !== 'production',
      },
      
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.PROXY_URL': JSON.stringify(env.PROXY_URL || '/api/proxy'),
      },
      
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './'),
        }
      }
    };
});
```

### Step 2: 删除 Tailwind CDN，添加正确的 CSS 导入

**文件**：`index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClipSketch AI</title>
    <!-- 移除 CDN 脚本，改用构建时的 CSS -->
    <style>
      /* Custom range input styling for better UX */
      input[type=range] {
        -webkit-appearance: none;
        width: 100%;
        background: transparent;
      }
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
      }
      input[type=range]:focus {
        outline: none;
      }
      input[type=range]::-ms-track {
        width: 100%;
        cursor: pointer;
        background: transparent;
        border-color: transparent;
        color: transparent;
      }
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased h-screen overflow-hidden">
    <div id="root" class="h-full"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

### Step 3: 创建 Tailwind 配置

**文件**：`tailwind.config.js`（新建）

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 4: 创建 PostCSS 配置

**文件**：`postcss.config.cjs`（新建）

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 5: 创建 Tailwind CSS 入口文件

**文件**：`index.css`（新建）

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 6: 在 index.tsx 中导入 CSS

**文件**：`index.tsx`（修改）

```typescript
import './index.css';  // 添加这一行（第一行）
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Step 7: 更新 package.json 依赖

```bash
npm install -D tailwindcss postcss autoprefixer
```

**更新后的 package.json**：

```json
{
  "name": "clipsketch-ai",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "lucide-react": "^0.554.0",
    "jszip": "latest",
    "@google/genai": "latest"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
```

### Step 8: 创建 EdgeOne Serverless 代理函数

**文件**：`functions/proxy.ts`（新建）

```typescript
export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 获取目标 URL
  const targetUrl = url.searchParams.get('url');
  const method = url.searchParams.get('method') || 'GET';
  
  if (!targetUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  try {
    // 验证目标 URL 来自允许的域名
    const allowedDomains = ['bilibili.com', 'xiaohongshu.com', 'api.mir6.com', 'api.cobalt.tools'];
    const targetUrlObj = new URL(targetUrl);
    
    const isAllowed = allowedDomains.some(domain => targetUrlObj.hostname.includes(domain));
    if (!isAllowed) {
      return new Response('Target domain not allowed', { status: 403 });
    }

    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('host');
    proxyHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const response = await fetch(targetUrl, {
      method: method,
      headers: proxyHeaders,
      ...(method !== 'GET' && { body: await request.text() }),
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}
```

### Step 9: 修改 parsers.ts 使用代理

**文件**：`services/parsers.ts`（关键修改）

```typescript
// 替换代理基础 URL
const PROXY_BASE = '/api/proxy?url=';  // 改为本地 EdgeOne 函数

// Bilibili 解析器修改
class BilibiliParser implements VideoParser {
  async parse(url: string): Promise<VideoMetadata> {
    console.log(`Bilibili: Parsing via EdgeOne proxy...`);
    
    // 构建代理请求
    const apiUrl = `https://api.mir6.com/api/bzjiexi?url=${encodeURIComponent(url)}&type=json`;
    const proxyUrl = `${PROXY_BASE}${encodeURIComponent(apiUrl)}&method=GET`;
    
    const response = await fetch(proxyUrl);
    const json = await response.json();

    if (json.code === 200 && json.data && json.data.length > 0) {
      const videoData = json.data[0];
      let videoUrl = videoData.video_url;
      const duration = videoData.duration;
      
      if (!videoUrl) throw new Error("API returned success but no video URL found.");

      if (videoUrl.startsWith('http:')) {
        videoUrl = videoUrl.replace('http:', 'https:');
      }

      return { 
        url: videoUrl,
        duration: typeof duration === 'number' ? duration : undefined,
        title: json.title || videoData.title,
        content: json.desc || videoData.desc
      };
    } else {
      throw new Error(json.msg || "Bilibili API parsing failed");
    }
  }
}

// Xiaohongshu 和 Generic 解析器也类似修改
```

### Step 10: 更新 .env.local

```env
GEMINI_API_KEY=your_gemini_api_key_here
PROXY_URL=/api/proxy
```

---

## EdgeOne 部署步骤

### 1. 绑定仓库到 EdgeOne Pages
```bash
# 推送代码到 GitHub
git add .
git commit -m "Fix EdgeOne deployment: Tailwind CSS, Vite config, CORS proxy"
git push origin main
```

### 2. EdgeOne 控制台配置
1. 登录 [EdgeOne Console](https://console.edgeone.ai)
2. **Pages** → **新建项目** → 连接 GitHub 仓库
3. 配置构建设置：
   - **构建命令**：`npm install && npm run build`
   - **输出目录**：`dist`
   - **环境变量**：
     ```
     GEMINI_API_KEY=your_key_here
     PROXY_URL=/api/proxy
     ```

### 3. 部署函数（若 EdgeOne 支持）
- 上传 `functions/proxy.ts` 到 EdgeOne Functions
- 或使用 Workers 脚本：
  ```javascript
  export default {
    async fetch(request) {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      // ... proxy 逻辑
    }
  }
  ```

### 4. 验证部署
```bash
# 本地测试构建
npm run build
npm run preview

# 检查 dist 目录
ls -la dist/
```

---

## 关键变更总结

| 问题 | 原因 | 修复 |
|------|------|------|
| 静态资源 404 | Vite base 路径缺失 | 添加 `base: '/'` + 完整 CSS 导入 |
| Tailwind 警告 | 使用 CDN | PostCSS + Tailwind CLI 构建时生成 |
| CORS 403 | 浏览器直接 fetch 被阻止 | EdgeOne Serverless 函数做代理 |
| 路径错误 | PROXY_BASE 指向已失效的 cros.alphaxiv.cn | 改用本地 `/api/proxy` |

---

## 测试清单

- [ ] `npm run build` 无报错
- [ ] `dist/index.html` 存在且包含正确的脚本/样式引用
- [ ] `npm run preview` 本地预览可正常工作
- [ ] Tailwind 样式正确应用（背景色、文本色等）
- [ ] API 代理函数在生产环境可访问
- [ ] Bilibili/小红书 视频导入成功
- [ ] Gemini API 调用正常

