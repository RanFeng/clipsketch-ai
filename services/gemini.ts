
import { createLLMProvider, ProviderType, LLMMessage, LLMProvider } from './llm';
import { SocialPlatformStrategy } from './strategies';

// Types needed for the service
export interface FrameData {
  tagId?: string;
  timestamp?: number;
  data: string; // Base64 string
}

export interface CaptionOption {
  title: string;
  content: string;
  style?: string;
}

export interface SubPanel {
  index: number;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

// Deprecated type alias for backwards compatibility during migration if needed
export type TargetPlatform = string; 

export class GeminiService {
  
  private static getProvider(apiKey: string, baseUrl: string, type: ProviderType = 'google'): LLMProvider {
      if (!apiKey) throw new Error("请输入您的 API Key");
      return createLLMProvider(type, apiKey, baseUrl);
  }

  private static getModelName(type: ProviderType, task: 'text' | 'image'): string {
      if (type === 'openai') {
          return task === 'image' ? 'dall-e-3' : 'gpt-4o';
      }
      // Google
      return task === 'image' ? 'gemini-3-pro-image-preview' : 'gemini-3-pro-preview';
  }

  /**
   * Step 0: Analyze Video Frames to group steps
   */
  static async analyzeSteps(
    apiKey: string,
    baseUrl: string,
    frames: FrameData[],
    contextDescription: string,
    strategy: SocialPlatformStrategy,
    thinkingEnabled: boolean,
    providerType: ProviderType = 'google'
  ): Promise<string[]> {
    const provider = this.getProvider(apiKey, baseUrl, providerType);
    const model = this.getModelName(providerType, 'text');

    const languageInstruction = strategy.getStepAnalysisInstruction();

    const systemPrompt = `Analyze these video frames which represent a step-by-step tutorial or story.
    Context from original video: "${contextDescription}"
    Group consecutive frames that represent the SAME step or action.
    ${languageInstruction}
    
    Requirements:
    1. Return STRICTLY a JSON array of objects.
    2. Format: {"steps": [{"indices": [0, 1], "description": "Text..."}, {"indices": [2], "description": "Text..."}]}
    3. "indices" is an array of 0-based frame indices.
    4. "description" is the text in the requested language.
    5. Ensure all frames are covered.`;

    const userContent: any[] = [{ type: "text", text: "Here are the frames:" }];
    
    frames.forEach((frame) => {
      userContent.push({
        type: "image_url",
        image_url: { url: frame.data }
      });
    });

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ];

    const response = await provider.generateContent(model, messages, {
        responseMimeType: 'application/json',
        thinking: { enabled: thinkingEnabled, level: 'HIGH' }
    });

    const content = response.text;
    if (!content) throw new Error("No response content from AI");

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      const parsed = JSON.parse(jsonString);
      const steps = Array.isArray(parsed) ? parsed : (parsed.steps || []);
      
