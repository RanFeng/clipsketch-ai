# ClipSketch AI

<div align="center">

![ClipSketch AI Logo](img/clipsketch-ai.png)

**動画の瞬間を手描きの物語へ**  
*Turn Video Moments into Hand-Drawn Stories*

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/Powered%20by-Gemini%20Pro-8E75B2?logo=google-gemini)](https://ai.google.dev/)

[English](README.en.md) | [中文](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[機能] • [クイックスタート] • [ユーザーガイド] • [技術スタック]

</div>

## 📖 プロジェクト紹介

**ClipSketch AI** は、動画クリエイター、ソーシャルメディア運用者、二次創作愛好家のために設計された全工程対応の生産性向上ツールです。

単なる動画プレーヤーではなく、**AI駆動のコンテンツ制作ワークベンチ**です。BilibiliやXiaohongshu（小紅書）の動画リンクを解析し、フレーム単位で正確にハイライトシーンをタグ付けできます。Google Geminiの最新マルチモーダルモデルを統合し、これらの瞬間をワンクリックで美しい手描き風ストーリーボードに変換し、ソーシャルメディアに適したバズるキャプションを自動生成します。

## 🖥️ 画面プレビュー

<div align="center">
  <img src="img/preview.png" width="100%" alt="画面プレビュー" />
</div>

## ✨ 主な機能

![ワークフロー](img/work.png)

### 🎥 強力な動画キャプチャ
*   **マルチソースインポート**: **Bilibili** および **Xiaohongshu** の共有リンク解析に対応（短縮リンクやテキスト混在も可）。
*   **HD再生**: 縦型動画（9:16）およびワイドスクリーン動画向けに最適化されたアダプティブレイアウト。
*   **精密操作**: キーボードショートカット対応（スペースで再生/一時停止、矢印キーでコマ送り/スマートステップ調整）。

### 🏷️ フレームタグ付けシステム
*   **ミリ秒単位の記録**: すべての決定的な瞬間を正確に捉えます。
*   **ショートカット打刻**: `T` キーを押すだけで素早くタグ付け。
*   **データエクスポート**: タイムラインタグをTXT形式でエクスポート、またはタグ付けされたフレームをZIP画像パックとしてエクスポート可能。

### 🎨 AIアートスタジオ (Powered by Gemini)
*   **スマートドローイング**: `gemini-3-pro-image-preview` モデルを使用し、複数のタグ付けフレームを一貫した可愛い手描き風ストーリーボードに統合。
*   **ソーシャルコピー生成**: 視覚的内容に基づき、`gemini-3-pro-preview` を使用して **3つの異なるスタイル** の投稿文を自動生成（エモーショナルストーリー型、実用チュートリアル型、インパクト型）。
*   **キャラクター統合**: カスタムキャラクター/アバターをアップロードすると、AIが自動的にシーンに融合させます。
*   **カバー画像生成**: 選定したキャプションと元の映像に基づいて、高品質な縦型動画カバーを生成。
*   **一括リファイン**: 分割パネルの一括生成と最適化をサポート（コスト削減のためのBatch API設定が可能）。

### 📱 マルチプラットフォーム対応
*   **レスポンシブデザイン**: PCワイドスクリーン、iPadタブレット、スマホの縦画面操作に完全対応。
*   **モバイル最適化**: スマホでは自動的に上下レイアウトに切り替わり、操作性が向上。

## 🚀 クイックスタート

### 前提条件
*   Node.js (v18以上)
*   有効な [Google Gemini API Key](https://aistudiocdn.google.com/)

### インストールと実行

1.  **リポジトリのクローン**
    ```bash
    git clone https://github.com/RanFeng/clipsketch-ai.git
    cd clipsketch-ai
    ```

2.  **依存関係のインストール**
    ```bash
    npm install
    ```

3.  **環境変数の設定**
    ルートディレクトリに `.env.local` ファイルを作成し、APIキーを入力します：
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **開発サーバーの起動**
    ```bash
    npm run dev
    ```

5.  **アプリへのアクセス**
    ブラウザで `http://localhost:3000` を開きます。

## 📚 ユーザーガイド

1.  **動画のインポート**:
    *   Bilibili または Xiaohongshu の共有リンクをコピーします。
    *   ホーム画面の入力ボックスに貼り付け、「動画をインポート」をクリックします。
2.  **素材のタグ付け**:
    *   `スペース` で再生制御、`←` / `→` で進行調整。
    *   素晴らしいシーンを見つけたら、**Tag** ボタンをクリックするか `T` キーを押します。
3.  **AIスタジオへ**:
    *   タグ付け完了後、右側リスト下部の **「次へ：AI 作画」** をクリックします。
4.  **コンテンツ制作**:
    *   右上に **Gemini API Key** を貼り付けます（環境変数未設定の場合）。
    *   **クリエイティブ分析**: AIが動画のステップを分析。
    *   **画面生成**: 手描きストーリーボードを生成、カスタムキャラクターの融合も可能。
    *   **パネル精修**: 各コマを高解像度で再描画（一括モード対応）。
    *   **コピー＆カバー**: ソーシャルメディア用コピーと、それに合ったカバー画像を生成。
5.  **エクスポートと共有**:
    *   生成されたストーリーボード画像、カバー、または全素材をダウンロード。
    *   気に入ったキャプションをワンクリックでコピー。

## 🛠️ 技術スタック

*   **コアフレームワーク**: React 19, TypeScript
*   **スタイル**: Tailwind CSS
*   **アイコン**: Lucide React
*   **AI SDK**: Google GenAI SDK (`@google/genai`)
*   **ツール**: JSZip (圧縮ダウンロード), Canvas API (スクリーンショット)
*   **ストレージ**: IndexedDB (ローカル状態永続化)

## ⚠️ 注意事項

*   **API権限**: AI作画機能を使用するには、API Keyが `gemini-3-pro-image-preview` モデルにアクセスできる権限を持っている必要があります。403エラーが発生した場合は、Google Cloudプロジェクトの設定を確認してください。
*   **クロスオリジン**: 外部動画の再生とスクリーンショットに対応するため、特定のプロキシ戦略と `referrerPolicy="no-referrer"` を使用しています。

## 📄 ライセンス

[MIT License](LICENSE) © 2024 ClipSketch AI
