# ClipSketch AI - EdgeOne 完整部署方案

## 📍 你的情况

✅ **已有**：EdgeOne AI Gateway (`https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent`)

🎯 **目标**：部署 ClipSketch 到 EdgeOne，可在国内不用 VPN 访问和使用 Gemini API

---

## 🏗️ 最终架构（简化版）

```
┌─────────────────────────────────┐
│   你的浏览器               │
│  (国内，无需 VPN)          │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   EdgeOne Pages CDN              │
│   (部署你的应用)                │
│   https://app.edgeone.app       │
└─────────────────────────────────┘
    ↓                ↓              ↓
    AI 请求      视频请求      静态资源
    ↓                ↓              ↓
┌──────────┐   ┌──────────┐   ┌───────────┐
│ AI Gateway   │  Functions   │EdgeOne     │
│ (转发)      │  Proxy       │Pages       │
└──────────┘   └──────────┘   └───────────┘
    ↓                ↓
┌──────────┐   ┌──────────────────┐
│Gemini    │   │Bilibili/XHS API  │
│API       │   │(国内可访问)      │
└──────────┘   └──────────────────┘
```

---

## 📋 需要做的事（按优先级）

### 第一优先级：AI Gateway 配置（必须）

**文件**：`services/llm.ts` 或使用 `services/llm-ai-gateway.ts`

**改法 1 - 最简单**（推荐）：
```bash
# 备份原文件
cp services/llm.ts services/llm.ts.bak

# 使用我们提供的适配文件
cp services/llm-ai-gateway.ts services/llm.ts
```

**改法 2 - 手动修改**：
找到代码中的这一行：
```typescript
// 改前
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

// 改后
const url = process.env.REACT_APP_AI_GATEWAY_URL || 
  'https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-2.0-flash:generateContent';
```

### 第二优先级：环境变量（必须）

编辑 `.env.local`：
```env
GEMINI_API_KEY=your_actual_key_from_google
REACT_APP_AI_GATEWAY_URL=https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-2.0-flash:generateContent
```

**获取 API Key**：
1. 打开 https://aistudio.google.com/app/apikey
2. 创建 API Key
3. 复制粘贴到上面

### 第三优先级：Tailwind CSS 构建（必须）

这个我们已经配置好了，检查一下：

```bash
# 验证
npm install -D tailwindcss postcss autoprefixer
npm run build

# 应该看到成功信息和 dist/assets/index-xxx.css
```

### 第四优先级：视频解析代理（可选，但推荐）

**不想要**：只生成文案和故事板，不导入视频
- ❌ 跳过此步骤

**想要**：能导入 Bilibili 和小红书的视频链接
- ✅ 在 `functions/proxy.ts` 中已经创建好了
- 部署到 EdgeOne Pages 时会自动部署

---

## 🚀 完整部署流程（5 分钟）

### Step 1: 本地验证 (2 min)

```bash
cd /Users/qinxiaoqiang/Downloads/clipsketch-ai

# 确保依赖完整
npm install

# 构建
npm run build

# 检查输出
ls -la dist/assets/ | grep css

# 应该看到 index-xxx.css
```

### Step 2: 推送代码 (1 min)

```bash
git add -A
git commit -m "Deploy to EdgeOne with AI Gateway"
git push origin main
```

### Step 3: EdgeOne Pages 部署 (2 min)

