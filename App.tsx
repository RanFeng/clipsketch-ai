
import React, { useState, useEffect } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { TagList } from './components/TagList';
import { ArtGallery } from './components/ArtGallery';
import { Tag } from './types';
import { generateId, extractWebVideoUrl } from './utils';
import { Upload, Film, Link as LinkIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from './components/Button';
import { StorageService } from './services/storage';

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  const [videoDuration, setVideoDuration] = useState<number>(0);
  // Metadata states
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [videoContent, setVideoContent] = useState<string | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  
  // URL Import State
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Tag persistence state
  const [hasLoadedTags, setHasLoadedTags] = useState(false);

  // Cleanup Object URL when file changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      setStorageKey(`local-${videoFile.name}-${videoFile.size}`);
      
      setVideoDuration(0); // Reset duration, let player determine it from metadata
      setVideoTitle(videoFile.name);
      setVideoContent(null);
      setTags([]); // Clear tags for new video
      setHasLoadedTags(true); // Local files logic
      setImportUrl(''); // Clear import url
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  // Load Tags from Storage when StorageKey changes
  useEffect(() => {
    if (storageKey) {
      setHasLoadedTags(false);
      StorageService.getProject(storageKey).then((project) => {
        if (project && project.tags && project.tags.length > 0) {
          setTags(project.tags);
        } else {
          setTags([]);
        }
        setHasLoadedTags(true);
      });
    } else if (!videoFile) {
      // If cleared
      setHasLoadedTags(true);
    }
  }, [storageKey, videoFile]);

  // Auto-save Tags to Storage
  useEffect(() => {
    if (hasLoadedTags && storageKey) {
      // Debounce could be added here if needed, but for now direct update is fine
      StorageService.updateProject(storageKey, { tags });
    }
  }, [tags, hasLoadedTags, storageKey]);

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    setIsImporting(true);
    setImportError(null);
    setVideoFile(null); // Clear previous file if any

    try {
      const result = await extractWebVideoUrl(importUrl);
      setVideoUrl(result.url);
      // Use the canonical key from metadata, or fallback to url if missing
      setStorageKey(result.storageKey || result.url);
      
      // Store metadata
      if (result.duration) setVideoDuration(result.duration);
      else setVideoDuration(0);
      
      setVideoTitle(result.title || "Untitled Video");
      setVideoContent(result.content || null);

      setTags([]);
      setImportUrl('');
      // hasLoadedTags will be handled by the useEffect on storageKey
    } catch (err: any) {
      setImportError(err.message || '导入视频失败');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddTag = (timestamp: number) => {
    const newTag: Tag = {
      id: generateId(),
      timestamp,
      createdAt: Date.now(),
    };
    setTags(prev => [...prev, newTag]);
  };

  const handleRemoveTag = (id: string) => {
    setTags(prev => prev.filter(tag => tag.id !== id));
  };

  const handleImportTags = (importedTags: Tag[]) => {
    setTags(prev => [...prev, ...importedTags]);
  };

  const handleJumpToTag = (timestamp: number) => {
    // Dispatch custom event that VideoPlayer listens to
    const event = new CustomEvent('jump-to-timestamp', { detail: timestamp });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-950 overflow-hidden relative">
      {/* Main Content Area (Video) 
          Mobile: Takes 55% height for vertical video optimization.
          Desktop: Takes remaining width (flex-1).
      */}
      <div className="flex-1 flex flex-col h-[55vh] lg:h-full min-w-0 shrink-0 lg:shrink-1 border-b lg:border-b-0 lg:border-r border-slate-800">
        
        {/* Header - Compact Version */}
        <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 bg-slate-950 shrink-0 z-20 relative">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight truncate">ClipSketch AI</h1>
            <p className="text-slate-500 text-xs hidden sm:block truncate">将视频瞬间转化为手绘故事</p>
          </div>
        </header>

        {/* Video Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
          {videoUrl ? (
            <VideoPlayer 
              src={videoUrl} 
              onTag={handleAddTag} 
              overrideDuration={videoDuration > 0 ? videoDuration : undefined}
            />
          ) : (
            <div className="max-w-2xl w-full mx-4 overflow-y-auto max-h-full py-4 custom-scrollbar">
               {/* URL Import (Primary Interface) */}
               <div className="p-6 md:p-8 border border-slate-800 rounded-2xl bg-slate-900 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                  
                  <div className="mb-6">
                     <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                         <LinkIcon className="w-5 h-5" />
                       </div>
                       <h3 className="text-xl md:text-2xl font-semibold text-white">导入视频</h3>
                     </div>
                     <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                       粘贴来自 <span className="text-pink-400 font-medium">小红书</span> 或 <span className="text-blue-400 font-medium">B站 (Bilibili)</span> 的分享链接或文案以开始创作。
                     </p>
                  </div>

                  <form onSubmit={handleUrlImport} className="mt-6">
                     <div className="flex flex-col gap-4">
                       <textarea
                         value={importUrl}
                         onChange={(e) => setImportUrl(e.target.value)}
                         placeholder="在此粘贴链接...&#10;例如：今日份浪漫 http://xhslink.com/...&#10;或 https://www.bilibili.com/video/BV..."
                         className="w-full h-24 md:h-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm md:text-base font-normal custom-scrollbar"
                         autoFocus
                       />
                       
                       <Button 
                          type="submit"
                          disabled={isImporting || !importUrl.trim()}
                          className="w-full h-12 md:h-14 text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-none shadow-lg shadow-indigo-500/20 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                          {isImporting ? (
                            <span className="flex items-center gap-2">
                               <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                               正在解析...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              导入视频 <ArrowRight className="w-5 h-5" />
                            </span>
                          )}
                       </Button>
                     </div>
                     
                     {importError && (
                       <div className="mt-4 p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                         <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                         <span className="leading-relaxed">{importError}</span>
                       </div>
                     )}
                  </form>
               </div>
            </div>
          )}
          
          {/* File Switcher Overlay (When video is loaded) */}
          {videoUrl && (
            <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 flex-col items-start">
               <button 
                 onClick={() => {
                   setVideoUrl(null);
                   setStorageKey(null);
                   setVideoFile(null);
                   setImportUrl('');
                   setVideoDuration(0);
                 }}
                 className="cursor-pointer bg-slate-900/80 backdrop-blur text-xs text-white px-3 py-1.5 rounded-full border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 transition-colors flex items-center gap-2 shadow-lg"
               >
                 <Upload className="w-3 h-3" />
                 打开新视频
               </button>
               {videoTitle && (
                  <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-300 border border-slate-800 max-w-[200px] truncate">
                    {videoTitle}
                  </div>
               )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Tag List 
          Mobile: Takes remaining height (45vh approx).
          Desktop: Fixed width 24rem (96) for better info display.
      */}
      <div className="h-[45vh] lg:h-full lg:w-96 shrink-0 bg-slate-900">
        <TagList 
          tags={tags} 
          videoUrl={videoUrl}
          onRemoveTag={handleRemoveTag} 
          onJumpToTag={handleJumpToTag}
          onClearTags={() => setTags([])}
          onGenerateArt={() => setShowGallery(true)}
          onImportTags={handleImportTags}
        />
      </div>

      {/* Art Gallery Overlay */}
      {showGallery && videoUrl && storageKey && (
        <ArtGallery 
          tags={tags} 
          videoUrl={videoUrl}
          projectId={storageKey}
          videoTitle={videoTitle || undefined}
          videoContent={videoContent || undefined}
          onClose={() => setShowGallery(false)} 
        />
      )}
    </div>
  );
}
