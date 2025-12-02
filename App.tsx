
import React, { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { TagList } from './components/TagList';
import { ArtGallery } from './components/ArtGallery';
import { Tag } from './types';
import { generateId, extractWebVideoUrl } from './utils';
import { Upload, Film, Link as LinkIcon, AlertCircle, ArrowRight, Home, Edit2, ArrowLeft, RefreshCw, FileVideo } from 'lucide-react';
import { Button } from './components/Button';
import { StorageService, ProjectState } from './services/storage';
import { ProjectList } from './components/ProjectList';

export default function App() {
  // Project State
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Untitled Project');
  const [projectList, setProjectList] = useState<ProjectState[]>([]);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Restoration State
  const [sourceType, setSourceType] = useState<'local' | 'web'>('local');
  const [originalSource, setOriginalSource] = useState<string>('');
  const [isVideoMissing, setIsVideoMissing] = useState(false);
  const [isReloaderLoading, setIsReloaderLoading] = useState(false);

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

  // Loading State
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);

  // 1. Init: Check URL for projectId
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('projectId');
    if (pid) {
      loadProject(pid);
    } else {
      // Load recent projects
      refreshProjectList();
    }
  }, []);

  const refreshProjectList = async () => {
    const list = await StorageService.getAllProjects();
    setProjectList(list);
  };

  // 2. Load Project Logic with Smart Restore
  const loadProject = async (id: string) => {
    setIsLoadingProject(true);
    setIsVideoMissing(false);
    try {
      const project = await StorageService.getProject(id);
      if (project) {
        setProjectId(project.id);
        setProjectName(project.name || '未命名项目');
        setTags(project.tags || []);
        setVideoTitle(project.name);
        setVideoContent(project.contextDescription || null);
        
        setSourceType(project.sourceType || 'local');
        setOriginalSource(project.originalSource || '');

        // Smart Video Restoration Logic
        if (project.sourceType === 'web') {
             // For Web: Always try to use existing URL first, but be ready to reload
             // Actually, web links (Bili/XHS) expire fast. Let's try to reload automatically if it's a web source.
             console.log("Restoring Web Project, attempting to refresh link...");
             try {
                // Optimistically set the old URL first so user sees something (if valid)
                // But generally we want to refresh.
                setIsReloaderLoading(true);
                const metadata = await extractWebVideoUrl(project.originalSource);
                setVideoUrl(metadata.url);
                // Update DB with fresh URL
                await StorageService.updateProject(project.id, { videoUrl: metadata.url });
             } catch (e) {
                console.warn("Auto-refresh of web link failed, prompting user retry", e);
                setIsVideoMissing(true);
                setVideoUrl(null); // Clear invalid URL
             } finally {
                setIsReloaderLoading(false);
             }

        } else {
             // For Local: Check if Blob is in DB
             if (project.videoBlob) {
                 console.log("Restoring Local Project from Cached Blob...");
                 const url = URL.createObjectURL(project.videoBlob);
                 setVideoUrl(url);
             } else {
                 console.warn("Local project missing blob.");
                 setVideoUrl(null);
                 setIsVideoMissing(true);
             }
        }

        // Update URL
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('projectId', project.id);
            window.history.replaceState({ path: url.toString() }, '', url.toString());
        } catch (err) {
            console.debug("History API restricted:", err);
        }
      } else {
        console.warn("Project not found");
        setProjectId(null);
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('projectId');
            window.history.replaceState({ path: url.toString() }, '', url.toString());
        } catch (err) {}
        refreshProjectList();
      }
    } catch (e) {
      console.error("Failed to load project", e);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleCreateProject = async (
      url: string, 
      name: string, 
      type: 'local' | 'web',
      source: string,
      metadata: any = {},
      blob?: Blob
  ) => {
      const newId = generateId();
      const newProject: ProjectState = {
          id: newId,
          name: name,
          videoUrl: url,
          sourceType: type,
          originalSource: source,
          videoBlob: blob, // Store blob if local
          lastUpdated: Date.now(),
          tags: [],
          activeStrategyId: null,
          sourceFrames: [],
          stepDescriptions: [],
          baseArt: null,
          generatedArt: null,
          avatarImage: null,
          watermarkText: '',
          panelCount: 0,
          subPanels: [],
          captionOptions: [],
          selectedCaption: null,
          coverImage: null,
          workflowStep: 'input',
          contextDescription: metadata.content || '',
          customPrompt: '',
          batchJobId: null,
          batchStatus: 'idle',
          viewStep: 1
      };

      await StorageService.saveProject(newProject);
      // Directly set state instead of reloading to avoid double-fetch
      setProjectId(newId);
      setProjectName(name);
      setVideoUrl(url);
      setTags([]);
      setSourceType(type);
      setOriginalSource(source);
      setVideoContent(metadata.content || '');
      setIsVideoMissing(false);
      
      try {
        const pageUrl = new URL(window.location.href);
        pageUrl.searchParams.set('projectId', newId);
        window.history.pushState({ path: pageUrl.toString() }, '', pageUrl.toString());
      } catch(e) {}
  };

  const handleBackToDashboard = () => {
    setProjectId(null);
    setVideoUrl(null);
    setTags([]);
    setVideoFile(null);
    setImportUrl('');
    setIsVideoMissing(false);
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('projectId');
        window.history.pushState({ path: url.toString() }, '', url.toString());
    } catch (err) {}
    refreshProjectList();
  };

  const handleDeleteProject = async (id: string) => {
      await StorageService.deleteProject(id);
      refreshProjectList();
  };

  // 3. Name Editing
  const handleNameSave = () => {
      setIsEditingName(false);
      if (projectId && projectName.trim()) {
          StorageService.updateProject(projectId, { name: projectName });
      }
  };

  useEffect(() => {
      if (isEditingName && nameInputRef.current) {
          nameInputRef.current.focus();
      }
  }, [isEditingName]);


  // 4. Import Handlers
  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await extractWebVideoUrl(importUrl);
      const name = result.title || `Web Video ${new Date().toLocaleTimeString()}`;
      
      await handleCreateProject(
          result.url, 
          name, 
          'web', 
          importUrl, // Keep original user input as source
          result
      );

      setImportUrl('');
    } catch (err: any) {
      setImportError(err.message || '导入视频失败');
    } finally {
      setIsImporting(false);
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      handleCreateProject(
          url, 
          file.name, 
          'local', 
          file.name,
          {},
          file // Pass the file object (which is a Blob)
      );
      e.target.value = ''; 
    }
  };

  // 5. Recovery Handlers
  const handleRetryWebLoad = async () => {
      if (!projectId || !originalSource) return;
      
      setIsReloaderLoading(true);
      try {
          const metadata = await extractWebVideoUrl(originalSource);
          setVideoUrl(metadata.url);
          setIsVideoMissing(false);
          await StorageService.updateProject(projectId, { videoUrl: metadata.url });
      } catch (e) {
          alert("重试失败，请检查链接是否有效或网络连接。");
      } finally {
          setIsReloaderLoading(false);
      }
  };

  const handleReuploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && projectId) {
          const url = URL.createObjectURL(file);
          setVideoUrl(url);
          setIsVideoMissing(false);
          // Update DB - intentionally do not overwrite name/tags, just the video
          StorageService.updateProject(projectId, { 
              videoUrl: url,
              videoBlob: file
          });
      }
  };

  const handleAddTag = (timestamp: number) => {
    const newTag: Tag = {
      id: generateId(),
      timestamp,
      createdAt: Date.now(),
    };
    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    if (projectId) {
        StorageService.updateProject(projectId, { tags: updatedTags });
    }
  };

  const handleRemoveTag = (id: string) => {
    const updatedTags = tags.filter(tag => tag.id !== id);
    setTags(updatedTags);
    if (projectId) {
        StorageService.updateProject(projectId, { tags: updatedTags });
    }
  };

  const handleImportTags = (importedTags: Tag[]) => {
    const updatedTags = [...tags, ...importedTags];
    setTags(updatedTags);
    if (projectId) {
        StorageService.updateProject(projectId, { tags: updatedTags });
    }
  };

  const handleJumpToTag = (timestamp: number) => {
    const event = new CustomEvent('jump-to-timestamp', { detail: timestamp });
    window.dispatchEvent(event);
  };

  const updateProjectName = (newName: string) => {
      setProjectName(newName);
  };

  // --- RENDER ---

  // 1. Dashboard View
  if (!projectId) {
      return (
        <div className="min-h-screen bg-slate-950 text-white overflow-y-auto custom-scrollbar">
            {/* Simple Header */}
            <header className="px-6 py-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50 sticky top-0 z-20 backdrop-blur">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <Film className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">ClipSketch AI</h1>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Import/Create Section */}
                <div className="max-w-2xl w-full mx-auto">
                    <div className="p-6 md:p-8 border border-slate-800 rounded-2xl bg-slate-900 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                                <LinkIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-semibold text-white">开始新创作</h3>
                            </div>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                            支持 <span className="text-pink-400 font-medium">小红书</span> 或 <span className="text-blue-400 font-medium">Bilibili</span> 链接。
                            </p>
                        </div>

                        <form onSubmit={handleUrlImport} className="mt-6">
                            <div className="flex flex-col gap-4">
                            <textarea
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                placeholder="在此粘贴视频链接..."
                                className="w-full h-20 bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm font-normal custom-scrollbar"
                            />
                            
                            <Button 
                                type="submit"
                                disabled={isImporting || !importUrl.trim()}
                                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-none shadow-lg shadow-indigo-500/20 rounded-xl transition-all"
                            >
                                {isImporting ? (
                                <span className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                    创建项目中...
                                </span>
                                ) : (
                                <span className="flex items-center gap-2">
                                    创建项目 <ArrowRight className="w-5 h-5" />
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

                        <div className="flex items-center gap-4 my-6">
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <span className="text-xs text-slate-500 font-medium">或者</span>
                            <div className="h-px bg-slate-800 flex-1"></div>
                        </div>

                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleLocalFileUpload} 
                            accept="video/*" 
                            className="hidden" 
                        />
                        <Button 
                            type="button"
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-12 border-dashed border-2 border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-800 transition-all"
                        >
                            <Upload className="w-5 h-5 mr-2" />
                            导入本地视频
                        </Button>
                    </div>
                </div>

                {/* Recent Projects List */}
                <ProjectList 
                    projects={projectList}
                    onSelectProject={loadProject}
                    onDeleteProject={handleDeleteProject}
                />
            </div>
        </div>
      );
  }

  // 2. Project Editor View
  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-950 overflow-hidden relative">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[55vh] lg:h-full min-w-0 shrink-0 lg:shrink-1 border-b lg:border-b-0 lg:border-r border-slate-800">
        
        {/* Header - Project Mode */}
        <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 bg-slate-950 shrink-0 z-20 relative justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackToDashboard}
                className="w-8 h-8 text-slate-400 hover:text-white"
                title="返回首页"
             >
                <ArrowLeft className="w-5 h-5" />
             </Button>

             <div className="w-px h-6 bg-slate-800"></div>

             {/* Project Title (Editable) */}
             <div className="flex items-center gap-2 group min-w-0">
                 {isEditingName ? (
                     <input
                        ref={nameInputRef}
                        type="text"
                        value={projectName}
                        onChange={(e) => updateProjectName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                        className="bg-slate-800 text-white px-2 py-1 rounded text-base font-bold outline-none border border-indigo-500 min-w-[200px]"
                     />
                 ) : (
                     <h1 
                        className="text-base lg:text-lg font-bold text-white tracking-tight truncate cursor-pointer hover:text-indigo-300 transition-colors flex items-center gap-2"
                        onClick={() => setIsEditingName(true)}
                        title="点击重命名"
                     >
                        {projectName}
                        <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50" />
                     </h1>
                 )}
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
                 ID: {projectId?.slice(0,6)}
             </div>
          </div>
        </header>

        {/* Video Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
          {isReloaderLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
                   <div className="text-center">
                       <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                       <p className="text-slate-300 text-sm">正在重新加载视频资源...</p>
                   </div>
              </div>
          )}
          
          {videoUrl && !isVideoMissing ? (
            <VideoPlayer 
              src={videoUrl} 
              onTag={handleAddTag} 
              overrideDuration={videoDuration > 0 ? videoDuration : undefined}
            />
          ) : (
             <div className="text-center text-slate-400 p-8 max-w-md bg-slate-900/50 rounded-xl border border-slate-800">
                 <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                 <p className="text-lg font-medium text-slate-200 mb-2">视频资源失效或丢失</p>
                 
                 {sourceType === 'local' ? (
                     <div className="flex flex-col items-center">
                         <p className="text-sm text-slate-500 mb-4">
                             这是本地文件项目。为了继续编辑，请重新选择原始视频文件。
                         </p>
                         <input 
                             type="file" 
                             ref={reuploadInputRef}
                             onChange={handleReuploadLocal}
                             accept="video/*"
                             className="hidden"
                         />
                         <Button onClick={() => reuploadInputRef.current?.click()}>
                             <FileVideo className="w-4 h-4 mr-2" />
                             重新上传文件
                         </Button>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center">
                         <p className="text-sm text-slate-500 mb-4">
                             原链接已过期或失效。点击下方按钮尝试重新解析分享链接。
                         </p>
                         <Button onClick={handleRetryWebLoad} disabled={isReloaderLoading}>
                             <RefreshCw className={`w-4 h-4 mr-2 ${isReloaderLoading ? 'animate-spin' : ''}`} />
                             重新加载链接
                         </Button>
                         <p className="text-xs text-slate-600 mt-3 break-all px-4">
                             {originalSource}
                         </p>
                     </div>
                 )}
             </div>
          )}
        </div>
      </div>

      {/* Sidebar - Tag List */}
      <div className="h-[45vh] lg:h-full lg:w-96 shrink-0 bg-slate-900">
        <TagList 
          tags={tags} 
          videoUrl={videoUrl}
          onRemoveTag={handleRemoveTag} 
          onJumpToTag={handleJumpToTag}
          onClearTags={() => {
              setTags([]);
              if(projectId) StorageService.updateProject(projectId, { tags: [] });
          }}
          onGenerateArt={() => setShowGallery(true)}
          onImportTags={handleImportTags}
        />
      </div>

      {/* Art Gallery Overlay */}
      {showGallery && projectId && (
        <ArtGallery 
          tags={tags} 
          videoUrl={videoUrl || ''} // Fallback for safety, though frames likely cached in project
          projectId={projectId} // Pass Project ID for persistence
          videoTitle={projectName}
          videoContent={videoContent || undefined}
          onClose={() => setShowGallery(false)} 
        />
      )}
    </div>
  );
}
