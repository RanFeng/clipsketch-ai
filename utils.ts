
import JSZip from 'jszip';
import { Tag } from './types';
import { parseVideoUrl } from './services/parsers';

export const formatTime = (seconds: number, includeMs: boolean = false): string => {
  if (isNaN(seconds)) return includeMs ? "00:00.000" : "00:00";
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');

  let timeStr = `${mStr}:${sStr}`;

  if (h > 0) {
    const hStr = h.toString().padStart(2, '0');
    timeStr = `${hStr}:${mStr}:${sStr}`;
  }
  
  if (includeMs) {
    const ms = Math.floor((seconds % 1) * 1000);
    const msStr = ms.toString().padStart(3, '0');
    return `${timeStr}.${msStr}`;
  }
  
  return timeStr;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export interface VideoMetadata {
  url: string;
  storageKey?: string; // Standardized key for caching (e.g., domain.com/path)
  duration?: number;
  title?: string;
  content?: string;
}

// Redirects to the new parser service
export const extractWebVideoUrl = async (input: string): Promise<VideoMetadata> => {
  return parseVideoUrl(input);
};

/**
 * Helper to capture frames and return them as an array of data objects.
 * Used for both Zip export and AI generation.
 * @param scaleFactor - Resize the output image (0.5 = half width/height). Default is 1 (original size).
 */
export const captureFramesAsBase64 = async (
  videoSrc: string,
  tags: Tag[],
  onProgress?: (count: number, total: number) => void,
  scaleFactor: number = 1
): Promise<{ tagId: string; timestamp: number; data: string }[]> => {
  if (!tags.length) return [];

  const video = document.createElement('video');
  
  // IMPORTANT: For Bilibili direct links, we MUST use a proxy to get CORS headers
  // otherwise canvas.toDataURL will fail (tainted canvas).
  const isBilibiliDirect = videoSrc.includes('.bilivideo.com') || videoSrc.includes('hdslb.com');
  const isInstagramDirect = videoSrc.includes('instagram.com') || videoSrc.includes('cdninstagram.com');
  
  if ((isBilibiliDirect || isInstagramDirect) && !videoSrc.includes('corsproxy.io')) {
    // Wrap in proxy strictly for the purpose of capturing frames
    video.src = `https://corsproxy.io/?${encodeURIComponent(videoSrc)}`;
  } else {
    video.src = videoSrc;
  }

  video.crossOrigin = "anonymous"; // Essential for canvas export
  video.muted = true;
  video.playsInline = true;

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () => reject(new Error("Failed to load video for capture (CORS or Network error)"));
    video.load();
  });

  const canvas = document.createElement('canvas');
  // Apply scaling to canvas dimensions
  canvas.width = Math.floor(video.videoWidth * scaleFactor);
  canvas.height = Math.floor(video.videoHeight * scaleFactor);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not create canvas context");

  // Sort tags by time to optimize seeking
  const sortedTags = [...tags].sort((a, b) => a.timestamp - b.timestamp);
  const results: { tagId: string; timestamp: number; data: string }[] = [];

  for (let i = 0; i < sortedTags.length; i++) {
    const tag = sortedTags[i];
    if (onProgress) onProgress(i + 1, sortedTags.length);

    video.currentTime = tag.timestamp;

    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      setTimeout(resolve, 8000); // Generous timeout for proxy loading
      video.addEventListener('seeked', onSeeked, { once: true });
    });

    try {
      // Draw scaled image
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      results.push({ tagId: tag.id, timestamp: tag.timestamp, data: base64 });
    } catch (e) {
      console.warn(`Frame capture failed at ${tag.timestamp}s`, e);
      // Skip failed frames but continue
    }
  }

  return results;
};

export const exportVideoFrames = async (
  videoSrc: string, 
  tags: Tag[], 
  onProgress: (count: number, total: number) => void
): Promise<Blob | null> => {
  // Use full resolution (scaleFactor = 1) for user exports
  const frames = await captureFramesAsBase64(videoSrc, tags, onProgress, 1);
  if (!frames.length) return null;

  const zip = new JSZip();
  
  frames.forEach(frame => {
    // Remove data URL prefix for zip
    const base64Data = frame.data.split(',')[1];
    const timeStr = formatTime(frame.timestamp, true).replace(/:/g, '-').replace('.', '_');
    zip.file(`frame_${timeStr}.jpg`, base64Data, { base64: true });
  });

  return await zip.generateAsync({ type: "blob" });
};
