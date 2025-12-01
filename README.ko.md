# ClipSketch AI

<div align="center">

![ClipSketch AI Logo](img/clipsketch-ai.png)

**동영상의 순간을 손그림 스토리로 변환**  
*Turn Video Moments into Hand-Drawn Stories*

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/Powered%20by-Gemini%20Pro-8E75B2?logo=google-gemini)](https://ai.google.dev/)

[English](README.en.md) | [中文](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[기능] • [빠른 시작] • [사용 가이드] • [기술 스택]

</div>

## 📖 프로젝트 소개

**ClipSketch AI**는 동영상 크리에이터, 소셜 미디어 운영자, 2차 창작 애호가를 위해 설계된 올인원 생산성 도구입니다.

단순한 동영상 플레이어가 아니라, **AI 기반 콘텐츠 제작 워크벤치**입니다. Bilibili와 Xiaohongshu의 동영상 링크를 파싱하여 프레임 단위로 정밀하게 하이라이트 순간을 태그할 수 있습니다. Google Gemini의 최신 멀티모달 모델을 통합하여, 이러한 순간들을 클릭 한 번으로 정교한 손그림 스타일의 스토리보드로 변환하고, 소셜 미디어에 최적화된 바이럴 문구를 자동으로 작성해 줍니다.

## 🖥️ 인터페이스 미리보기

<div align="center">
  <img src="img/preview.png" width="100%" alt="인터페이스 미리보기" />
</div>

## ✨ 핵심 기능

![워크플로우](img/work.png)

### 🎥 강력한 동영상 캡처
*   **멀티 소스 가져오기**: **Bilibili** 및 **Xiaohongshu** 공유 링크 파싱 지원 (단축 링크 및 텍스트 혼합 지원).
*   **HD 재생**: 세로형 동영상(9:16) 및 와이드스크린 동영상에 최적화된 반응형 레이아웃.
*   **정밀 제어**: 키보드 단축키 지원 (스페이스바 재생/일시정지, 방향키 프레임별/스마트 스텝 조절).

### 🏷️ 프레임 태깅 시스템
*   **밀리초 단위 기록**: 모든 흥미로운 순간을 정확하게 포착.
*   **단축키 태깅**: `T` 키를 눌러 빠르게 태그.
*   **데이터 내보내기**: 타임라인 태그를 TXT 형식으로 내보내거나, 태그된 프레임을 ZIP 이미지 팩으로 내보내기 지원.

### 🎨 AI 아트 스튜디오 (Powered by Gemini)
*   **스마트 드로잉**: `gemini-3-pro-image-preview` 모델을 사용하여 여러 태그 프레임을 일관성 있고 귀여운 손그림 스타일의 스토리보드로 통합.
*   **소셜 카피 생성**: 시각적 콘텐츠를 기반으로 `gemini-3-pro-preview`를 활용하여 **3가지 다른 스타일**의 추천 문구 자동 생성 (감성 스토리형, 유용한 튜토리얼형, 임팩트형).
*   **캐릭터 통합**: 사용자 지정 캐릭터/아바타를 업로드하면 AI가 스토리보드 장면에 자연스럽게 통합합니다.
*   **커버 생성**: 선택한 문구와 원본 영상을 기반으로 고품질 세로형 동영상 커버 생성.
*   **일괄 정밀 수정**: 분할 패널 일괄 생성 및 최적화 지원 (비용 절감을 위한 Batch API 구성 가능).

### 📱 멀티 플랫폼 지원
*   **반응형 디자인**: PC 와이드스크린, iPad 태블릿 및 모바일 세로 화면 조작에 완벽 대응.
*   **모바일 최적화**: 모바일에서는 자동으로 상하 레이아웃으로 전환되어 조작이 더욱 편리합니다.

## 🚀 빠른 시작

### 필수 조건
*   Node.js (v18 이상)
*   유효한 [Google Gemini API Key](https://aistudiocdn.google.com/)

### 설치 및 실행

1.  **리포지토리 클론**
    ```bash
    git clone https://github.com/RanFeng/clipsketch-ai.git
    cd clipsketch-ai
    ```

2.  **의존성 설치**
    ```bash
    npm install
    ```

3.  **환경 변수 설정**
    루트 디렉토리에 `.env.local` 파일을 생성하고 API Key를 입력하세요:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **개발 서버 시작**
    ```bash
    npm run dev
    ```

5.  **앱 접속**
    브라우저를 열고 `http://localhost:3000`으로 접속하세요.

## 📚 사용 가이드

1.  **동영상 가져오기**:
    *   Bilibili 또는 Xiaohongshu의 공유 링크를 복사합니다.
    *   홈 화면의 입력 상자에 붙여넣고 "동영상 가져오기"를 클릭합니다.
2.  **소재 태깅**:
    *   `스페이스바`로 재생 제어, `←` / `→` 로 진행 조절.
    *   멋진 장면을 발견하면 **Tag** 버튼을 클릭하거나 `T` 키를 누릅니다.
3.  **AI 스튜디오 진입**:
    *   태깅 완료 후, 우측 목록 하단의 **"다음: AI 드로잉"**을 클릭합니다.
4.  **콘텐츠 제작**:
    *   우측 상단에 **Gemini API Key**를 붙여넣습니다 (환경 변수 미설정 시).
    *   **크리에이티브 분석**: AI가 동영상 단계를 분석합니다.
    *   **화면 생성**: 손그림 스토리보드를 생성하고, 선택적으로 사용자 지정 캐릭터를 통합합니다.
    *   **패널 정밀 수정**: 각 패널을 고해상도로 다시 그립니다 (일괄 모드 지원).
    *   **카피 및 커버**: 소셜 미디어용 문구를 생성하고 어울리는 커버를 제작합니다.
5.  **내보내기 및 공유**:
    *   생성된 스토리보드 이미지, 커버 또는 모든 자산을 다운로드합니다.
    *   마음에 드는 문구를 한 번의 클릭으로 복사합니다.

## 🛠️ 기술 스택

*   **핵심 프레임워크**: React 19, TypeScript
*   **스타일링**: Tailwind CSS
*   **아이콘**: Lucide React
*   **AI SDK**: Google GenAI SDK (`@google/genai`)
*   **유틸리티**: JSZip (압축 다운로드), Canvas API (스크린샷)
*   **저장소**: IndexedDB (로컬 상태 영구 저장)

## ⚠️ 주의 사항

*   **API 권한**: AI 드로잉 기능을 사용하려면 API Key에 `gemini-3-pro-image-preview` 모델 접근 권한이 있어야 합니다. 403 오류가 발생하면 Google Cloud 프로젝트 설정을 확인하세요.
*   **크로스 오리진**: 외부 동영상 재생 및 스크린샷 지원을 위해 특정 프록시 전략과 `referrerPolicy="no-referrer"`를 사용합니다.

## 📄 라이선스

[MIT License](LICENSE) © 2024 ClipSketch AI
