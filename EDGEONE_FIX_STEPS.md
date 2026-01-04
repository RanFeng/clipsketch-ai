# EdgeOne 部署修复 - 按步骤执行

## 快速总结
本项目有 3 个核心问题需要修复：
1. **静态资源 404** → 修复 Vite 配置 + CSS 导入
2. **Tailwind CDN 警告** → 使用 PostCSS 构建时生成 CSS
3. **CORS 403** → 创建本地代理函数替代第三方代理

---

## 第一步：安装必要依赖

```bash
cd /Users/qinxiaoqiang/Downloads/clipsketch-ai

# 安装 Tailwind 和 PostCSS
npm install -D tailwindcss postcss autoprefixer

# 验证安装
npm list tailwindcss
```

**预期输出**：
```
clipsketch-ai@0.0.0
├── tailwindcss@3.x.x
├── postcss@8.x.x
└── autoprefixer@10.x.x
```

---

## 第二步：检查新建的配置文件

```bash
# 验证以下文件已存在（应该已在前面创建）
ls -la \
  vite.config.ts \
  tailwind.config.js \
  postcss.config.cjs \
  index.css \
  index.html

# 应该看到所有文件都列出来
```

---

## 第三步：验证 CSS 导入

检查 `index.tsx` 的第一行：

```bash
head -5 index.tsx
```

**应该看到**：
```
import './index.css';  // 导入 Tailwind CSS（关键）
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
```

---

## 第四步：本地测试构建

```bash
# 清理旧的构建（可选）
rm -rf dist

# 构建
npm run build

# 检查输出
ls -lah dist/
```

**应该看到**：
- `index.html` (小于 10KB)
- `index-[hash].js` (主应用)
- `vendor-[hash].js` (React 等)
- `index-[hash].css` (Tailwind CSS)

**关键检查**：检查 `dist/index.html` 中的脚本引用是否正确：

```bash
cat dist/index.html | grep -E 'href=|src=' | head -5
```

应该看到类似：
```html
<link rel="stylesheet" href="/assets/index-abc123.css">
<script type="module" src="/assets/index-def456.js"></script>
```

---

## 第五步：本地预览

```bash
# 启动预览服务
npm run preview

# 应该看到：
# ➜  Local:   http://localhost:4173/
# ➜  Network: http://xxx.xxx.xxx.xxx:4173/
```

打开浏览器访问 `http://localhost:4173`

**检查清单**：
- [ ] 页面加载无错误
- [ ] 背景色正确（深灰 `bg-slate-950`）
- [ ] 文字颜色正确（浅灰）
- [ ] 没有 404 错误（检查 DevTools Console）
- [ ] 没有 Tailwind CDN 警告

按 `Ctrl+C` 停止预览。

---

## 第六步：修改解析器（从第三方代理改为本地代理）

选项 A：快速修复（推荐）
```bash
# 备份原文件
cp services/parsers.ts services/parsers.ts.bak

# 使用修复版本
cp services/parsers-fixed.ts services/parsers.ts
```

选项 B：手动修改
编辑 `services/parsers.ts`，找到第 10 行：
```typescript
const PROXY_BASE = 'https://cros.alphaxiv.cn/';
```

改为：
```typescript
const PROXY_BASE = '/api/proxy?url=';
```

然后找到 Bilibili 解析器（第 205-240 行），修改为：
```typescript
class BilibiliParser implements VideoParser {
  async parse(url: string): Promise<VideoMetadata> {
    const apiUrl = `https://api.mir6.com/api/bzjiexi?url=${encodeURIComponent(url)}&type=json`;
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    // ... 保持其余逻辑不变
  }
}
```

---

## 第七步：设置环境变量

编辑或创建 `.env.local`：

```bash
cat > .env.local << 'EOF'
# Gemini API Key - 从 https://aistudio.google.com/app/apikey 获取
GEMINI_API_KEY=your_actual_api_key_here

# 本地代理 URL（在 EdgeOne 上）
PROXY_URL=/api/proxy
EOF

# 验证
cat .env.local
```

---

## 第八步：再次测试本地构建

```bash
# 清理旧构建
rm -rf dist

# 重新构建
npm run build

# 检查是否有任何警告
```

**应该看到无警告的构建完成**。

---

## 第九步：准备 EdgeOne 部署

### 9a. 更新 GitHub 仓库

```bash
# 添加所有修改
git add -A

# 提交
git commit -m "Fix EdgeOne deployment: 
  - Add Tailwind CSS build configuration
  - Fix Vite base path configuration
  - Replace third-party proxy with local EdgeOne proxy
  - Move from Tailwind CDN to PostCSS"

