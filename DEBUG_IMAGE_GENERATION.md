# 图像生成错误诊断指南

## 问题症状
- 生成手绘分镜时报 500 或 400 错误
- 错误日志显示 `completions:1 Failed to load resource: the server responded with a status of 500`
- 或显示 `gemini-2.5-flash:generateContent:1 Failed to load resource: the server responded with a status of 400`

## 常见原因

### 1. Provider 配置错误 ❌ 最常见
**问题**：provider 设置为 'google'，但 API Key 或配置不正确

**检查步骤**：
1. 打开浏览器开发者工具 (F12) → Application → Local Storage
2. 查找 `llm_provider` 的值 
3. 如果是 'google'：需要有效的 Google Gemini API Key（`gemini_api_key`）
4. 如果是 'siliconflow'：需要有效的 SiliconFlow API Key（`siliconflow_api_key`）

### 2. SiliconFlow 模型错误 ❌ 最近修复的
**问题**：SiliconFlow 的图像生成模型名称错误

**当前正确配置**（已修复）：
```typescript
// services/gemini.ts 第 42-43 行
if (task === 'image') {
    return 'black-forest-labs/FLUX.1-schnell';  // ✅ 正确
    // 也可以用: 'Pro/black-forest-labs/FLUX.1-schnell'
}
```

**旧的错误配置**（已修复）：
```typescript
return 'FLUX.1-dev';  // ❌ 错误
```

### 3. Google Gemini 模型错误
**问题**：用错了文本模型来生图

**当前正确配置**：
```typescript
// services/gemini.ts 第 53 行
return task === 'image' ? 'gemini-2.0-flash' : 'gemini-2.5-flash';
```

- `gemini-2.0-flash` → 用于**图像生成** ✅
- `gemini-2.5-flash` → 用于**文本生成** ✅

### 4. API Key 无效或过期
- 检查 localStorage 中的 API Key 是否有效
- 访问对应服务的官网测试 Key

## 调试步骤

### 步骤 1: 在浏览器控制台查看配置
```javascript
// 打开 DevTools (F12) → Console，运行：
console.log('provider:', localStorage.getItem('llm_provider'));
console.log('apiKey:', localStorage.getItem('gemini_api_key'));
console.log('baseUrl:', localStorage.getItem('gemini_base_url'));
console.log('siliconflow_key:', localStorage.getItem('siliconflow_api_key'));
```

### 步骤 2: 检查网络请求
1. DevTools → Network 选项卡
2. 重新尝试生成图像
3. 查看失败的请求（红色）：
   - 如果是 `completions`：SiliconFlow 相关
   - 如果是 `generativelanguage.googleapis.com`：Google 相关
4. 点击该请求查看错误信息和响应体

### 步骤 3: 测试 API Key
- **Google Gemini**：访问 [Google AI Studio](https://aistudio.google.com)
- **SiliconFlow**：访问 [SiliconFlow 文档](https://docs.siliconflow.cn/)
- **OpenAI**：访问 [OpenAI 平台](https://platform.openai.com)

## 推荐配置

### 使用 SiliconFlow（推荐用于图像生成）
1. 在界面设置中：
   - Provider: `siliconflow`
   - API Key: 你的 SiliconFlow API Key
   - Base URL: `https://api.siliconflow.cn/v1`（默认，可不填）

2. 会自动使用：
   - 文本生成：`moonshotai/Kimi-K2-Thinking`
   - 图像生成：`black-forest-labs/FLUX.1-schnell`

### 使用 Google Gemini
1. 在界面设置中：
   - Provider: `google`
   - API Key: 你的 Google Gemini API Key
   - Base URL: 不需要填写

2. 会自动使用：
   - 文本生成：`gemini-2.5-flash`
   - 图像生成：`gemini-2.0-flash`

## 500 错误解决方案
```
Server responded with a status of 500 (Internal Server Error)
```
原因通常是：
1. API Key 无效或超额
2. 模型名称错误
3. 请求体格式错误

**修复步骤**：
1. ✅ 确认 SiliconFlow 配置使用 `black-forest-labs/FLUX.1-schnell`（已修复）
2. ✅ 检查 API Key 是否有效和额度充足
3. 如果继续出现，查看 Network → Response 了解具体错误信息

## 400 错误解决方案
```
Bad Request (HTTP 400)
```
原因通常是：
1. API Key 格式错误
2. 请求参数格式错误
3. 使用了不支持的模型

**修复步骤**：
1. ✅ 确认用的是 `gemini-2.0-flash` 而不是 `gemini-2.5-flash` 进行图像生成
2. 检查 API Key 是否包含额外空格或特殊字符
3. 查看 Network → Response 了解 Google 返回的具体错误

## 最近修改
- ✅ 2024-01-04: 修复 SiliconFlow 模型从 `FLUX.1-dev` 改为 `black-forest-labs/FLUX.1-schnell`
- ✅ 详见 Git commit: `Fix SiliconFlow image generation model to black-forest-labs/FLUX.1-schnell`

## 需要帮助？
1. 查看浏览器 Network 选项卡的错误响应体
2. 检查本文档中的对应错误码
3. 确认 API Key 和 Provider 配置正确
