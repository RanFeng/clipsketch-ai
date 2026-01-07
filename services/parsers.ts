
import { VideoMetadata } from '../../utils';

export interface VideoParser {
  name: string;
  canHandle(url: string): boolean;
  parse(url: string): Promise<VideoMetadata>;
}

// 改用 EdgeOne Functions/Pages Function 作为代理
// 本地开发时映射到 /api/proxy，生产时 EdgeOne 会自动处理
const PROXY_BASE = '/api/proxy?url=';

/**
 * Generates a normalized storage key from the source URL.
 * Format: domain.com/path/to/resource
 * Protocol, www, and query parameters are stripped.
 */
function generateStorageKey(url: string): string {
  try {
    // Clean input first
    let cleanUrl = url.trim();
    
    // Handle generic cases
    // 1. Strip protocol
    cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
    
    // 2. Strip www.
    cleanUrl = cleanUrl.replace(/^www\./, '');
    
    // 3. Use URL API to handle path parsing safely (add protocol back for parser)
    const urlObj = new URL('http://' + cleanUrl);
    
    let path = urlObj.pathname;
    // Remove trailing slash
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    return `${urlObj.host}${path}`;
  } catch (e) {
    // Fallback: simple stripping if URL parse fails
    return url.replace(/^https?:\/\//, '').split('?')[0];
  }
}

// --- Xiaohongshu Parser ---
class XiaohongshuParser implements VideoParser {
  name = 'Xiaohongshu';

  canHandle(url: string): boolean {
    return url.includes('xiaohongshu.com') || url.includes('xhslink.com');
  }

  async parse(url: string): Promise<VideoMetadata> {
    const proxyUrl = `${PROXY_BASE}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Failed to fetch XHS page: ${response.status}`);
    
    const html = await response.text();
    const result: VideoMetadata = { url: '' };

    // Method 1: Try to parse window.__INITIAL_STATE__
    try {
        const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s) || 
                           html.match(/<script>window\.__INITIAL_STATE__=({.+?})<\/script>/);

        if (stateMatch && stateMatch[1]) {
            let jsonStr = stateMatch[1];
            // XHS state often contains 'undefined' which is invalid JSON. Replace with null.
            jsonStr = jsonStr.replace(/:\s*undefined/g, ':null');
            
            const state = JSON.parse(jsonStr);
            
            // Navigate the state tree
            // Structure: state.note.noteDetailMap[firstNoteId].note
            const noteData = state.note || {};
            const firstId = noteData.firstNoteId;
            const noteDetail = noteData.noteDetailMap?.[firstId]?.note || noteData.note;

            if (noteDetail) {
                result.title = noteDetail.title;
                result.content = noteDetail.desc;
                
                // Video URL
                if (noteDetail.video) {
                    // Try masterUrl first
                    if (noteDetail.video.masterUrl) {
                        result.url = noteDetail.video.masterUrl;
                    } 
                    // Fallback to media.stream for some versions
                    else if (noteDetail.video.media?.stream?.h264?.[0]?.masterUrl) {
                        result.url = noteDetail.video.media.stream.h264[0].masterUrl;
                    }
                    // Fallback to consumer object
                    else if (noteDetail.video.consumer?.originVideoKey) {
                         // Construct url if only key is present (less common now, usually masterUrl exists)
                         result.url = `https://sns-video-bd.xhscdn.com/${noteDetail.video.consumer.originVideoKey}`;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("XHS JSON Parse failed, falling back to Regex", e);
    }

    // Method 2: Regex Fallback (if JSON failed or didn't contain url)
    if (!result.url) {
        // Video URL
        const xhsVideoMatch = html.match(/<meta (?:name|property)="og:video" content="([^"]+)"/i);
        if (xhsVideoMatch && xhsVideoMatch[1]) {
            result.url = xhsVideoMatch[1];
        } else {
             const xhsJsonMatch = html.match(/"masterUrl":"([^"]+)"/);
             if (xhsJsonMatch && xhsJsonMatch[1]) {
                result.url = xhsJsonMatch[1].replace(/\\u002F/g, "/").replace(/\\/g, "");
             }
        }
    }

    // Title/Desc Meta Fallback if JSON didn't populate them
    if (!result.title) {
         const titleMatch = html.match(/<meta[^>]+(?:name|property)=["']og:title["'][^>]+content=["']([^"']+)["']/i);
         if (titleMatch && titleMatch[1]) result.title = titleMatch[1];
    }

    if (!result.content) {
        const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) result.content = descMatch[1];
    }
    
    // Ensure URL is HTTPS
    if (result.url && result.url.startsWith('http:')) {
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
    // We switch to Cobalt API which is open source and robust for Instagram
    // iiilab requires dynamic signature generation (g-footer) which is hard to maintain client-side.
    const cobaltApi = 'https://api.cobalt.tools/api/json';
    
    try {
        const response = await fetch(cobaltApi, {
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
        
        // Handle Direct Stream or Redirect
        if (data.status === 'stream' || data.status === 'redirect') {
            videoUrl = data.url;
        } 
        // Handle Picker (Carousel/Album) - Try to find the first video
        else if (data.status === 'picker' && data.picker) {
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

// --- Bilibili Parser (External API) ---
class BilibiliParser implements VideoParser {
  name = 'Bilibili';

  canHandle(url: string): boolean {
    return url.includes('bilibili.com') || url.includes('b23.tv');
  }

  async parse(url: string): Promise<VideoMetadata> {
    console.log(`Bilibili: Parsing via mir6 API...`);
    
    const apiUrl = `https://api.mir6.com/api/bzjiexi?url=${encodeURIComponent(url)}&type=json`;
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    const json = await response.json();

    if (json.code === 200 && json.data && json.data.length > 0) {
      const videoData = json.data[0];
      let videoUrl = videoData.video_url;
      const duration = videoData.duration;
      
      if (!videoUrl) throw new Error("API returned success but no video URL found.");

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
  }
}

// --- Generic / Fallback Parser (Scraping) ---
class GenericParser implements VideoParser {
  name = 'Generic';

  canHandle(url: string): boolean {
    return true; // Fallback for everything else
  }

  async parse(url: string): Promise<VideoMetadata> {
    const proxyUrl = `${PROXY_BASE}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
       throw new Error(`Failed to fetch page content: ${response.status}`);
    }
    
    const html = await response.text();
    let result: VideoMetadata = { url: '' };

    // 1. Meta Tag Extraction (Robust Regex)
    
    // Title
    let titleMatch = html.match(/<meta[^>]+(?:name|property)=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (!titleMatch) {
       titleMatch = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']og:title["']/i);
    }
    
    if (titleMatch && titleMatch[1]) {
        result.title = titleMatch[1];
    } else {
        const titleTag = html.match(/<title>([^<]+)<\/title>/i);
        if (titleTag && titleTag[1]) result.title = titleTag[1];
    }

    // Description
    let descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i);
    if (!descMatch) {
         descMatch = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:og:description|description)["']/i);
    }
    if (descMatch && descMatch[1]) result.content = descMatch[1];

    // 2. Video URL Extraction (Generic)
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
    if (ogVideoMatch && ogVideoMatch[1]) {
      result.url = ogVideoMatch[1].replace(/&amp;/g, '&');
      return result;
    }
    
    // Try generic mp4 match if no meta tag
    const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/i);
    if (mp4Match) {
        result.url = mp4Match[0];
        return result;
    }

    throw new Error("Could not find video stream. Please check if the link is valid.");
  }
}

// Registry
const parsers: VideoParser[] = [
  new XiaohongshuParser(), 
  new InstagramParser(),
  new BilibiliParser(),
  new GenericParser() // Must be last
];

export async function parseVideoUrl(inputUrl: string): Promise<VideoMetadata> {
  // Clean URL first
  const urlMatch = inputUrl.match(/https?:\/\/[a-zA-Z0-9\-\._~:/?#[\]@!$&'()*+,;=%]+/);
  if (!urlMatch) {
    throw new Error("No URL found in the provided text");
  }
  let targetUrl = urlMatch[0];
  targetUrl = targetUrl.replace(/[.,;:!)]+$/, "");

  // Generate the canonical storage key from the target URL (the share link)
  const storageKey = generateStorageKey(targetUrl);

  for (const parser of parsers) {
    if (parser.canHandle(targetUrl)) {
      try {
        const metadata = await parser.parse(targetUrl);
        // Attach the key derived from the source URL
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