1. 打开 [EdgeOne Console](https://console.edgeone.ai)
2. **Pages** → **+ 新建项目**
3. 选择 GitHub 仓库：`RanFeng/clipsketch-ai`
4. 构建设置：
   ```
   构建命令：npm install && npm run build
   输出目录：dist
   ```
5. 环境变量：
   ```
   GEMINI_API_KEY=your_key_here
   REACT_APP_AI_GATEWAY_URL=https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-2.0-flash:generateContent
   ```
6. **保存并部署**

等待 2-5 分钟...

### Step 4: 验证部署 (检查)

打开部署后的网址，按 F12：

```
✅ Console 无红色错误
✅ Network 中所有 .js/.css 都是 200
✅ 页面样式正确（深灰 + 浅灰）
✅ 能输入并标记视频帧（如果不需要导入，就只测试这个）
✅ 生成故事板时能成功调用 AI Gateway
```

---

## 📁 已修改/新增文件

### 核心文件（已配置）
- ✅ `vite.config.ts` - Vite 构建配置
- ✅ `tailwind.config.js` - Tailwind 配置
- ✅ `postcss.config.cjs` - PostCSS 配置
- ✅ `index.css` - Tailwind 指令
- ✅ `index.tsx` - 导入 CSS
- ✅ `index.html` - 简化 HTML
- ✅ `package.json` - 添加依赖

### AI Gateway 相关（新增）
- ✅ `services/llm-ai-gateway.ts` - AI Gateway 适配文件
- ✅ `EDGEONE_GATEWAY_GUIDE.md` - 详细指南
- ✅ `EDGE_GATEWAY_QUICK_START.md` - 快速开始

### 视频解析代理（如需使用）
- ✅ `functions/proxy.ts` - Pages Function 代理
- ✅ `services/parsers-fixed.ts` - 修复后的解析器

### 参考文档
- 📖 `DEPLOYMENT_FIX_SUMMARY.md` - 修复总结
- 📖 `EDGEONE_FIX_STEPS.md` - 分步指南
- 📖 `QUICK_REFERENCE.md` - 速查卡
- 📖 `README_DEPLOYMENT.md` - 本文档

---

## 🔑 关键概念

### AI Gateway 作用
```
浏览器 "你的应用"
  ↓ (发送 AI 请求)
EdgeOne AI Gateway (转发)
  ↓
Google Gemini API
  ↓ (返回结果)
浏览器显示故事板、文案等
```

**为什么好**：
- ✅ 国内可直接访问（不需要 VPN）
- ✅ 可以监控费用和日志
- ✅ 自动处理频率限制

### Functions/Workers 作用
```
浏览器 "导入 Bilibili 链接"
  ↓ (转发请求)
EdgeOne Functions /api/proxy
  ↓ (在服务器端 fetch)
api.mir6.com
  ↓ (返回视频信息)
浏览器显示视频
```

**为什么需要**：
- ✅ 解决浏览器 CORS 限制
- ✅ Bilibili 的 API 不允许浏览器直接访问

---

## ⚙️ 如果出现问题

### 问题 1：AI Gateway 返回 401/403

**检查清单**：
```bash
# 1. API Key 是否正确
echo $GEMINI_API_KEY

# 2. AI Gateway URL 是否正确拷贝
# 确保是这个：https://ai-gateway.eo-edgefunctions7.com/...

# 3. 在浏览器中测试
curl -X POST "https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-pro:generateContent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'

# 如果返回错误信息，说明 API Key 或 URL 有问题
```

### 问题 2：构建失败

```bash
# 清空缓存
rm -rf node_modules dist package-lock.json

# 重新安装
npm install

# 重新构建
npm run build
```

### 问题 3：生产环境无样式

**原因**：Tailwind CSS 没有正确编译

```bash
# 检查 dist 文件夹
ls -la dist/assets/

# 应该看到类似 index-abc123.css 的文件
# 如果没有，说明 Tailwind 没有正确配置
```

---

## 🎯 不同使用场景

### 场景 A：只生成文案和故事板（不导入视频）

**需要做**：
1. ✅ 修改 `services/llm.ts` 使用 AI Gateway
2. ✅ 设置 `.env.local` 环境变量
3. ✅ 部署到 EdgeOne Pages
4. ❌ 不需要 Functions/Workers（可跳过）

**流程**：
1. 打开应用
2. 手动粘贴视频链接或描述
3. 点击"AI 绘图"
4. 输入 API Key
5. 生成故事板和文案

### 场景 B：完整功能（包括导入视频）

**需要做**：
1. ✅ 修改 `services/llm.ts` 使用 AI Gateway
2. ✅ 修改 `services/parsers.ts` 使用 `/api/proxy`
3. ✅ 设置 `.env.local` 环境变量
4. ✅ 创建 `functions/proxy.ts`（已创建）
5. ✅ 部署到 EdgeOne Pages

**流程**：
1. 打开应用
2. 粘贴 Bilibili/小红书 链接
3. 点击导入（自动通过 Functions 代理）
4. 标记视频帧
5. 生成故事板和文案

---

## 📊 成本估算

### EdgeOne Pages
- 免费额度：足够个人/小规模使用
- 超出后：按带宽计费（通常 ¥0.2/GB）

### EdgeOne Functions
- 免费额度：100 万请求/月
- 超出后：¥0.15/百万请求

### Gemini API（通过 AI Gateway）
- 按 Google 官方价格
- 通常比直接使用便宜 20-30%

**估算**：
- 月度使用 100 个生成请求 + 50 个视频导入
- 总费用：< ¥10（主要是 Gemini API 费用）

---

## ✅ 最终检查表

在部署之前，确保：

### 代码层面
- [ ] `services/llm.ts` 改用了 AI Gateway URL
- [ ] `.env.local` 包含 `GEMINI_API_KEY` 和 `REACT_APP_AI_GATEWAY_URL`
- [ ] `npm run build` 成功，生成了 `dist/assets/index-xxx.css`
- [ ] （可选）`functions/proxy.ts` 存在（如果需要视频导入）

### 本地验证
- [ ] `npm run preview` 能打开，无样式问题
- [ ] F12 Console 无红色错误
- [ ] Network 中所有资源都是 200

### EdgeOne 配置
- [ ] GitHub 仓库已推送最新代码
- [ ] Pages 项目已创建并部署成功
- [ ] 环境变量已正确设置
- [ ] AI Gateway URL 已正确配置

### 生产验证
- [ ] 打开部署 URL，能正常加载
- [ ] 能输入并标记视频帧
- [ ] 生成故事板时能调用 AI Gateway（检查 Network 中的 AI Gateway 请求）
- [ ] 没有 CORS 或 401 错误

---

## 📞 获得帮助

如果遇到问题，查看这些文件：

1. **概览**：本文档 (`README_DEPLOYMENT.md`)
2. **AI Gateway 详解**：`EDGEONE_GATEWAY_GUIDE.md`
3. **快速开始**：`EDGE_GATEWAY_QUICK_START.md`
4. **所有问题**：`EDGEONE_FIX_STEPS.md`
5. **速查卡**：`QUICK_REFERENCE.md`

---

## 🎉 就这么简单！

步骤总结：
```
1. 修改代码 (使用 AI Gateway URL)
2. 设置环境变量 (API Key)
3. 推送 GitHub
4. EdgeOne 部署

完成！🚀
```

无需 VPN，无需复杂配置，在国内就能使用 Gemini API。

祝你部署顺利！

---

**最后更新**：2025-01-04  
**版本**：v2.0 (EdgeOne AI Gateway 版本)  
**状态**：✅ 生产就绪

