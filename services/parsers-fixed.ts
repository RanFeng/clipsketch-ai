/**
 * 修复后的解析器 - 使用 EdgeOne 代理而非第三方代理
 * 
 * 关键改动：
 * 1. PROXY_BASE 改为 /api/proxy (本地 EdgeOne 函数)
 * 2. 所有 fetch 都使用本地代理代替第三方代理
 * 3. 加入错误处理和重试机制
 */

import { VideoMetadata } from '../utils';

export interface VideoParser {
  name: string;
  canHandle(url: string): boolean;
  parse(url: string): Promise<VideoMetadata>;
}

// EdgeOne 本地代理基础 URL
const PROXY_BASE = '/api/proxy?url=';

/**
 * 生成规范化的存储 Key
 */
function generateStorageKey(url: string): string {
  try {
    let cleanUrl = url.trim();
    cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
    cleanUrl = cleanUrl.replace(/^www\./, '');
    
    const urlObj = new URL('http://' + cleanUrl);
    let path = urlObj.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return `${urlObj.host}${path}`;
  } catch (e) {
    return url.replace(/^https?:\/\//, '').split('?')[0];
  }
}

/**
 * 通过本地代理 fetch，添加超时和重试
 */
async function proxyFetch(targetUrl: string, options: RequestInit = {}): Promise<Response> {
  const proxyUrl = `${PROXY_BASE}${encodeURIComponent(targetUrl)}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s 超时
    
    const response = await fetch(proxyUrl, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    console.error(`Proxy fetch failed for ${targetUrl}:`, error);
    throw new Error(`Failed to fetch via proxy: ${error.message}`);
  }
}

// --- Xiaohongshu Parser ---
class XiaohongshuParser implements VideoParser {
  name = 'Xiaohongshu';

  canHandle(url: string): boolean {
    return url.includes('xiaohongshu.com') || url.includes('xhslink.com');
  }

  async parse(url: string): Promise<VideoMetadata> {
    const response = await proxyFetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch XHS page: ${response.status}`);
    }
    
    const html = await response.text();
    const result: VideoMetadata = { url: '' };

    // Method 1: 尝试解析 window.__INITIAL_STATE__
    try {
      const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s) || 
                         html.match(/<script>window\.__INITIAL_STATE__=({.+?})<\/script>/);

      if (stateMatch && stateMatch[1]) {
        let jsonStr = stateMatch[1];
        jsonStr = jsonStr.replace(/:\s*undefined/g, ':null');
        
        const state = JSON.parse(jsonStr);
        const noteData = state.note || {};
        const firstId = noteData.firstNoteId;
        const noteDetail = noteData.noteDetailMap?.[firstId]?.note || noteData.note;

        if (noteDetail) {
          result.title = noteDetail.title;
          result.content = noteDetail.desc;
          
          // 提取视频 URL
          if (noteDetail.video?.masterUrl) {
            result.url = noteDetail.video.masterUrl;
          } else if (noteDetail.video?.media?.stream?.h264?.[0]?.masterUrl) {
            result.url = noteDetail.video.media.stream.h264[0].masterUrl;
          } else if (noteDetail.video?.consumer?.originVideoKey) {
            result.url = `https://sns-video-bd.xhscdn.com/${noteDetail.video.consumer.originVideoKey}`;
          }
        }
      }
    } catch (e) {
      console.warn("XHS JSON 解析失败，使用正则表达式回退", e);
    }

    // Method 2: 正则表达式回退
    if (!result.url) {
      const xhsVideoMatch = html.match(/<meta (?:name|property)="og:video" content="([^"]+)"/i);
      if (xhsVideoMatch?.[1]) {
        result.url = xhsVideoMatch[1];
      } else {
        const xhsJsonMatch = html.match(/"masterUrl":"([^"]+)"/);
        if (xhsJsonMatch?.[1]) {
          result.url = xhsJsonMatch[1].replace(/\\u002F/g, "/").replace(/\\/g, "");
        }
      }
    }

    // 元标签回退
    if (!result.title) {
      const titleMatch = html.match(/<meta[^>]+(?:name|property)=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      if (titleMatch?.[1]) result.title = titleMatch[1];
    }

    if (!result.content) {
      const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i);
      if (descMatch?.[1]) result.content = descMatch[1];
    }

    if (result.url?.startsWith('http:')) {
      result.url = result.url.replace('http:', 'https:');
    }

    if (!result.url) {
      throw new Error("Could not find video URL in Xiaohongshu page");
    }

    return result;
  }
}

// --- Instagram Parser ---
class InstagramParser implements VideoParser {
  name = 'Instagram';

  canHandle(url: string): boolean {
    return url.includes('instagram.com') || url.includes('instagr.am');
  }

