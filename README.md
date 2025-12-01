# ClipSketch AI (剪辑·素描)

<div align="center">

![ClipSketch AI Logo](img/clipsketch-ai.png)

**将视频瞬间转化为手绘故事**  
*Turn Video Moments into Hand-Drawn Stories*

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/Powered%20by-Gemini%20Pro-8E75B2?logo=google-gemini)](https://ai.google.dev/)

[English](README.en.md) | [中文](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[功能特性] • [快速开始] • [使用指南] • [技术栈]

</div>

## 📖 项目简介

**ClipSketch AI** 是一个专为视频创作者、社交媒体运营者和二创爱好者设计的全流程生产力工具。

它不仅仅是一个视频播放器，更是一个**AI 驱动的内容创作工作台**。它可以解析 Bilibili 和小红书的视频链接，让你能够帧级精准地标记精彩瞬间。通过集成 Google Gemini 最新的多模态大模型，它能将这些瞬间一键转化为精美的手绘风格故事板，并自动撰写适配社交媒体（如小红书）的爆款文案。

## 🖥️ 界面展示

<div align="center">
  <img src="img/preview.png" width="100%" alt="界面展示" />
</div>

## ✨ 核心功能

![工作流程](img/work.png)

### 🎥 强大的视频采集
*   **多源导入**：支持解析 **Bilibili** 和 **小红书** 的分享链接（支持短链接和混合文案）。
*   **高清播放**：针对竖屏视频（9:16）和宽屏视频进行了自适应布局优化。
*   **精准控制**：支持键盘快捷键（空格播放/暂停，左右键逐帧/智能步长调节）。

### 🏷️ 帧级标记系统
*   **毫秒级记录**：精确捕捉每一个精彩瞬间。
*   **快捷键打点**：按下 `T` 键即可快速标记。
*   **数据导出**：支持导出 TXT 格式的时间轴标签，或将标记帧打包导出为 ZIP 图片包。

### 🎨 AI 艺术工作室 (Powered by Gemini)
*   **智能绘图**：利用 `gemini-3-pro-image-preview` 模型，将多个标记帧整合成一张连贯的、可爱手绘风格的故事板（Storyboard）。
*   **社交文案生成**：基于视觉内容，利用 `gemini-3-pro-preview` 自动生成 **3种不同风格** 的种草文案（情感故事型、干货教程型、短小精悍型）。
*   **角色融合**：上传自定义角色/头像，AI 自动将其融入到故事板场景中。
*   **封面生成**：基于精选文案和原始画面，生成高品质的竖屏视频封面。
*   **批量精修**：支持批量生成和优化分镜（可配置使用 Batch API 以节省成本）。

### 📱 全平台适配
*   **响应式设计**：完美适配 PC 宽屏、iPad 平板及手机竖屏操作。
*   **移动端优化**：在手机上自动切换为上下布局，操作更顺手。

## 🚀 快速开始

### 前置要求
*   Node.js (v18+)
*   一个有效的 [Google Gemini API Key](https://aistudiocdn.google.com/)

### 安装与运行

1.  **克隆项目**
    ```bash
    git clone https://github.com/RanFeng/clipsketch-ai.git
    cd clipsketch-ai
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置环境变量**
    在根目录创建 `.env.local` 文件并填入您的 API Key：
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **启动开发服务器**
    ```bash
    npm run dev
    ```

5.  **访问应用**
    打开浏览器访问 `http://localhost:3000`。

## 📚 使用指南

1.  **导入视频**：
    *   复制 Bilibili 或 小红书 的分享链接（包含文字也没关系）。
    *   粘贴到首页输入框，点击“导入视频”。
2.  **标记素材**：
    *   使用 `空格` 控制播放，`←` / `→` 调整进度。
    *   看到精彩画面时，点击 **Tag** 按钮或按键盘 `T` 键。
3.  **进入 AI 工作室**：
    *   标记完成后，点击右侧列表底部的 **“下一步：AI 绘图”**。
4.  **创作内容**：
    *   在右上角粘贴您的 **Gemini API Key** (如果未配置环境变量)。
    *   **创意分析**：AI 分析视频步骤。
    *   **画面生成**：生成手绘故事板，可选融合自定义角色。
    *   **分镜精修**：对每一格画面进行高清重绘（支持批量模式）。
    *   **文案与封面**：生成社交媒体文案，并制作配套封面。
5.  **导出与分享**：
    *   下载生成的故事板图片、封面或打包所有素材。
    *   一键复制您喜欢的文案。

## 🛠️ 技术栈

*   **核心框架**: React 19, TypeScript
*   **样式方案**: Tailwind CSS
*   **图标库**: Lucide React
*   **AI SDK**: Google GenAI SDK (`@google/genai`)
*   **工具库**: JSZip (打包下载), Canvas API (截图)
*   **数据存储**: IndexedDB (本地状态持久化)

## ⚠️ 注意事项

*   **API 权限**: 使用 AI 绘图功能需要您的 API Key 有权访问 `gemini-3-pro-image-preview` 模型。如果遇到 403 错误，请检查您的 Google Cloud 项目设置。
*   **跨域播放**: 为了支持外部视频链接播放和截图，本项目使用了特定的代理策略和 `referrerPolicy="no-referrer"`。

## 📄 许可证

[MIT License](LICENSE) © 2024 ClipSketch AI
