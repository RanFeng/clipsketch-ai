/**
 * 修改版 LLM 服务 - 使用 EdgeOne AI Gateway
 * 
 * 关键改动：
 * 1. 使用 https://ai-gateway.eo-edgefunctions7.com 而非 Google 直接 API
 * 2. 支持代理所有 Gemini 调用
 * 3. 自动处理认证
 */

const AI_GATEWAY_URL = process.env.REACT_APP_AI_GATEWAY_URL || 
  'https://ai-gateway.eo-edgefunctions7.com/v1/models/gemini-2.0-flash:generateContent';

/**
 * 构建请求头
 */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 如果 AI Gateway 需要认证
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return headers;
}

/**
 * 通用 API 调用函数
 */
async function callAiGateway(
  payload: any,
  modelEndpoint: string = ':generateContent'
): Promise<any> {
  try {
    // 构建完整 URL
    const url = AI_GATEWAY_URL.includes(':') 
      ? AI_GATEWAY_URL 
      : `${AI_GATEWAY_URL.replace(':generateContent', '')}${modelEndpoint}`;

    console.log(`Calling AI Gateway: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('AI Gateway error:', {
        status: response.status,
        error: errorData
      });
      throw new Error(
        errorData.error?.message || 
        `AI Gateway returned ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('API call failed:', error);
    throw error;
  }
}

/**
 * 生成故事板
 * @param images 多个图片的 base64 或 URL
 * @param context 上下文信息
 */
export async function generateStoryboard(
  images: string[],
  context: string = ''
): Promise<any> {
  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: img.split(',')[1] || img // 移除 data:image/jpeg;base64, 前缀
    }
  }));

  const textPart = {
    text: `请基于以下${images.length}张图片创建一个手绘风格的故事板。
${context}

要求：
1. 合并多张图片成一张连贯的故事板
2. 采用可爱的手绘风格
3. 保留关键细节和动作
4. 添加适当的文字标注

返回一张高质量的、优化后的故事板图片。`
  };

  const payload = {
    contents: [{
      parts: [...imageParts, textPart]
    }]
  };

  return callAiGateway(payload);
}

/**
 * 生成社交媒体文案
 */
export async function generateSocialCopy(
  images: string[],
  platform: 'xiaohongshu' | 'douyin' | 'instagram' = 'xiaohongshu',
  style: 'emotional' | 'tutorial' | 'concise' = 'emotional'
): Promise<string> {
  const styleDes = {
    emotional: '情感故事型，能引发共鸣',
    tutorial: '干货教程型，提供实用建议',
    concise: '短小精悍型，高度概括'
  };

  const platformDes = {
    xiaohongshu: '小红书',
    douyin: '抖音',
    instagram: 'Instagram'
  };

  const imageParts = images.slice(0, 3).map(img => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: img.split(',')[1] || img
    }
  }));

  const payload = {
    contents: [{
      parts: [
        ...imageParts,
        {
          text: `请基于这些视频截图，为${platformDes[platform]}生成一条${styleDes[style]}的文案。

要求：
1. 语气自然、吸引人
2. 长度适合${platformDes[platform]}（通常 100-300 字）
3. 包含适当的 emoji
4. 突出视频的主要内容和亮点
5. 鼓励用户互动（评论、分享等）

返回 JSON 格式：{"copy": "文案内容", "tags": ["标签1", "标签2"]}`
        }
      ]
    }]
  };

  const result = await callAiGateway(payload);
  
  try {
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textContent);
    return parsed.copy;
  } catch {
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

/**
 * 生成视频封面
 */
export async function generateCover(
  images: string[],
  title: string,
  style: string = 'modern'
): Promise<any> {
  const imageParts = images.slice(0, 2).map(img => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: img.split(',')[1] || img
    }
  }));

  const payload = {
    contents: [{
      parts: [
        ...imageParts,
        {
          text: `请基于这些图片和标题生成一个高品质的竖屏视频封面。

标题：${title}
风格：${style}

要求：
1. 竖屏比例 9:16
2. 包含清晰可读的标题文字
3. 视觉吸引力强，能促进点击
4. 融合多张图片的关键元素
5. 使用对比色和现代设计元素

返回优化后的封面图片。`
        }
      ]
    }]
  };

  return callAiGateway(payload);
}

/**
 * 分镜精修
 */
export async function refineFrame(
  frameImage: string,
  instructions: string = ''
): Promise<any> {
  const payload = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: frameImage.split(',')[1] || frameImage
          }
        },
        {
          text: `请对这张视频截图进行高清重绘和优化。

${instructions ? `特殊要求：${instructions}` : ''}

要求：
1. 提高清晰度和细节
2. 增强色彩和对比度
3. 保留原始内容的识别性
4. 适当增加艺术感（如线条、纹理）
5. 确保无损重绘

返回优化后的高清图片。`
        }
      ]
    }]
  };

  return callAiGateway(payload);
}

/**
 * 批量分镜精修
 */
export async function refineFramesBatch(
  frames: string[],
  instructions: string = ''
): Promise<any[]> {
  const results: any[] = [];
  
  for (const frame of frames) {
    try {
      const result = await refineFrame(frame, instructions);
      results.push(result);
      
      // 避免频率限制，每个请求间隔 1 秒
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn('Failed to refine frame:', error);
      results.push(null);
    }
  }

  return results;
}

/**
 * 创意分析：分析视频步骤
 */
export async function analyzeVideoSteps(
  images: string[],
  description: string = ''
): Promise<string> {
  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: img.split(',')[1] || img
    }
  }));

  const payload = {
    contents: [{
      parts: [
        ...imageParts,
        {
          text: `请分析这个视频的步骤和创意思路。
${description ? `视频描述：${description}` : ''}

返回格式（JSON）：{
  "title": "创意标题",
  "steps": ["步骤1", "步骤2", ...],
  "creativity_score": 1-10,
  "main_theme": "主题",
  "target_audience": "目标人群"
}`
        }
      ]
    }]
  };

  const result = await callAiGateway(payload);
  
  try {
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textContent);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

export default {
  generateStoryboard,
  generateSocialCopy,
  generateCover,
  refineFrame,
  refineFramesBatch,
  analyzeVideoSteps,
  callAiGateway
};