      if (Array.isArray(steps)) {
        const flattenedDescriptions = new Array(frames.length).fill('');
        steps.forEach((group: any) => {
           if (Array.isArray(group.indices) && typeof group.description === 'string') {
              group.indices.forEach((idx: number) => {
                  if (idx >= 0 && idx < flattenedDescriptions.length) {
                      flattenedDescriptions[idx] = group.description;
                  }
              });
           }
        });
        return flattenedDescriptions;
      }
      throw new Error("Invalid JSON structure");
    } catch (e) {
      console.error("JSON Parse Error", e);
      throw new Error("步骤分析返回格式错误，请重试。");
    }
  }

  /**
   * Step 1: Generate Base Storyboard
   */
  static async generateBaseImage(
    apiKey: string,
    baseUrl: string,
    frames: FrameData[],
    stepDescriptions: string[],
    customPrompt: string,
    contextDescription: string,
    strategy: SocialPlatformStrategy,
    thinkingEnabled: boolean,
    providerType: ProviderType = 'google'
  ): Promise<string> {
    const provider = this.getProvider(apiKey, baseUrl, providerType);
    const model = this.getModelName(providerType, 'image');

    let finalPrompt = strategy.getBaseImagePrompt(contextDescription, customPrompt, providerType === 'openai');

    if (stepDescriptions.length > 0) {
      finalPrompt += `\n\nSpecific Step Descriptions (Grouped):\n`;
      let currentGroupDesc = '';
      let startIdx = 0;
      for (let i = 0; i <= stepDescriptions.length; i++) {
         if (i === stepDescriptions.length || stepDescriptions[i] !== currentGroupDesc) {
             if (currentGroupDesc) {
                 const rangeStr = startIdx === i - 1 ? `Frame ${startIdx + 1}` : `Frames ${startIdx + 1}-${i}`;
                 finalPrompt += `- ${rangeStr}: ${currentGroupDesc}\n`;
             }
             if (i < stepDescriptions.length) {
                 currentGroupDesc = stepDescriptions[i];
                 startIdx = i;
             }
         }
      }
    }
    
    const userContent: any[] = [{ type: "text", text: finalPrompt }];

    // Add reference images (OpenAI DALL-E 3 will likely ignore them or error if passed incorrectly, 
    // but our abstraction layer handles the 'image_url' stripping/handling for DALL-E)
    frames.forEach((frame) => {
      userContent.push({
        type: "image_url",
        image_url: { url: frame.data }
      });
    });

    const messages: LLMMessage[] = [
       { role: "user", content: userContent }
    ];

    const response = await provider.generateContent(model, messages, {
        thinking: { enabled: thinkingEnabled }
    });

    if (response.images && response.images.length > 0) {
        return response.images[0];
    }
    throw new Error("No image generated.");
  }

  /**
   * Step 2: Integrate Character
   */
  static async integrateCharacter(
    apiKey: string,
    baseUrl: string,
    baseArt: string,
    avatarImage: string,
    thinkingEnabled: boolean,
    providerType: ProviderType = 'google',
    watermarkText?: string
  ): Promise<string> {
    const provider = this.getProvider(apiKey, baseUrl, providerType);
    const model = this.getModelName(providerType, 'image');

    let prompt = `这里有两张图片。
    图片 1 是一份手绘的故事板教程。
    图片 2 是一个角色参考图（虚拟角色/宠物）。
    任务：严格按照原图（相同的布局、相同的步骤、相同的风格）重新绘制教程，但要将虚拟角色融入到场景中。
    该人物应与教程步骤进行互动以增添活力。每个步骤中，虚拟角色的交互应当是完全不一样的
    请勿更改教程内容或艺术风格。只需自然地添加该人物即可。`;

    if (watermarkText && watermarkText.trim()) {
      prompt += `\n\n【重要需求】：请在画面主体上或主体附近添加水印文字“${watermarkText}”。
      水印应清晰可见，自然融入画面，但不要遮挡关键步骤内容。`;
    }

    const userContent: any[] = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: baseArt } },
      { type: "image_url", image_url: { url: avatarImage } }
    ];

    const messages: LLMMessage[] = [
      { role: "user", content: userContent }
    ];

    const response = await provider.generateContent(model, messages, {
        thinking: { enabled: thinkingEnabled }
    });

    if (response.images && response.images.length > 0) {
        return response.images[0];
    }
    throw new Error("No image generated.");
  }

  /**
   * Step 3: Refine Single Panel
   */
  static async refinePanel(
    apiKey: string,
    baseUrl: string,
    index: number,
    totalPanels: number,
    stepDescription: string,
    contextDescription: string,
    generatedArt: string,
    originalFrame: FrameData | null,
    avatarImage: string | null,
    thinkingEnabled: boolean,
    providerType: ProviderType = 'google',
    watermarkText?: string
  ): Promise<string> {
    const provider = this.getProvider(apiKey, baseUrl, providerType);
    const model = this.getModelName(providerType, 'image');

    let prompt = `任务：从提供的“完整故事板”中，截取并精修第 ${index + 1} 个步骤的画面（总共 ${totalPanels} 个步骤）。
    
    该步骤的动作描述：${stepDescription}
    ${contextDescription ? `背景信息：${contextDescription}` : ''}
    
    输入参考：
    1. 完整故事板（Image 1）：包含所有步骤的大图。
    ${originalFrame ? "2. 原始参考帧（Image 2）：该步骤对应的原始视频画面。" : ""}
    ${avatarImage ? "3. 角色图（Image 3）：必须包含的角色。" : ""}

    绘图要求：
    - 仅输出第 ${index + 1} 个步骤的单张图片。
    - 比例必须为 9:16（竖屏）。
    - 画面主体（物品和角色）必须居中，四周保留安全距离。
    - 保持与“完整故事板”一致的手绘风格。
    - 清晰度高，线条流畅。`;

    if (watermarkText && watermarkText.trim()) {
      prompt += `\n- 【重要】：在画面主体上或主体附近添加水印文字“${watermarkText}”。`;
    }

    const userContent: any[] = [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: generatedArt } }
    ];

    if (originalFrame) {
        userContent.push({ type: "image_url", image_url: { url: originalFrame.data } });
    }

    if (avatarImage) {
        userContent.push({ type: "image_url", image_url: { url: avatarImage } });
    }

    const messages: LLMMessage[] = [
        { role: "user", content: userContent }
    ];

    const response = await provider.generateContent(model, messages, {
        thinking: { enabled: thinkingEnabled }
    });

    if (response.images && response.images.length > 0) {
        return response.images[0];
    }
    throw new Error("No image generated.");
  }

  /**
   * Step 4: Generate Captions
   */
  static async generateCaptions(
    apiKey: string,
    baseUrl: string,
    strategy: SocialPlatformStrategy,
    videoTitle: string,
    contextDescription: string,
    frames: FrameData[],
    generatedArt: string | null,
    refinedPanelImages: string[],
    avatarPresent: boolean,
    thinkingEnabled: boolean,
    providerType: ProviderType = 'google'
  ): Promise<CaptionOption[]> {
    const provider = this.getProvider(apiKey, baseUrl, providerType);
    const model = this.getModelName(providerType, 'text');

    let prompt = strategy.getCaptionPrompt(videoTitle, contextDescription, avatarPresent);

    prompt += `
        Please return STRICTLY a JSON object with a "captions" key containing an array.
        Format: { "captions": [ { "title": "...", "content": "..." }, ... ] }`;

    const userContent: any[] = [{ type: "text", text: prompt }];

    // Prefer refined panels for caption generation context
    if (refinedPanelImages.length > 0) {
        userContent[0].text += "\n\nRefer to these refined panel images:";
        refinedPanelImages.forEach(imgBase64 => {
            userContent.push({ type: "image_url", image_url: { url: imgBase64 } });
        });
    } else {
        if (generatedArt) {
          userContent.push({ type: "image_url", image_url: { url: generatedArt } });
        }
        frames.forEach((frame) => {
            userContent.push({ type: "image_url", image_url: { url: frame.data } });
        });
    }

    const messages: LLMMessage[] = [
        { role: "user", content: userContent }
    ];

    const response = await provider.generateContent(model, messages, {
        responseMimeType: 'application/json',
        thinking: { enabled: thinkingEnabled, level: 'HIGH' }
    });

    const content = response.text;
    if (!content) throw new Error("Caption generation failed (No content).");

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      const parsed = JSON.parse(jsonString);
      const captions = Array.isArray(parsed) ? parsed : (parsed.captions || []);
      if (Array.isArray(captions)) {
        return captions;
      }
      throw new Error("Format Error");
    } catch (e) {
      console.error("JSON Parse Error", e);
      return [{ title: "Result", content: content }];
    }
  }
}
