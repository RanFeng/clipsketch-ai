
import { BookHeart, Instagram, LucideIcon, Globe } from 'lucide-react';

export interface SocialPlatformStrategy {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  primaryColorClass: string; // e.g., 'text-pink-500'
  defaultImagePrompt: string; // Default prompt for the strategy
  
  // Prompt Generation Methods
  getStepAnalysisInstruction(): string;
  getBaseImagePrompt(contextDescription: string, customPrompt: string, isOpenAI: boolean): string;
  getCaptionPrompt(videoTitle: string, contextDescription: string, avatarPresent: boolean): string;
  getCoverPrompt(
    contextDescription: string, 
    titleText: string, 
    captionContent: string,
    watermarkText: string,
    avatarPresent: boolean, 
    isOpenAI: boolean
  ): string;
}

class XiaohongshuStrategy implements SocialPlatformStrategy {
  id = 'xhs';
  name = '小红书';
  description = '面向中国用户。生成中文文案、种草风格、Emoji 和中文步骤说明。';
  icon = BookHeart;
  primaryColorClass = 'text-pink-500';
  defaultImagePrompt = `将这些图片转换为可爱的、手绘风格的插图，以描绘整个过程。要有明显的手绘风格，主体的形状和颜色不应有太大变化，要真实反映原图像本身的特性。每一步的插图应尽可能独立且完整，并且小图片之间应有足够的间距。为每个步骤编号，并用简短描述。除了步骤描述外，不要添加任何不必要的文字。每一步的插图和整体插图都要以纯白色为背景`;

  getStepAnalysisInstruction(): string {
    return "Provide a concise description in **Simplified Chinese** (中文).";
  }

  getBaseImagePrompt(contextDescription: string, customPrompt: string, isOpenAI: boolean): string {
    let prompt = customPrompt;
    if (contextDescription) {
      prompt += `\n\nContext/Story Background: ${contextDescription}`;
    }
    prompt += "\nUse a style popular on Xiaohongshu (Cute, vibrant, clear strokes). Text in image (if any) must be Chinese.";
    if (isOpenAI) {
      prompt += "\n\n(Note: Generate a storyboard grid combining these elements.)";
    }
    return prompt;
  }

  getCaptionPrompt(videoTitle: string, contextDescription: string, avatarPresent: boolean): string {
    return `根据给定的图像（包含多个步骤的手绘教程），生成 3 个不同风格的 **小红书 (Xiaohongshu)** 爆款文案。
        
    原始视频标题：${videoTitle || '未知'}
    原始视频内容：${contextDescription || '无描述'}

    语言要求：**中文 (Simplified Chinese)**。
    
    风格要求：
    1. 风格1：情感共鸣/故事型（温馨、治愈，如“家人们谁懂啊...”）。
    2. 风格2：干货教程型（清晰、步骤感强，带序号）。
    3. 风格3：短小精悍/种草型（大量Emoji，吸引眼球，如“绝绝子”）。
    
    必须包含：
    - 适合小红书的 Emoji。
    - 适合小红书的话题标签 (Hashtags)，例如 #手绘 #教程 #治愈。
    ${avatarPresent ? "- 画面中加入了可爱的角色，文案中必须提及这位“特邀嘉宾”，增加互动感。" : ""}
    `;
  }

  getCoverPrompt(
    contextDescription: string, 
    titleText: string, 
    captionContent: string,
    watermarkText: string,
    avatarPresent: boolean, 
    isOpenAI: boolean
  ): string {
    return `Create a high-quality vertical (9:16) video cover image for Xiaohongshu (Little Red Book).
    
    **Input Context**:
    - Story Background: "${contextDescription}"
    - Chosen Caption Content (Reference for mood): "${captionContent.substring(0, 100)}..."
    - Reference Images provided: The first few are frames from the start of the video, the last few are from the end. ${avatarPresent ? "One image is a character reference." : ""}
    
    **Goal**: Create a composite, high-aesthetic cover that summarizes the video's journey.
    
    **Style Requirements**:
    - **REALISTIC & AUTHENTIC**: Do NOT use the sketch/doodle style from previous steps. Use the provided original frames as a strong reference for realism.
    - **Visual Effects**: Add subtle dreamy filters, warm lighting, sparkles, or "bling" effects popular on Xiaohongshu.
    - **Composition**: Center the main subject. Ensure it looks like a high-end lifestyle photo or movie poster.
    ${avatarPresent ? "- **Character Integration**: You MUST integrate the character from the provided reference image into the scene naturally and prominently. The character should look like they belong in the real environment." : ""}
    
    **Typography & Text**:
    - **Main Title**: Render the text "${titleText}" clearly in the image. Use a bold, modern, or cute font style suitable for Chinese social media. Ensure the text is highly legible, eye-catching, and centrally placed or at the top.
    ${watermarkText ? `- **Watermark**: Add the text "${watermarkText}" subtly in a corner or near the subject, blending naturally.` : ""}
    
    **Vibe**: Cozy, aesthetic, viral, "种草" (appealing).`;
  }
}