# 推送
git push origin main
```

### 9b. 在 EdgeOne 控制台配置

1. 登录 [EdgeOne Console](https://console.edgeone.ai)
2. **Pages** → **新建项目**
3. 选择 GitHub 仓库 `RanFeng/clipsketch-ai`
4. 构建设置：
   - **构建命令**: `npm install && npm run build`
   - **输出目录**: `dist`
   - **Node 版本**: 18 或更高

5. 环境变量：
   ```
   GEMINI_API_KEY=your_actual_key
   PROXY_URL=/api/proxy
   ```

6. **保存并部署**

### 9c. 部署 Serverless 代理函数

**方式一：使用 EdgeOne Workers（推荐）**

1. 复制 `functions/proxy.ts` 中的代码
2. 在 EdgeOne Console 的 **Workers** 中创建新脚本
3. 粘贴代码并部署
4. 配置路由：`/api/proxy -> proxy_worker`

**方式二：手动创建 Worker 脚本**

如果 EdgeOne 支持，创建一个路由规则：
```
Path: /api/proxy
Handler: Serverless Function
Logic: [proxy.ts 中的代码]
```

---

## 第十步：验证生产部署

等待 EdgeOne 部署完成（通常 2-5 分钟）

### 检查 1：页面加载
- 打开部署的 URL
- 按 F12 打开 DevTools → Console 标签
- 应该看不到任何红色错误

### 检查 2：静态资源
- 在 DevTools → Network 标签
- 刷新页面
- 检查所有 `.js` 和 `.css` 文件都返回 200
- 不应该有 404

### 检查 3：Tailwind 样式
- 检查背景色、文字色等是否正确应用
- 检查响应式设计是否工作

### 检查 4：API 代理
- 在页面中粘贴一个 Bilibili 链接，尝试导入
- 在 DevTools Network 中，应该看到 `/api/proxy?url=...` 的请求
- 检查请求返回 200，而非 403

### 检查 5：Gemini API
- 标记一些视频帧
- 点击"AI 绘图"
- 输入 Gemini API Key
- 应该能成功生成故事板

---

## 故障排除

### 症状 1：仍然显示 404 错误

**原因**：可能是部署未完成或缓存
```bash
# 检查
- 在 EdgeOne Console 确认部署状态为 "成功"
- 清空浏览器缓存（Ctrl+Shift+Delete）
- 用无痕窗口打开
```

### 症状 2：Tailwind 样式未应用

**原因**：CSS 未被构建或导入
```bash
# 本地检查
ls -la dist/ | grep index.*css

# 应该看到类似 index-abc123.css 的文件
```

**修复**：
```bash
# 确保 index.tsx 的第一行有 import './index.css';
head -3 index.tsx

# 确保 postcss.config.cjs 正确
cat postcss.config.cjs
```

### 症状 3：代理返回 403

**原因**：代理函数未正确部署或配置
```bash
# 本地测试代理逻辑
curl "http://localhost:3000/api/proxy?url=https://bilibili.com"

# 应该返回 HTML 内容，而非 403
```

**修复**：
- 确认 `functions/proxy.ts` 已部署到 EdgeOne
- 检查 EdgeOne 中的路由规则是否指向代理函数
- 验证 allowedDomains 列表中包含目标域名

### 症状 4：Gemini API 返回 403

**原因**：API Key 无效或权限不足
```bash
# 在浏览器 Console 测试
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] })
});
```

**修复**：
- 从 [aistudio.google.com](https://aistudio.google.com/app/apikey) 获取新 API Key
- 确保 API 已启用 `gemini-2.0-pro` 和 `gemini-2.0-flash-exp` 模型
- 检查项目的 API 配额

---

## 最终检查清单

- [ ] 依赖已安装：`npm list tailwindcss`
- [ ] 本地构建成功：`npm run build` 无错误
- [ ] 本地预览正常：`npm run preview` 可访问，无样式问题
- [ ] Git 已推送：`git log -1 --oneline` 显示修复提交
- [ ] EdgeOne 部署完成：Console 显示 "部署成功"
- [ ] 生产页面无 404：Network 标签显示所有资源 200
- [ ] Tailwind 样式应用正确：背景、字体颜色等正确
- [ ] 代理函数正常：`/api/proxy?url=...` 返回内容
- [ ] 可以导入视频：复制链接，导入成功
- [ ] AI 功能可用：生成故事板无错误

---

## 如有问题

1. 检查 EdgeOne Console 的部署日志
2. 查看浏览器 DevTools Console 的错误信息
3. 检查 `.env.local` 中的 API Key 是否正确
4. 从 GitHub 最新代码重新部署（有时需要清空缓存）

祝你部署顺利！
