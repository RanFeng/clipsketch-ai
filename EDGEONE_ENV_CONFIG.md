# EdgeOne 环境变量配置指南

## 概述

在 EdgeOne Pages 上部署时，可以通过环境变量配置来指定不同的 AI 服务提供商。

## 环境变量配置

### 在 EdgeOne 控制台设置环境变量

1. 登录 EdgeOne 控制台
2. 进入你的 Pages 项目
3. 找到 **环境变量** 或 **构建设置** 部分
4. 添加以下环境变量：

### Google Gemini 配置

```
REACT_APP_PROVIDER_TYPE=google
REACT_APP_AI_GATEWAY_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
GEMINI_API_KEY=your_gemini_api_key
```

### OpenAI 配置

```
REACT_APP_PROVIDER_TYPE=openai
REACT_APP_AI_GATEWAY_URL=https://api.openai.com/v1
OPENAI_API_KEY=your_openai_api_key
```

### SiliconFlow 配置（推荐）

```
REACT_APP_PROVIDER_TYPE=siliconflow
REACT_APP_AI_GATEWAY_URL=https://api.siliconflow.cn/v1
SILICONFLOW_API_KEY=your_siliconflow_api_key
```

## SiliconFlow 模型配置

当使用 SiliconFlow 时，应用默认使用以下模型：

- **文本生成**: `moonshotai/Kimi-K2-Thinking` (高级推理，262K 上下文)
- **图像生成**: `FLUX.1-dev`

### 可选模型

#### 文本模型
- `moonshotai/Kimi-K2-Instruct` - 快速推理，无思考过程
- `Qwen/Qwen3-Omni-30B-A3B-Instruct` - 多模态模型
- `Qwen/Qwen3-Omni-30B-A3B-Thinking` - 多模态 + 推理
- `Qwen/Qwen2.5-72B-Instruct` - 高性能文本模型

#### 图像模型
- `FLUX.1-pro` - 高级图像生成
- `FLUX.1-realism` - 写实风格

## 本地开发配置

在 `.env.local` 文件中添加：

```env
# 选择提供商
REACT_APP_PROVIDER_TYPE=siliconflow

# API Key
SILICONFLOW_API_KEY=your_siliconflow_api_key

# 可选：自定义基础 URL
REACT_APP_AI_GATEWAY_URL=https://api.siliconflow.cn/v1

# 代理 URL（用于 CORS）
PROXY_URL=/api/proxy
```

## 部署步骤

1. **创建 .env.local**（基于 .env.example）
2. **设置环境变量**
   - 在 EdgeOne 控制台设置环境变量
   - 或在本地 .env.local 中配置
3. **构建**
   ```bash
   npm run build
   ```
4. **部署**
   - 提交到 GitHub
   - EdgeOne 自动部署

## 环境变量优先级

应用读取环境变量的优先级（从高到低）：

1. EdgeOne 环境变量
2. .env.local 本地变量
3. .env.example 默认值

## 成本对比

### SiliconFlow (推荐)

| 模型 | 输入成本 | 输出成本 | 上下文 |
|------|--------|--------|-------|
| Kimi-K2-Thinking | $0.55/M | $3/M | 262K |
| FLUX.1-dev | - | $0.08/张 | - |

### Google Gemini

| 模型 | 输入成本 | 输出成本 |
|------|--------|--------|
| gemini-2.5-flash | $0.075/M | $0.3/M |

### OpenAI

| 模型 | 输入成本 | 输出成本 |
|------|--------|--------|
| GPT-4o | $5/M | $15/M |
| DALL-E 3 | - | $0.08/张 |

## 故障排查

### 连接失败

1. 确认 API Key 正确
2. 检查 API Gateway URL 是否可访问
3. 确认 IP 不被限制（如有地区限制）

### 模型不可用

- 检查 SiliconFlow 账户是否有该模型的权限
- 验证模型名称是否正确
- 查看 SiliconFlow 官方文档确认模型可用性

### 图像生成失败

- FLUX.1-dev 返回 URL，需要前端转换为 base64
- 检查 SiliconFlow 配额是否充足
- 验证提示词长度 (最多 4000 字符)

## 相关文档

- [SiliconFlow API 文档](https://docs.siliconflow.cn/)
- [EdgeOne Pages 文档](https://edgeone.cloud.tencent.com/pages)
- [应用本地 .env.example](./. env.example)
