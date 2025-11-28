
import { BookHeart, Instagram, LucideIcon, Globe } from 'lucide-react';

export interface SocialPlatformStrategy {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  primaryColorClass: string; // e.g., 'text-pink-500'
  
  // Prompt Generation Methods
  getStepAnalysisInstruction(): string;
  getBaseImagePrompt(contextDescription: string, customPrompt: string, isOpenAI: boolean): string;
  getCaptionPrompt(videoTitle: string, contextDescription: string, avatarPresent: boolean): string;
}

class XiaohongshuStrategy implements SocialPlatformStrategy {
  id = 'xhs';
  name = '小红书';
  description = '面向中国用户。生成中文文案、种草风格、Emoji 和中文步骤说明。';
  icon = BookHeart;
  primaryColorClass = 'text-pink-500';

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
}

class InstagramStrategy implements SocialPlatformStrategy {
  id = 'instagram';
  name = 'Instagram';
  description = '面向英美用户。生成英文文案、Aesthetic 风格、Hashtags 和英文步骤说明。';
  icon = Instagram;
  primaryColorClass = 'text-purple-500';

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
