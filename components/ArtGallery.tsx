
import React, { useEffect, useState } from 'react';
import { Tag } from '../types';
import { captureFramesAsBase64 } from '../utils';
import { GeminiService, CaptionOption, SubPanel } from '../services/gemini';
import { ProviderType } from '../services/llm';
import { Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { SocialPlatformStrategy } from '../services/strategies';

// Import New Split Components
import { PlatformSelector } from './art/PlatformSelector';
import { Header } from './art/Header';
import { Sidebar } from './art/Sidebar';
import { Step1Input } from './art/steps/Step1Input';
import { Step2Base } from './art/steps/Step2Base';
import { Step3Avatar } from './art/steps/Step3Avatar';
import { Step4Final } from './art/steps/Step4Final';
import { Step5Refine } from './art/steps/Step5Refine';
import { WorkflowStep } from './art/types';

interface ArtGalleryProps {
  tags: Tag[];
  videoUrl: string;
  videoTitle?: string;
  videoContent?: string;
  onClose: () => void;
}

const DEFAULT_PROMPT = `将这些图片转换为可爱的、手绘风格的插图，以描绘整个过程。要有明显的手绘风格，主体的形状和颜色不应有太大变化，要真实反映原图像本身的特性。每一步的插图应尽可能独立且完整，并且小图片之间应有足够的间距。为每个步骤编号，并用简短描述。除了步骤描述外，不要添加任何不必要的文字。每一步的插图和整体插图都要以纯白色为背景`;

export const ArtGallery: React.FC<ArtGalleryProps> = ({ tags, videoUrl, videoTitle, videoContent, onClose }) => {
  // Strategy Selection State
  const [activeStrategy, setActiveStrategy] = useState<SocialPlatformStrategy | null>(null);

  const [sourceFrames, setSourceFrames] = useState<{tagId: string, timestamp: number, data: string}[]>([]);
  
  const [baseArt, setBaseArt] = useState<string | null>(null); 
  const [generatedArt, setGeneratedArt] = useState<string | null>(null); 
  const [avatarImage, setAvatarImage] = useState<string | null>(null); 
  const [watermarkText, setWatermarkText] = useState<string>('');
  
  // Refine Mode State
  const [panelCount, setPanelCount] = useState<number>(0);
  const [subPanels, setSubPanels] = useState<SubPanel[]>([]);

  const [captionOptions, setCaptionOptions] = useState<CaptionOption[]>([]);
  
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

  const [provider, setProvider] = useState<ProviderType>(() => {
    return (localStorage.getItem('llm_provider') as ProviderType) || 'google';
  });

  const [showSettings, setShowSettings] = useState(false);

  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('input');
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Initialize gallery by capturing frames ONLY after platform is selected
  useEffect(() => {
    if (activeStrategy && sourceFrames.length === 0) {
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
    }
  }, [tags, videoUrl, activeStrategy]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_base_url', baseUrl);
    localStorage.setItem('gemini_use_thinking', String(useThinking));
    localStorage.setItem('llm_provider', provider);
  }, [apiKey, baseUrl, useThinking, provider]);

  // Update context description if prop changes (e.g. re-import)
  useEffect(() => {
    if (videoContent) setContextDescription(videoContent);
  }, [videoContent]);

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

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `panels_batch_${new Date().getTime()}.zip`;
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
      };
      reader.readAsDataURL(file);
    }
  };

  const handleError = (err: any) => {
    setError(err.message || "发生未知错误。");
  };

  // Step 0: Analyze Frames
  const handleAnalyzeSteps = async () => {
    if (sourceFrames.length === 0 || !activeStrategy) return;
    
    setIsAnalyzingSteps(true);
    setError(null);
    setStepDescriptions([]);
    
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
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsAnalyzingSteps(false);
    }
  };

  // Step 1: Generate Base Storyboard
  const handleGenerateBase = async () => {
    if (sourceFrames.length === 0 || !activeStrategy) {
      setError("没有可处理的图片帧。");
      return;
    }

    setIsGeneratingImage(true);
    setError(null);
    setWorkflowStep('input');
    
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
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Step 2: Integrate Character
  const handleIntegrateCharacter = async () => {
    if (!baseArt || !avatarImage) {
      setError("缺少基础绘图或形象图片。");
      return;
    }

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
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Step 3: Refine Mode Logic
  const handleStartRefine = () => {
      const panels: SubPanel[] = Array.from({ length: panelCount }, (_, i) => ({
          index: i,
          imageUrl: null,
          status: 'pending'
      }));
      setSubPanels(panels);
      setWorkflowStep('refine_mode');
      handleGenerateAllPanels(panels);
  };

  const handleGenerateAllPanels = async (panelsToProcess: SubPanel[]) => {
      panelsToProcess.forEach((panel) => {
          generateSinglePanel(panel.index);
      });
  };

  const generateSinglePanel = async (index: number) => {
      if (!generatedArt) return;

      setSubPanels(prev => prev.map(p => p.index === index ? { ...p, status: 'generating' } : p));

      try {
        const correspondingFrame = sourceFrames[index] || null;
        const stepDesc = stepDescriptions[index] || '';

        const resultImage = await GeminiService.refinePanel(
            apiKey,
            baseUrl,
            index,
            panelCount,
            stepDesc,
            contextDescription,
            generatedArt,
            correspondingFrame,
            avatarImage,
            useThinking,
            provider,
            watermarkText
        );

        setSubPanels(prev => prev.map(p => p.index === index ? { ...p, imageUrl: resultImage, status: 'completed' } : p));
      } catch (err) {
          console.error(`Panel ${index} error:`, err);
          setSubPanels(prev => prev.map(p => p.index === index ? { ...p, status: 'error' } : p));
      }
  };

  // Step 4: Generate Captions
  const handleGenerateCaption = async () => {
    if (!activeStrategy) return;

    setIsGeneratingCaptions(true);
    setError(null);
    setCaptionOptions([]);

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

  // --- RENDER ---
  
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

  if (!activeStrategy) {
    return (
      <PlatformSelector 
        onSelect={setActiveStrategy} 
        onClose={onClose} 
      />
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
        apiKey={apiKey}
        setApiKey={setApiKey}
        workflowStep={workflowStep}
        setWorkflowStep={setWorkflowStep}
        isGenerating={isGeneratingImage}
        onGenerateBase={handleGenerateBase}
        onIntegrateCharacter={handleIntegrateCharacter}
        onStartRefine={handleStartRefine}
        onAnalyzeSteps={handleAnalyzeSteps}
        isAnalyzing={isAnalyzingSteps}
        hasAvatar={!!avatarImage}
        isRefining={workflowStep === 'refine_mode'}
        completedPanelsCount={subPanels.filter(p => p.status === 'completed').length}
        totalPanelsCount={panelCount}
      />
      
      {error && (
         <div className="bg-red-900/50 border-b border-red-900/30 px-4 py-2 text-center text-xs text-red-200">
           {error}
         </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
        
        <Sidebar
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
          defaultPrompt={DEFAULT_PROMPT}
        />

        {/* Right Stage: Result */}
        <div className="flex-1 bg-black/20 relative p-4 lg:p-6 flex flex-col min-w-0 order-1 lg:order-2 h-[55vh] lg:h-full overflow-y-auto custom-scrollbar">
           {workflowStep === 'input' && <Step1Input isGenerating={isGeneratingImage} />}
           
           {workflowStep === 'base_generated' && (
             <Step2Base 
               imageSrc={generatedArt} 
               isGenerating={isGeneratingImage} 
             />
           )}
           
           {workflowStep === 'avatar_mode' && (
             <Step3Avatar 
               imageSrc={generatedArt} 
               isGenerating={isGeneratingImage} 
             />
           )}
           
           {workflowStep === 'final_generated' && (
             <Step4Final 
               imageSrc={generatedArt} 
               isGenerating={isGeneratingImage} 
             />
           )}

           {workflowStep === 'refine_mode' && (
             <Step5Refine
               subPanels={subPanels}
               onBatchDownload={handleBatchDownload}
               onDownloadSingle={handleDownloadImage}
               onRegenerateSingle={generateSinglePanel}
             />
           )}
        </div>

      </div>
    </div>
  );
};