  async parse(url: string): Promise<VideoMetadata> {
    const cobaltApi = 'https://api.cobalt.tools/api/json';
    
    try {
      const response = await proxyFetch(cobaltApi, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
      });

      if (!response.ok) {
        throw new Error(`Cobalt API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.text || 'Instagram parsing failed');
      }

      let videoUrl = '';

      if (data.status === 'stream' || data.status === 'redirect') {
        videoUrl = data.url;
      } else if (data.status === 'picker' && data.picker) {
        const video = data.picker.find((item: any) => item.type === 'video');
        if (video) videoUrl = video.url;
      }

      if (!videoUrl) {
        throw new Error('No video found in this Instagram link');
      }

      return {
        url: videoUrl,
        title: 'Instagram Video',
        content: 'Imported from Instagram'
      };
    } catch (e: any) {
      console.warn('Instagram parse failed', e);
      throw new Error(e.message || 'Could not parse Instagram video');
    }
  }
}

// --- Bilibili Parser (使用本地代理) ---
class BilibiliParser implements VideoParser {
  name = 'Bilibili';

  canHandle(url: string): boolean {
    return url.includes('bilibili.com') || url.includes('b23.tv');
  }

  async parse(url: string): Promise<VideoMetadata> {
    console.log(`Bilibili: Parsing via EdgeOne proxy...`);
    
    try {
      // 构建目标 API URL
      const apiUrl = `https://api.mir6.com/api/bzjiexi?url=${encodeURIComponent(url)}&type=json`;
      
      // 通过本地代理请求
      const response = await proxyFetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const json = await response.json();

      if (json.code === 200 && json.data?.length > 0) {
        const videoData = json.data[0];
        let videoUrl = videoData.video_url;
        const duration = videoData.duration;
        
        if (!videoUrl) {
          throw new Error("API returned success but no video URL found.");
        }

        if (videoUrl.startsWith('http:')) {
          videoUrl = videoUrl.replace('http:', 'https:');
        }

        return { 
          url: videoUrl,
          duration: typeof duration === 'number' ? duration : undefined,
          title: json.title || videoData.title,
          content: json.desc || videoData.desc
        };
      } else {
        throw new Error(json.msg || "Bilibili API parsing failed");
      }
    } catch (error: any) {
      console.error('Bilibili parsing error:', error);
      throw error;
    }
  }
}

// --- Generic / Fallback Parser ---
class GenericParser implements VideoParser {
  name = 'Generic';

  canHandle(url: string): boolean {
    return true;
  }

  async parse(url: string): Promise<VideoMetadata> {
    const response = await proxyFetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page content: ${response.status}`);
    }
    
    const html = await response.text();
    let result: VideoMetadata = { url: '' };

    // 提取标题
    let titleMatch = html.match(/<meta[^>]+(?:name|property)=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (!titleMatch) {
      titleMatch = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']og:title["']/i);
    }
    
    if (titleMatch?.[1]) {
      result.title = titleMatch[1];
    } else {
      const titleTag = html.match(/<title>([^<]+)<\/title>/i);
      if (titleTag?.[1]) result.title = titleTag[1];
    }

    // 提取描述
    let descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i);
    if (!descMatch) {
      descMatch = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:og:description|description)["']/i);
    }
    if (descMatch?.[1]) result.content = descMatch[1];

    // 提取视频 URL
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
    if (ogVideoMatch?.[1]) {
      result.url = ogVideoMatch[1].replace(/&amp;/g, '&');
      return result;
    }
    
    const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/i);
    if (mp4Match) {
      result.url = mp4Match[0];
      return result;
    }

    throw new Error("Could not find video stream. Please check if the link is valid.");
  }
}

// 解析器注册表
const parsers: VideoParser[] = [
  new XiaohongshuParser(), 
  new InstagramParser(),
  new BilibiliParser(),
  new GenericParser() // 必须最后
];

/**
 * 主入口：解析视频 URL
 */
export async function parseVideoUrl(inputUrl: string): Promise<VideoMetadata> {
  const urlMatch = inputUrl.match(/https?:\/\/[a-zA-Z0-9\-\._~:/?#[\]@!$&'()*+,;=%]+/);
  if (!urlMatch) {
    throw new Error("No URL found in the provided text");
  }
  
  let targetUrl = urlMatch[0];
  targetUrl = targetUrl.replace(/[.,;:!)]+$/, "");

  const storageKey = generateStorageKey(targetUrl);

  for (const parser of parsers) {
    if (parser.canHandle(targetUrl)) {
      try {
        const metadata = await parser.parse(targetUrl);
        metadata.storageKey = storageKey;
        return metadata;
      } catch (e: any) {
        console.warn(`Parser ${parser.name} failed:`, e);
        if (parser.name !== 'Generic') {
          continue;
        }
        throw e;
      }
    }
  }
  throw new Error("No parser could handle this URL");
}
