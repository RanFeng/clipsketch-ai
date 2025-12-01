
import { createLLMProvider, ProviderType, LLMMessage, LLMProvider, LLMResponse, BatchStatusResponse } from './llm';
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
   * Robust JSON extraction helper
   */
  private static extractJSON(text: string): any {
    let jsonString = text;
    
    // 1. Try to extract from markdown code blocks first (most reliable for thinking models)
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      jsonString = markdownMatch[1];
    } else {
      // 2. Fallback: find the outermost curly braces
      const firstOpen = text.indexOf('{');
      const lastClose = text.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        jsonString = text.substring(firstOpen, lastClose + 1);
      }
    }

    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON Parse Error. Raw text:", text);
      throw new Error("AI 响应格式错误，无法解析 JSON。");
    }
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
    
    REQUIRED OUTPUT FORMAT:
    You must output a valid JSON object wrapped in a markdown code block.
    
    \`\`\`json
    {
      "steps": [
        {
          "indices": [0, 1],
          "description": "Description of the first step covering frames 0 and 1"
        },
        {
          "indices": [2],
          "description": "Description of the second step covering frame 2"
        }
      ]
    }
    \`\`\`
    
    Rules:
    1. "indices" is an array of 0-based frame indices.
    2. "description" is the text in the requested language.
    3. Ensure all frames are covered in order.
    4. Do not include any conversational text outside the JSON code block.`;

    const userContent: any[] = [{ type: "text", text: "Here are the frames to analyze:" }];
    
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
      const parsed = this.extractJSON(content);
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
      throw new Error("Invalid JSON structure: missing 'steps' array");
    } catch (e) {
      console.error("Step Analysis Error", e);
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
   * Helper to prepare refine messages
   */
  private static prepareRefineMessages(
    index: number,
    totalPanels: number,
    stepDescription: string,
    contextDescription: string,
    generatedArt: string,
    originalFrame: FrameData | null,
    avatarImage: string | null,
    watermarkText?: string
  ): LLMMessage[] {
    let prompt = `任务：从提供的“完整故事板”中，截取并精修第 ${index + 1} 个步骤的画面（总共 ${totalPanels} 个步骤）。
    
    该步骤的动作描述：${stepDescription}
    ${contextDescription ? `背景信息：${contextDescription}` : ''}
    
    输入参考：
    1. 完整故事板（Image 1）：包含所有步骤的大图。
    ${originalFrame ? "2. 原始参考帧（Image 2）：该步骤对应的原始视频画面。" : ""}
    ${avatarImage ? "3. 角色图（Image 3）：必须包含的角色。" : ""}

    绘图要求：
    - 仅输出第 ${index + 1} 个子图
    - 比例必须为 9:16（竖屏）
    - 画面主体（物品和角色）必须居中，四周保留安全距离
    - 画面中的步骤文字也必须保留
    - 不要改变图中细节，直接输出子图即可
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

    return [
        { role: "user", content: userContent }
    ];
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

    const messages = this.prepareRefineMessages(
        index, totalPanels, stepDescription, contextDescription,
        generatedArt, originalFrame, avatarImage, watermarkText
    );

    const response = await provider.generateContent(model, messages, {
        thinking: { enabled: thinkingEnabled }
    });

    if (response.images && response.images.length > 0) {
        return response.images[0];
    }
    throw new Error("No image generated.");
  }

  /**
   * Step 3 Batch: Refine Multiple Panels - Returns Job ID
   */
  static async refinePanelsBatch(
    apiKey: string,
    baseUrl: string,
    panels: { index: number; stepDescription: string; originalFrame: FrameData | null }[],
    totalPanels: number,
    contextDescription: string,
    generatedArt: string,
    avatarImage: string | null,
    thinkingEnabled: boolean,
    providerType: ProviderType = 'google',
    watermarkText?: string
  ): Promise<{ jobId: string }> {
    const provider = this.getProvider(apiKey, baseUrl, providerType);
    const model = this.getModelName(providerType, 'image');

    // 1. Prepare batch messages
    const batchMessages: LLMMessage[][] = panels.map(p => 
        this.prepareRefineMessages(
            p.index, totalPanels, p.stepDescription, contextDescription,
            generatedArt, p.originalFrame, avatarImage, watermarkText
        )
    );

    // 2. Call batch generation (Returns Job ID)
    const jobId = await provider.generateContentBatch(model, batchMessages, {
        thinking: { enabled: thinkingEnabled }
    });
    
    return { jobId };
  }

  /**
   * Step 3 Batch Check: Check Status and Get Results
   */
  static async checkBatchStatus(
    apiKey: string,
    baseUrl: string,
    jobId: string,
    providerType: ProviderType = 'google'
  ): Promise<{ 
      status: 'pending' | 'completed' | 'failed', 
      results?: { index: number; image: string | null; error?: string }[] 
  }> {
      const provider = this.getProvider(apiKey, baseUrl, providerType);
      const statusResponse = await provider.getBatchStatus(jobId);

      if (statusResponse.status === 'completed' || statusResponse.status === 'validating' || statusResponse.status === 'in_progress') {
          if (statusResponse.results) {
               // Map generic LLMResponse results back to our panel format
               const mappedResults = statusResponse.results.map((res, i) => ({
                   index: i, // We rely on the preserved order from getBatchStatus sorting
                   image: res.images?.[0] || null,
                   error: res.error || (res.images?.[0] ? undefined : 'No image generated')
               }));
               return { status: 'completed', results: mappedResults };
          }
          
          if (statusResponse.status === 'completed') {
             // Treat "completed but no results" as a completed state with empty results so UI can clear loading state
             return { status: 'completed', results: [] };
          }
          
          return { status: 'pending' };
      }

      if (statusResponse.status === 'failed' || statusResponse.status === 'expired' || statusResponse.status === 'cancelled') {
           return { status: 'failed' };
      }

      return { status: 'pending' };
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
        REQUIRED OUTPUT FORMAT:
        Output strictly a JSON object with a "captions" key containing an array.
        Wrap the JSON in a markdown code block.
        
        \`\`\`json
        {
          "captions": [
            { "title": "Style 1 Title", "content": "Content..." },
            { "title": "Style 2 Title", "content": "Content..." }
          ]
        }
        \`\`\`
    `;

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
      const parsed = this.extractJSON(content);
      const captions = Array.isArray(parsed) ? parsed : (parsed.captions || []);
      if (Array.isArray(captions)) {
        return captions;
      }
      throw new Error("Format Error: Missing 'captions' array");
    } catch (e) {
      console.error("JSON Parse Error", e);
      return [{ title: "Result (Parse Error)", content: content }];
    }
  }

  /**
   * Step 6: Generate Video Cover
   */
  static async generateCover(
    apiKey: string,
    baseUrl: string,
    strategy: SocialPlatformStrategy,
    contextDescription: string,
    selectedCaption: CaptionOption,
    frames: FrameData[],
    avatarImage: string | null,
    watermarkText: string,
    thinkingEnabled: boolean,
    providerType: ProviderType = 'google'
  ): Promise<string> {
    const provider = this.getProvider(apiKey, baseUrl, providerType);
    const model = this.getModelName(providerType, 'image');

    const prompt = strategy.getCoverPrompt(
      contextDescription, 
      selectedCaption.title, 
      selectedCaption.content, 
      watermarkText, 
      !!avatarImage, 
      providerType === 'openai'
    );
    
    const userContent: any[] = [
        { type: "text", text: prompt }
    ];

    // Select reference frames: First 2 and Last 2
    const indices = new Set<number>();
    
    // First 2
    [0, 1].forEach(i => {
        if (i < frames.length) indices.add(i);
    });
    // Last 2
    [frames.length - 2, frames.length - 1].forEach(i => {
        if (i >= 0) indices.add(i);
    });
    
    const uniqueFrames = Array.from(indices).sort((a,b) => a-b).map(i => frames[i]);

    uniqueFrames.forEach((frame) => {
        userContent.push({ 
           type: "image_url", 
           image_url: { url: frame.data } 
        });
    });

    if (avatarImage) {
        userContent.push({ 
           type: "image_url", 
           image_url: { url: avatarImage } 
        });
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
    throw new Error("No cover image generated.");
  }
}
