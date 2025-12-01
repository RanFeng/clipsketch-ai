
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tag } from '../types';
import { captureFramesAsBase64 } from '../utils';
import { GeminiService, CaptionOption, SubPanel, FrameData } from '../services/gemini';
import { ProviderType } from '../services/llm';
import { Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { SocialPlatformStrategy, getStrategy } from '../services/strategies';
import { StorageService, ProjectState } from '../services/storage';

// Import New Split Components
import { PlatformSelector } from './art/PlatformSelector';
import { Header } from './art/Header';
import { Sidebar } from './art/Sidebar';
import { Step1Input } from './art/steps/Step1Input';
import { Step2Base } from './art/steps/Step2Base';
import { Step4Final } from './art/steps/Step4Final';
import { Step5Refine } from './art/steps/Step5Refine';
import { Step6Cover } from './art/steps/Step6Cover'; // Imported Step 6
import { WorkflowStep } from './art/types';

interface ArtGalleryProps {
  tags: Tag[];
  videoUrl: string; // Used for frame capture
  projectId: string; // Used as storage key (normalized ID)
  videoTitle?: string;
  videoContent?: string;
  onClose: () => void;
}

export const ArtGallery: React.FC<ArtGalleryProps> = ({ tags, videoUrl, projectId, videoTitle, videoContent, onClose }) => {
  // Strategy Selection State
  const [activeStrategy, setActiveStrategy] = useState<SocialPlatformStrategy | null>(null);

  const [sourceFrames, setSourceFrames] = useState<FrameData[]>([]);
  
  const [baseArt, setBaseArt] = useState<string | null>(null); 
  const [generatedArt, setGeneratedArt] = useState<string | null>(null); 
  
  // Load from localStorage for global persistence
  const [avatarImage, setAvatarImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem('last_avatar_image');
    } catch (e) {
      return null;
    }
  }); 
  const [watermarkText, setWatermarkText] = useState<string>(() => {
    return localStorage.getItem('last_watermark_text') || '';
  });
  
  // Refine Mode State
  const [panelCount, setPanelCount] = useState<number>(0);
  const [subPanels, setSubPanels] = useState<SubPanel[]>([]);
  
  // BATCH STATE
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');

  // Caption & Cover State
  const [captionOptions, setCaptionOptions] = useState<CaptionOption[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<CaptionOption | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  // Step Analysis State
  const [stepDescriptions, setStepDescriptions] = useState<string[]>([]);
  const [isAnalyzingSteps, setIsAnalyzingSteps] = useState(false);

  // Editable Context State
  const [contextDescription, setContextDescription] = useState(videoContent || '');

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });

  const [baseUrl, setBaseUrl] = useState(() => {
    return localStorage.getItem('gemini_base_url') || '';
  });
  
  const [useThinking, setUseThinking] = useState(() => {
    return localStorage.getItem('gemini_use_thinking') === 'true';
  });

  const [useBatch, setUseBatch] = useState(() => {
    // Default to false. Only true if explicitly set to 'true'.
    return localStorage.getItem('gemini_use_batch') === 'true';
  });

  const [provider, setProvider] = useState<ProviderType>(() => {
    return (localStorage.getItem('llm_provider') as ProviderType) || 'google';
  });

  const [showSettings, setShowSettings] = useState(false);

  const [customPrompt, setCustomPrompt] = useState('');
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('input');
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Controls which step is expanded in Sidebar AND which view is shown on right
  const [viewStep, setViewStep] = useState<number>(1);

  // State restoration flag
  const [isRestoring, setIsRestoring] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Restore State from IndexedDB on Init using projectId
  useEffect(() => {
    const restoreState = async () => {
      setIsRestoring(true);
      try {
        const savedProject = await StorageService.getProject(projectId);
        if (savedProject) {
          console.log("Found saved project for:", projectId);
          
          if (savedProject.activeStrategyId) {
            try {
              const strategy = getStrategy(savedProject.activeStrategyId);
              setActiveStrategy(strategy);
            } catch (e) { console.warn("Saved strategy not found"); }
          }

          setSourceFrames(savedProject.sourceFrames || []);
          setStepDescriptions(savedProject.stepDescriptions || []);
          setBaseArt(savedProject.baseArt || null);
          setGeneratedArt(savedProject.generatedArt || null);
          
          if (savedProject.avatarImage !== undefined) {
             setAvatarImage(savedProject.avatarImage);
          }
          if (savedProject.watermarkText !== undefined) {
             setWatermarkText(savedProject.watermarkText);
          }

          setPanelCount(savedProject.panelCount || 0);
          setSubPanels(savedProject.subPanels || []);
          setCaptionOptions(savedProject.captionOptions || []);
          setSelectedCaption(savedProject.selectedCaption || null);
          setCoverImage(savedProject.coverImage || null);
          
          setWorkflowStep(savedProject.workflowStep || 'input');
          setContextDescription(savedProject.contextDescription || '');
          setCustomPrompt(savedProject.customPrompt || '');
          setBatchJobId(savedProject.batchJobId || null);
          setBatchStatus(savedProject.batchStatus as any || 'idle');
          setViewStep(savedProject.viewStep || 1);
        } else {
            console.log("No saved project found, starting fresh.");
        }
      } catch (err) {
        console.error("Failed to restore project:", err);
      } finally {
        setIsRestoring(false);
      }
    };

    if (projectId) {
      restoreState();
    }
  }, [projectId]);

  // 2. Auto-Save State to IndexedDB (Debounced) using updateProject and projectId
  useEffect(() => {
    if (isRestoring) return; // Don't save while restoring

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const stateUpdates: Partial<ProjectState> = {
        videoUrl, // Keep track of current playable URL
        lastUpdated: Date.now(),
        activeStrategyId: activeStrategy?.id || null,
        sourceFrames,
        stepDescriptions,
        baseArt,
        generatedArt,
        avatarImage,
        watermarkText,
        panelCount,
        subPanels,
        captionOptions,
        selectedCaption, // Persist selection
        coverImage,      // Persist cover
        workflowStep,
        contextDescription,
        customPrompt,
        batchJobId,
        batchStatus,
        viewStep
      };
      
      // Use updateProject with projectId
      StorageService.updateProject(projectId, stateUpdates).catch(err => 
        console.error("Auto-save failed:", err)
      );
    }, 1000); // Save after 1 second of inactivity

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    projectId, videoUrl, isRestoring, activeStrategy, sourceFrames, stepDescriptions, 
    baseArt, generatedArt, avatarImage, watermarkText, panelCount, 
    subPanels, captionOptions, selectedCaption, coverImage, workflowStep, contextDescription, 
    customPrompt, batchJobId, batchStatus, viewStep
  ]);
  
  // 3. Initialize gallery by capturing frames (Only if NOT restoring and empty)
  useEffect(() => {
    // Block capture if we are still checking DB or if we already have frames (restored or captured)
    if (isRestoring || sourceFrames.length > 0 || isLoadingFrames || !videoUrl) {
        return;
    }

    const initGallery = async () => {
      try {
          setIsLoadingFrames(true);
          const captured = await captureFramesAsBase64(videoUrl, tags, undefined, 0.5);
          setSourceFrames(captured);
          setPanelCount(captured.length);
      } catch (err) {
          console.error("Failed to capture frames for gallery:", err);
          setError("获取视频帧失败。请确保视频已加载且可访问。");
      } finally {
          setIsLoadingFrames(false);
      }
    };
    initGallery();
  }, [tags, videoUrl, isRestoring, sourceFrames.length, isLoadingFrames]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_base_url', baseUrl);
    localStorage.setItem('gemini_use_thinking', String(useThinking));
    localStorage.setItem('gemini_use_batch', String(useBatch));
    localStorage.setItem('llm_provider', provider);
  }, [apiKey, baseUrl, useThinking, useBatch, provider]);

  useEffect(() => {
    try {
      if (avatarImage) {
        localStorage.setItem('last_avatar_image', avatarImage);
      } else {
        localStorage.removeItem('last_avatar_image');
      }
    } catch (e) {
      console.warn("Failed to save avatar to localStorage (quota exceeded?)", e);
    }
  }, [avatarImage]);

  useEffect(() => {
    localStorage.setItem('last_watermark_text', watermarkText);
  }, [watermarkText]);

  useEffect(() => {
    if (videoContent && !contextDescription) setContextDescription(videoContent);
  }, [videoContent]);

  useEffect(() => {
    if (activeStrategy && !customPrompt) {
      setCustomPrompt(activeStrategy.defaultImagePrompt);
    }
  }, [activeStrategy]);

  const handleCopyCaption = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBatchDownload = async () => {
    const completedPanels = subPanels.filter(p => p.status === 'completed' && p.imageUrl);
    if (completedPanels.length === 0) return;

    const zip = new JSZip();
    completedPanels.forEach(p => {
        const base64Data = p.imageUrl!.split(',')[1];
        zip.file(`panel_${p.index + 1}.png`, base64Data, { base64: true });
    });
    
    // Add Cover if exists
    if (coverImage) {
        const coverData = coverImage.split(',')[1];
        zip.file(`cover_image.png`, coverData, { base64: true });
    }
    
    // Add Caption if selected
    if (selectedCaption) {
        zip.file('caption.txt', `${selectedCaption.title}\n\n${selectedCaption.content}`);
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_assets_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Batch download failed", e);
      alert("打包下载失败");
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImage(reader.result as string);
        if (workflowStep === 'base_generated') {
          setWorkflowStep('avatar_mode');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleError = (err: any) => {
    setError(err.message || "发生未知错误。");
  };

  // Step 1: Analyze Frames
  const handleAnalyzeSteps = async () => {
    if (sourceFrames.length === 0 || !activeStrategy) return;
    
    // RESET FUTURE STEPS
    setStepDescriptions([]);
    setBaseArt(null);
    setGeneratedArt(null);
    setSubPanels([]);
    setCaptionOptions([]);
    setSelectedCaption(null);
    setCoverImage(null);
    setWorkflowStep('input');
    
    setViewStep(1);

    setIsAnalyzingSteps(true);
    setError(null);
    
    try {
      const steps = await GeminiService.analyzeSteps(
        apiKey,
        baseUrl,
        sourceFrames,
        contextDescription,
        activeStrategy,
        useThinking,
        provider
      );
      setStepDescriptions(steps);
      setViewStep(2);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsAnalyzingSteps(false);
    }
  };

  // Step 2: Generate Base Storyboard
  const handleGenerateBase = async () => {
    if (sourceFrames.length === 0 || !activeStrategy) {
      setError("没有可处理的图片帧。");
      return;
    }

    // RESET FUTURE STEPS
    setSubPanels([]);
    setCaptionOptions([]);
    setSelectedCaption(null);
    setCoverImage(null);
    setBaseArt(null);
    setGeneratedArt(null);
    
    setViewStep(2);
    
    setIsGeneratingImage(true);
    setError(null);
    
    try {
      const img = await GeminiService.generateBaseImage(
        apiKey,
        baseUrl,
        sourceFrames,
        stepDescriptions,
        customPrompt,
        contextDescription,
        activeStrategy,
        useThinking,
        provider
      );
      setBaseArt(img);
      setGeneratedArt(img);
      setWorkflowStep('base_generated');
      setViewStep(3);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Step 3: Integrate Character
  const handleIntegrateCharacter = async () => {
    if (!baseArt || !avatarImage) {
      setError("缺少基础绘图或形象图片。");
      return;
    }

    setSubPanels([]);
    setViewStep(3);
    
    setIsGeneratingImage(true);
    setError(null);
    
    try {
      const img = await GeminiService.integrateCharacter(
        apiKey, 
        baseUrl,
        baseArt, 
        avatarImage,
        useThinking,
        provider,
        watermarkText
      );
      setGeneratedArt(img);
      setWorkflowStep('final_generated');
      setViewStep(4);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSkipCharacter = () => {
    if (baseArt) {
      setGeneratedArt(baseArt);
      setWorkflowStep('final_generated');
      setViewStep(4);
    }
  };

  // Step 4: Refine Mode Logic
  const handleStartRefine = async () => {
      const initialStatus = useBatch ? 'pending' : 'generating';
      const panels: SubPanel[] = Array.from({ length: panelCount }, (_, i) => ({
          index: i,
          imageUrl: null,
          status: initialStatus
      }));
      setSubPanels(panels);
      setWorkflowStep('refine_mode');
      setViewStep(4); 
      
      if (useBatch) {
        await handleBatchRequest(panels);
      } else {
        // Parallel individual requests
        panels.forEach(p => processPanelGeneration(p.index, false));
      }
  };

  const handleBatchRequest = async (panelsToProcess: SubPanel[]) => {
      if (!generatedArt) return;

      setSubPanels(prev => prev.map(p => 
          panelsToProcess.some(target => target.index === p.index) 
          ? { ...p, status: 'generating' } 
          : p
      ));
      
      setBatchStatus('pending');
      setBatchJobId(null);
      setError(null);

      try {
        const batchInputs = panelsToProcess.map(panel => ({
            index: panel.index,
            stepDescription: stepDescriptions[panel.index] || '',
            originalFrame: sourceFrames[panel.index] || null
        }));

        const { jobId } = await GeminiService.refinePanelsBatch(
            apiKey,
            baseUrl,
            batchInputs,
            panelCount,
            contextDescription,
            generatedArt,
            avatarImage,
            useThinking,
            provider,
            watermarkText
        );

        setBatchJobId(jobId);
        setBatchStatus('pending');

      } catch (err) {
          console.error(`Batch generation error:`, err);
          setBatchStatus('failed');
          setError("批量任务提交失败。");
           setSubPanels(prev => prev.map(p => 
            panelsToProcess.some(target => target.index === p.index) 
            ? { ...p, status: 'error' } 
            : p
        ));
      }
  };

  const handleRefreshBatch = async () => {
    if (!batchJobId) return;

    try {
      const result = await GeminiService.checkBatchStatus(apiKey, baseUrl, batchJobId, provider);
      
      if (result.status === 'completed') {
        setBatchStatus('completed');
        
        // Update panels
        setSubPanels(prev => {
            const newPanels = [...prev];
            const resultMap = new Map(result.results?.map(r => [r.index, r]) || []);
            
            return newPanels.map(p => {
                const res = resultMap.get(p.index);
                if (res) {
                    return {
                        ...p,
                        imageUrl: res.image,
                        status: res.image ? 'completed' : 'error'
                    };
                }
                // If the batch is definitively COMPLETED, any panel still marked 'generating' 
                // that wasn't in the results has failed.
                if (p.status === 'generating') {
                    return { ...p, status: 'error' };
                }
                return p;
            });
        });
        
      } else if (result.status === 'failed') {
        setBatchStatus('failed');
        setError("批量任务执行失败或已过期。");
        // Reset generating panels to error so they stop spinning
        setSubPanels(prev => prev.map(p => 
             p.status === 'generating' ? { ...p, status: 'error' } : p
        ));
      } else {
        setBatchStatus('pending');
      }

    } catch (err) {
      console.error("Failed to check batch status", err);
      setError("检查任务状态失败。");
    }
  };

  const handleRecoverBatch = (jobId: string) => {
    if (!jobId.trim()) return;
    setBatchJobId(jobId);
    setBatchStatus('pending');
    // We set workflow to refine mode so UI shows panels (though they might be empty initially)
    if (subPanels.length === 0) {
        // Initialize dummy panels if recovering from scratch
        const panels: SubPanel[] = Array.from({ length: panelCount || 10 }, (_, i) => ({
          index: i,
          imageUrl: null,
          status: 'generating'
        }));
        setSubPanels(panels);
    } else {
         // Set pending panels to generating
         setSubPanels(prev => prev.map(p => p.status === 'pending' || p.status === 'error' ? {...p, status: 'generating'} : p));
    }
    setWorkflowStep('refine_mode');
    setViewStep(4);
    
    // Trigger check immediately
    setTimeout(() => handleRefreshBatch(), 100);
  };

  const processPanelGeneration = async (index: number, setGeneratingStatus: boolean = true) => {
      if (!generatedArt) return;

      if (setGeneratingStatus) {
        setSubPanels(prev => prev.map(p => 
            p.index === index ? { ...p, status: 'generating' } : p
        ));
      }
      
      try {
          const imageUrl = await GeminiService.refinePanel(
            apiKey,
            baseUrl,
            index,
            panelCount,
            stepDescriptions[index] || '',
            contextDescription,
            generatedArt,
            sourceFrames[index] || null,
            avatarImage,
            useThinking,
            provider,
            watermarkText
          );

          setSubPanels(prev => prev.map(p => 
              p.index === index ? { ...p, status: 'completed', imageUrl } : p
          ));
      } catch (err: any) {
          console.error("Single panel generation failed", err);
          setSubPanels(prev => prev.map(p => 
              p.index === index ? { ...p, status: 'error' } : p
          ));
          if (setGeneratingStatus) {
            setError("单图生成失败: " + (err.message || "未知错误"));
          }
      }
  };

  const generateSinglePanel = (index: number) => processPanelGeneration(index, true);

  // Step 5: Generate Captions
  const handleGenerateCaption = async () => {
    if (!activeStrategy) return;

    setIsGeneratingCaptions(true);
    setError(null);
    setCaptionOptions([]);
    setSelectedCaption(null);
    setViewStep(5);

    try {
      const refinedImages = subPanels
        .filter(p => p.status === 'completed' && p.imageUrl)
        .map(p => p.imageUrl as string);

      const options = await GeminiService.generateCaptions(
        apiKey,
        baseUrl,
        activeStrategy,
        videoTitle || '未知',
        contextDescription,
        sourceFrames,
        generatedArt,
        refinedImages,
        !!avatarImage,
        useThinking,
        provider
      );

      setCaptionOptions(options);

    } catch (err: any) {
      handleError(err);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // Step 6: Generate Cover
  const handleGenerateCover = async () => {
    if (!selectedCaption || !activeStrategy || sourceFrames.length === 0) {
        setError("请先选择文案并确保有原始视频帧。");
        return;
    }

    setIsGeneratingCover(true);
    setError(null);
    setViewStep(6);
    
    try {
        const cover = await GeminiService.generateCover(
            apiKey,
            baseUrl,
            activeStrategy,
            contextDescription,
            selectedCaption,
            sourceFrames, // Pass all frames, service filters start/end
            avatarImage,  // Pass avatar if present
            watermarkText, // Pass watermark if present
            useThinking,
            provider
        );
        setCoverImage(cover);
        setWorkflowStep('cover_mode');
    } catch (err: any) {
        handleError(err);
    } finally {
        setIsGeneratingCover(false);
    }
  };

  // --- RENDER STAGE CONTENT ---
  const renderRefineView = () => (
     <Step5Refine
        subPanels={subPanels}
        onBatchDownload={handleBatchDownload}
        onDownloadSingle={handleDownloadImage}
        onRegenerateSingle={generateSinglePanel}
        batchJobId={batchJobId}
        batchStatus={batchStatus}
        onRefreshBatch={handleRefreshBatch}
        useBatch={useBatch}
      />
  );

  const renderRightStage = () => {
    switch (viewStep) {
      case 1:
        return <Step1Input isGenerating={isAnalyzingSteps} frames={sourceFrames} />;
      
      case 2:
        // Step 2: Base Generation
        // If not started (no baseArt and not generating), show Step 1 result (Frames)
        if (!baseArt && !isGeneratingImage) {
           return <Step1Input isGenerating={false} frames={sourceFrames} />;
        }
        return <Step2Base imageSrc={baseArt} isGenerating={isGeneratingImage} />;

      case 3:
        // Step 3: Character
        // generatedArt starts as baseArt, so it naturally shows previous step.
        // If skipping, it still shows generatedArt.
        return <Step4Final imageSrc={generatedArt} isGenerating={isGeneratingImage && !!baseArt} />;

      case 4:
        // Step 4: Refine
        // If no panels and no active batch, show Step 3 result (Generated Art)
        if (subPanels.length === 0 && !batchJobId) {
             return <Step4Final imageSrc={generatedArt} isGenerating={false} />;
        }
        return renderRefineView();

      case 5:
        // Step 5: Captions
        // Show Refine View if available (Step 4 result), else Step 3 result
        if (subPanels.length > 0) {
           return renderRefineView();
        } else {
           return <Step4Final imageSrc={generatedArt} isGenerating={false} />;
        }

      case 6:
        // Step 6: Cover
        // If no cover and not generating, show previous result
        if (!coverImage && !isGeneratingCover) {
            if (subPanels.length > 0) {
               return renderRefineView();
            } else {
               return <Step4Final imageSrc={generatedArt} isGenerating={false} />;
            }
        }
        return (
          <Step6Cover 
            imageSrc={coverImage} 
            isGenerating={isGeneratingCover} 
            onDownload={coverImage ? () => handleDownloadImage(coverImage!, `cover_${Date.now()}.png`) : undefined}
          />
        );

      default:
        return <Step1Input isGenerating={false} frames={sourceFrames} />;
    }
  };

  // 0. Restoring Overlay
  if (isRestoring) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 backdrop-blur-md">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">正在恢复项目进度...</p>
        </div>
      </div>
    );
  }

  // 1. Show Platform Selector if not selected
  if (!activeStrategy) {
    return (
      <PlatformSelector 
        onSelect={setActiveStrategy} 
        onClose={onClose} 
      />
    );
  }

  // 2. Loading Frames
  if (isLoadingFrames) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">正在提取视频帧...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-200">
      <Header
        onClose={onClose}
        targetPlatform={activeStrategy}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        provider={provider}
        setProvider={setProvider}
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        useThinking={useThinking}
        setUseThinking={setUseThinking}
        useBatch={useBatch}
        setUseBatch={setUseBatch}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
      
      {error && (
         <div className="bg-red-900/50 border-b border-red-900/30 px-4 py-2 text-center text-xs text-red-200">
           {error}
         </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
        
        <Sidebar
          viewStep={viewStep}
          onStepChange={setViewStep}
          
          workflowStep={workflowStep}
          targetPlatform={activeStrategy}
          videoTitle={videoTitle}
          contextDescription={contextDescription}
          setContextDescription={setContextDescription}
          customPrompt={customPrompt}
          setCustomPrompt={setCustomPrompt}
          
          isGeneratingImage={isGeneratingImage}
          isAnalyzingSteps={isAnalyzingSteps}
          
          onAnalyzeSteps={handleAnalyzeSteps}
          onGenerateBase={handleGenerateBase}
          onIntegrateCharacter={handleIntegrateCharacter}
          onSkipCharacter={handleSkipCharacter}
          onStartRefine={handleStartRefine}
          
          stepDescriptions={stepDescriptions}
          
          avatarImage={avatarImage}
          onAvatarUpload={handleAvatarUpload}
          onRemoveAvatar={() => setAvatarImage(null)}
          
          watermarkText={watermarkText}
          setWatermarkText={setWatermarkText}
          
          panelCount={panelCount}
          setPanelCount={setPanelCount}
          
          generatedArt={generatedArt}
          
          isGeneratingCaptions={isGeneratingCaptions}
          onGenerateCaptions={handleGenerateCaption}
          captionOptions={captionOptions}
          
          onCopyCaption={handleCopyCaption}
          copiedIndex={copiedIndex}
          sourceFrames={sourceFrames}
          subPanels={subPanels}
          defaultPrompt={activeStrategy?.defaultImagePrompt || ''}
          
          batchJobId={batchJobId}
          onRefreshBatch={handleRefreshBatch}
          onRecoverBatch={handleRecoverBatch}

          // New Selection Props
          selectedCaption={selectedCaption}
          onSelectCaption={(opt) => {
              if (opt === null) {
                  setSelectedCaption(null); // Deselect
              } else {
                  setSelectedCaption({ ...opt }); // Clone
              }
          }}
          onUpdateSelectedCaption={(title, content) => {
              if (selectedCaption) {
                  setSelectedCaption({ ...selectedCaption, title, content });
              }
          }}
          
          // New Cover Props
          isGeneratingCover={isGeneratingCover}
          onGenerateCover={handleGenerateCover}
          coverImage={coverImage}
          
          useBatch={useBatch}
        />

        {/* Right Stage: Result based on View Step */}
        <div className="flex-1 bg-black/20 relative p-4 lg:p-6 flex flex-col min-w-0 order-1 lg:order-2 h-[55vh] lg:h-full overflow-y-auto custom-scrollbar">
           {renderRightStage()}
        </div>

      </div>
    </div>
  );
};
