
import { VideoMetadata } from '../../utils';

export interface VideoParser {
  name: string;
  canHandle(url: string): boolean;
  parse(url: string): Promise<VideoMetadata>;
}

const PROXY_BASE = 'https://inkmaster.ace-kid.workers.dev/';

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

// --- Instagram Parser (Cobalt API) ---
class InstagramParser implements VideoParser {
  name = 'Instagram';

  canHandle(url: string): boolean {
    return url.includes('instagram.com');
  }

  async parse(url: string): Promise<VideoMetadata> {
    console.log(`Instagram: Parsing via Cobalt API...`);
    
    // Cobalt API often changes or requires specific headers, 
    // keeping the logic from original utils.ts
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        vQuality: 'max',
        filenamePattern: 'basic',
        isAudioOnly: false
      })
    });

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.text || "Instagram parsing failed");
    }

    if (data.url) {
      return {
        url: data.url,
        title: "Instagram Reel",
        content: "Imported from Instagram",
        duration: undefined 
      };
    } else if (data.picker && data.picker.length > 0) {
      const firstVideo = data.picker.find((item: any) => item.type === 'video');
      if (firstVideo && firstVideo.url) {
         return {
           url: firstVideo.url,
           title: "Instagram Post",
           content: "Imported from Instagram"
         };
      }
    }
    
    throw new Error("No video found in Instagram link");
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

    // 1. Meta Tag Extraction
    const titleMatch = html.match(/<meta (?:name|property)="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) result.title = titleMatch[1];

    const descMatch = html.match(/<meta (?:name|property)="og:description" content="([^"]+)"/i) || html.match(/<meta name="description" content="([^"]+)"/i);
    if (descMatch && descMatch[1]) result.content = descMatch[1];

    // 2. XHS Specific JSON
    if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
       const jsonTitleMatch = html.match(/"title":"((?:[^"\\]|\\.)*)"/);
       if (jsonTitleMatch && jsonTitleMatch[1]) {
          try { result.title = JSON.parse(`"${jsonTitleMatch[1]}"`); } catch(e) {}
       }
       const jsonDescMatch = html.match(/"desc":"((?:[^"\\]|\\.)*)"/);
       if (jsonDescMatch && jsonDescMatch[1]) {
          try { result.content = JSON.parse(`"${jsonDescMatch[1]}"`); } catch(e) {}
       }
    }

    // 3. Video URL Extraction
    // XHS
    const xhsVideoMatch = html.match(/<meta (?:name|property)="og:video" content="([^"]+)"/i);
    if (xhsVideoMatch && xhsVideoMatch[1]) {
      result.url = xhsVideoMatch[1];
      return result;
    }
    const xhsJsonMatch = html.match(/"masterUrl":"([^"]+)"/);
    if (xhsJsonMatch && xhsJsonMatch[1]) {
      result.url = xhsJsonMatch[1].replace(/\\u002F/g, "/").replace(/\\/g, "");
      return result;
    }

    // Generic/IG Fallback
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
    if (ogVideoMatch && ogVideoMatch[1]) {
      result.url = ogVideoMatch[1].replace(/&amp;/g, '&');
      return result;
    }

    throw new Error("Could not find video stream. Please check if the link is valid.");
  }
}

// Registry
const parsers: VideoParser[] = [
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
  // This happens BEFORE parsing resolves it to a CDN link
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
        // If it was a specific parser (not generic), allow falling back to Generic?
        if (parser.name !== 'Generic') {
          continue;
        }
        throw e;
      }
    }
  }
  throw new Error("No parser could handle this URL");
}