class InstagramStrategy implements SocialPlatformStrategy {
  id = 'instagram';
  name = 'Instagram';
  description = '面向英美用户。生成英文文案、Aesthetic 风格、Hashtags 和英文步骤说明。';
  icon = Instagram;
  primaryColorClass = 'text-purple-500';
  defaultImagePrompt = `Convert these images into cute, hand-drawn style illustrations to depict the process. Maintain a distinct hand-drawn style while keeping the subject's shape and color true to the original. Each step's illustration should be independent and complete, with sufficient spacing between them. Number each step with a short description. Do not add unnecessary text. Use a pure white background.`;

  getStepAnalysisInstruction(): string {
    return "Provide a concise, native **English** description.";
  }

  getBaseImagePrompt(contextDescription: string, customPrompt: string, isOpenAI: boolean): string {
    let prompt = customPrompt;
    if (contextDescription) {
      prompt += `\n\nContext/Story Background: ${contextDescription}`;
    }
    prompt += "\nUse a style popular on Instagram (Aesthetic, clean, doodle style). Text in image (if any) must be English.";
    if (isOpenAI) {
      prompt += "\n\n(Note: Generate a storyboard grid combining these elements.)";
    }
    return prompt;
  }

  getCaptionPrompt(videoTitle: string, contextDescription: string, avatarPresent: boolean): string {
    return `Based on the provided images (a step-by-step hand-drawn tutorial), generate 3 distinct **Instagram** caption options.
    Original Video Title: ${videoTitle || 'Unknown'}
    Original Video Content: ${contextDescription || 'No description'}
    Language: **English**.
    Styles: 1. Emotional 2. Instructional 3. Punchy.
    Include Emojis and Hashtags.
    ${avatarPresent ? "Mention the character in the image." : ""}
    `;
  }

  getCoverPrompt(
    contextDescription: string, 
    titleText: string, 
    captionContent: string,
    watermarkText: string,
    avatarPresent: boolean, 
    isOpenAI: boolean
  ): string {
    return `Create a high-quality vertical (9:16) Reel cover image for Instagram.
    
    **Input Context**:
    - Story Background: "${contextDescription}"
    - Chosen Caption Content: "${captionContent.substring(0, 100)}..."
    - Reference Images provided: Original frames (Start/End) ${avatarPresent ? "and a character reference" : ""}.
    
    **Goal**: Create a cinematic or aesthetic cover image.
    
    **Style Requirements**:
    - **REALISTIC & CINEMATIC**: Do NOT use the sketch style. Use the original frames as a basis for a realistic, high-fidelity look.
    - **Aesthetic**: Minimalist, clean, high-contrast, or moody lighting (depending on context).
    ${avatarPresent ? "- **Character**: Integrate the provided character reference into the scene realistically." : ""}
    
    **Typography**:
    - **Main Title**: Render the text "${titleText}" in a stylish, modern English font (Serif or Sans-Serif). Make it look like a magazine cover.
    ${watermarkText ? `- **Watermark**: Include "${watermarkText}" in small, elegant text.` : ""}
    
    **Vibe**: Curated, professional, influential, "Aesthetic".
    - Ensure the text doesn't overlap with critical visual elements.`;
  }
}

// Registry
export const strategies: SocialPlatformStrategy[] = [
  new XiaohongshuStrategy(),
  new InstagramStrategy()
];

export function getStrategy(id: string): SocialPlatformStrategy {
  const strategy = strategies.find(s => s.id === id);
  if (!strategy) throw new Error(`Strategy ${id} not found`);
  return strategy;
}
