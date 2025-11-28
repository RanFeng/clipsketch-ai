
import React, { useState } from 'react';
import { 
  AlignLeft, ChevronDown, ChevronUp, Loader2, RefreshCw, ListChecks, 
  User, Plus, Grid3X3, ImageIcon, Download, FileText, Sparkles, Check, Copy, Link, LayoutGrid, Type
} from 'lucide-react';
import { Button } from '../Button';
import { WorkflowStep } from './types';
import { FrameData, CaptionOption, SubPanel } from '../../services/gemini';
import { SocialPlatformStrategy } from '../../services/strategies';

interface SidebarProps {
  workflowStep: WorkflowStep;
  targetPlatform: SocialPlatformStrategy;
  videoTitle?: string;
  contextDescription: string;
  setContextDescription: (val: string) => void;
  customPrompt: string;
  setCustomPrompt: (val: string) => void;
  isGeneratingImage: boolean;
  isAnalyzingSteps: boolean;
  onAnalyzeSteps: () => void;
  stepDescriptions: string[];
  avatarImage: string | null;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  watermarkText: string;
  setWatermarkText: (val: string) => void;
  panelCount: number;
  setPanelCount: (count: number) => void;
  generatedArt: string | null;
  isGeneratingCaptions: boolean;
  onGenerateCaptions: () => void;
  captionOptions: CaptionOption[];
  onCopyCaption: (text: string, index: number) => void;
  copiedIndex: number | null;
  sourceFrames: FrameData[];
  subPanels: SubPanel[];
  defaultPrompt: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workflowStep, targetPlatform, videoTitle,
  contextDescription, setContextDescription, customPrompt, setCustomPrompt,
  isGeneratingImage, isAnalyzingSteps, onAnalyzeSteps, stepDescriptions,
  avatarImage, onAvatarUpload, onRemoveAvatar, watermarkText, setWatermarkText,
  panelCount, setPanelCount,
  generatedArt, isGeneratingCaptions, onGenerateCaptions, captionOptions,
  onCopyCaption, copiedIndex, sourceFrames, subPanels, defaultPrompt
}) => {
  const [isInputsCollapsed, setIsInputsCollapsed] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isChinesePlatform = targetPlatform.id === 'xhs';

  return (
    <div className="w-full lg:w-96 h-[45vh] lg:h-full border-t lg:border-t-0 lg:border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 order-2 lg:order-1">
      
      {/* Section A: Always Visible Inputs */}
      <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-900">
        <div className="flex justify-between items-center mb-1.5 cursor-pointer" onClick={() => setIsInputsCollapsed(!isInputsCollapsed)}>
          <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5" />
            创意输入
          </h3>
          <button className="text-slate-500 hover:text-slate-300">
            {isInputsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        {!isInputsCollapsed && (
          <div className="animate-in slide-in-from-top-1 fade-in duration-200">
            {/* Context Description Input */}
            <div className="mb-3">
              <label className="text-[10px] text-slate-500 block mb-1">
                {videoTitle ? (videoTitle.length > 20 ? videoTitle.substring(0, 20) + '...' : videoTitle) : '视频背景/文案'}
              </label>
              <textarea
                value={contextDescription}
                onChange={(e) => setContextDescription(e.target.value)}
                placeholder="从原视频提取的文案或自行输入背景故事..."
                className="w-full h-16 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none placeholder-slate-600 custom-scrollbar leading-relaxed"
                disabled={isGeneratingImage && workflowStep !== 'refine_mode'}
              />
            </div>

            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-slate-500">绘图提示词 (Prompt)</label>
              <button 
                onClick={() => setCustomPrompt(defaultPrompt)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                disabled={isGeneratingImage && workflowStep !== 'refine_mode'}
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full h-16 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none placeholder-slate-600 custom-scrollbar leading-relaxed mb-3"
              disabled={isGeneratingImage && workflowStep !== 'refine_mode'}
            />
            
            <Button 
              onClick={onAnalyzeSteps}
              disabled={isAnalyzingSteps}
              size="sm"
              variant="secondary"
              className="w-full border-dashed border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 h-8 text-xs"
            >
              {isAnalyzingSteps ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  {isChinesePlatform ? "分析步骤中..." : "Analyzing Steps..."}
                </>
              ) : stepDescriptions.length > 0 ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-2 text-indigo-400" />
                  {isChinesePlatform ? "分析完成 (点击重试)" : "Analysis Done (Retry)"}
                </>
              ) : (
                <>
                  <ListChecks className="w-3 h-3 mr-2" />
                  1. {isChinesePlatform ? "分析步骤内容" : "Analyze Steps"}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Section B: Dynamic Controls */}
      
      {/* Avatar Upload */}
      {(workflowStep === 'avatar_mode' || workflowStep === 'final_generated' || workflowStep === 'refine_mode') && (
        <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-900/80 animate-in slide-in-from-left">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-pink-400" />
            {workflowStep === 'refine_mode' ? "当前主角" : "添加主角"}
            <span className="text-[10px] text-slate-500 font-normal ml-auto">
              {avatarImage ? "已上传" : "未上传"}
            </span>
          </label>
          
          <div className="flex items-center gap-3">
            <div 
              onClick={() => workflowStep === 'avatar_mode' && avatarInputRef.current?.click()}
              className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center transition-all overflow-hidden relative shrink-0 ${
                avatarImage 
                ? 'border-pink-500 bg-slate-800 cursor-default' 
                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
              }`}
            >
              {avatarImage ? (
                <img src={avatarImage} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Plus className="w-5 h-5 text-slate-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {workflowStep === 'avatar_mode' && (
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={avatarInputRef} 
                  className="hidden"
                  onChange={onAvatarUpload}
                />
              )}
              {avatarImage ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-white truncate">已就绪</span>
                  {workflowStep === 'avatar_mode' && (
                    <button onClick={onRemoveAvatar} className="text-[10px] text-red-400 hover:text-red-300 text-left">移除更换</button>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 leading-tight">
                  {workflowStep === 'refine_mode' ? "无主角模式" : "上传猫咪、公仔或头像"}
                </p>
              )}
            </div>
          </div>
          
          {/* Watermark Input - Only show if in relevant steps */}
          {(workflowStep === 'avatar_mode' || workflowStep === 'final_generated' || workflowStep === 'refine_mode') && (
            <div className="mt-3 relative">
               <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                 <Type className="w-3 h-3" />
                 个性水印 (可选)
               </label>
               <input
                 type="text"
                 value={watermarkText}
                 onChange={(e) => setWatermarkText(e.target.value)}
                 placeholder="例如: @ClipSketch-AI"
                 className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
               />
            </div>
          )}
        </div>
      )}

      {/* Panel Count Input */}
      {workflowStep === 'final_generated' && (
        <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-900/60">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
            <Grid3X3 className="w-3.5 h-3.5 text-indigo-400" />
            子图数量
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="number"
              min="1"
              max="20"
              value={panelCount}
              onChange={(e) => setPanelCount(parseInt(e.target.value) || 0)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white w-16 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500">张 (与步骤数对应)</span>
          </div>
        </div>
      )}

      {/* Panorama Preview */}
      {workflowStep === 'refine_mode' && (
        <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-900/60 animate-in slide-in-from-left">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              全景底图
            </label>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={() => generatedArt && handleDownloadImage(generatedArt, 'panorama_base.png')}
              title="下载全景图"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
          {generatedArt && (
            <div className="rounded-lg overflow-hidden border border-slate-700/50 shadow-sm max-h-40">
              <img src={generatedArt} alt="Panorama" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Captions */}
      {(workflowStep === 'base_generated' || workflowStep === 'final_generated' || workflowStep === 'refine_mode') && (
        <div className="flex flex-col bg-slate-900 animate-in slide-in-from-bottom duration-300 shrink-0 border-b border-slate-800 max-h-[40vh]">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <FileText className={`w-3.5 h-3.5 ${targetPlatform.primaryColorClass}`} />
              {isChinesePlatform ? '社交媒体文案' : 'Social Captions'}
            </h3>
            
            <Button 
              onClick={onGenerateCaptions}
              isLoading={isGeneratingCaptions}
              disabled={isGeneratingCaptions || isGeneratingImage || (workflowStep === 'refine_mode' && subPanels.some(p => p.status === 'generating'))}
              size="sm"
              variant="secondary"
              className="h-6 text-xs px-2"
            >
              {captionOptions.length > 0 ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  重新生成
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  生成文案
                </>
              )}
            </Button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-3 relative bg-slate-900 min-h-[100px]">
            {isGeneratingCaptions ? (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-3 text-xs py-4">
                <Loader2 className={`w-6 h-6 animate-spin ${targetPlatform.primaryColorClass}`} />
                <span className="animate-pulse">
                  {isChinesePlatform ? "正在构思爆款文案..." : "Crafting aesthetic captions..."}
                </span>
              </div>
            ) : captionOptions.length > 0 ? (
              <div className="space-y-4">
                {captionOptions.map((opt, idx) => (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 hover:border-pink-500/30 transition-colors group">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h4 className="font-bold text-xs lg:text-sm text-pink-200 line-clamp-1 flex-1" title={opt.title}>
                        {opt.title}
                      </h4>
                      <button 
                        onClick={() => onCopyCaption(`${opt.title}\n\n${opt.content}`, idx)}
                        className={`shrink-0 p-1.5 rounded-md transition-all ${
                          copiedIndex === idx 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-slate-700 text-slate-400 hover:bg-indigo-600 hover:text-white"
                        }`}
                        title="复制标题和内容"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> : <Copy className="w-3 h-3 lg:w-3.5 lg:h-3.5" />}
                      </button>
                    </div>
                    <div className="text-[10px] lg:text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-900/50 p-2 rounded-lg max-h-40 overflow-y-auto custom-scrollbar">
                      {opt.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-600 p-2 text-center">
                <FileText className="w-6 h-6 mb-2 opacity-20" />
                <p className="text-xs max-w-[180px]">
                  {isChinesePlatform 
                    ? "点击上方按钮生成匹配的文案。"
                    : "Click above to generate matching captions."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section C: Reference Frames */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-900/30">
        <div className="p-2 pb-1 shrink-0 bg-slate-900/50">
          <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5" />
            参考帧 ({sourceFrames.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2 pt-2">
          {sourceFrames.map((frame, index) => {
            const desc = stepDescriptions[index];
            const prevDesc = index > 0 ? stepDescriptions[index - 1] : null;
            const isShared = desc && desc === prevDesc;

            return (
              <div key={frame.tagId} className={`flex gap-3 items-start group ${isShared ? 'opacity-70' : ''}`}>
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0 mt-1 border border-slate-700">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="relative aspect-[9/16] rounded-md overflow-hidden bg-black border border-slate-800 shadow-sm w-24">
                    <img src={frame.data} alt="Frame" className="w-full h-full object-contain opacity-80" />
                  </div>
                  {desc && (
                    <div className="text-[10px] bg-slate-800/50 p-2 rounded border border-slate-700/50 text-slate-300">
                      {isShared ? (
                        <span className="flex items-center gap-1 italic text-slate-500"><Link className="w-3 h-3"/> {isChinesePlatform ? "同上..." : "Same step..."}</span>
                      ) : (
                        <span>{desc}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
