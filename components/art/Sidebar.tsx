
import React, { useRef, useState } from 'react';
import { 
  Loader2, RefreshCw, ListChecks, 
  Plus, Grid3X3, Check, Copy, Wand2, Sparkles, ChevronDown, DownloadCloud, PenTool, LayoutTemplate
} from 'lucide-react';
import { Button } from '../Button';
import { WorkflowStep } from './types';
import { FrameData, CaptionOption, SubPanel } from '../../services/gemini';
import { SocialPlatformStrategy } from '../../services/strategies';

interface SidebarProps {
  viewStep: number;
  onStepChange: (step: number) => void;

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
  onGenerateBase: () => void;
  onIntegrateCharacter: () => void;
  onSkipCharacter: () => void;
  onStartRefine: () => void;
  
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
  
  // Batch processing props
  batchJobId?: string | null;
  onRefreshBatch?: () => void;
  onRecoverBatch?: (jobId: string) => void;

  // Caption Selection & Cover Generation
  selectedCaption: CaptionOption | null;
  onSelectCaption: (caption: CaptionOption) => void;
  onUpdateSelectedCaption: (title: string, content: string) => void;
  
  isGeneratingCover: boolean;
  onGenerateCover: () => void;
  coverImage: string | null;

  useBatch: boolean;
}

interface StepItemProps {
  step: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isDisabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const StepItem: React.FC<StepItemProps> = ({ step, title, isActive, isCompleted, isDisabled, onToggle, children }) => {
  return (
    <div className={`border-b border-slate-800 bg-slate-900 transition-opacity duration-300 ${isDisabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
      <button 
        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-slate-800/50 outline-none"
        onClick={onToggle}
        disabled={isDisabled}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border transition-all duration-300
            ${isActive 
              ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/20' 
              : isCompleted 
                ? 'bg-green-500/10 border-green-500 text-green-500' 
                : 'border-slate-600 text-slate-500 bg-slate-800'}`}>
            {isCompleted && !isActive ? <Check className="w-3.5 h-3.5" /> : step}
          </div>
          <span className={`text-sm font-medium transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-400'}`}>
            {title}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isActive ? 'rotate-180 text-indigo-400' : ''}`} />
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isActive ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 pt-0 pl-12 space-y-4">
           {children}
        </div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [recoverId, setRecoverId] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onAvatarUpload(e);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const completedRefineCount = props.subPanels.filter(p => p.status === 'completed').length;

  return (
    <div className="w-full lg:w-96 h-[45vh] lg:h-full border-t lg:border-t-0 lg:border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 order-2 lg:order-1 relative z-20">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Step 1: Creative Analysis */}
        <StepItem 
          step={1} 
          title="创意分析" 
          isActive={props.viewStep === 1}
          isCompleted={props.stepDescriptions.length > 0}
          isDisabled={false} 
          onToggle={() => props.onStepChange(1)}
        >
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">
              {props.videoTitle ? (props.videoTitle.length > 15 ? props.videoTitle.substring(0, 15) + '...' : props.videoTitle) : '视频背景'}
            </label>
            <textarea
              value={props.contextDescription}
              onChange={(e) => props.setContextDescription(e.target.value)}
              placeholder="输入背景故事..."
              className="w-full h-14 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none placeholder-slate-700 custom-scrollbar mb-3"
              disabled={props.isGeneratingImage || props.isAnalyzingSteps}
            />

            <Button 
              onClick={props.onAnalyzeSteps}
              disabled={props.isAnalyzingSteps || props.isGeneratingImage}
              size="sm"
              className={`w-full ${props.stepDescriptions.length > 0 ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
            >
              {props.isAnalyzingSteps ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  分析中...
                </>
              ) : props.stepDescriptions.length > 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  重新分析
                </>
              ) : (
                <>
                  <ListChecks className="w-3.5 h-3.5 mr-2" />
                  分析关键步骤
                </>
              )}
            </Button>
          </div>
        </StepItem>

        {/* Step 2: Base Generation - ONLY APPEARS IF Step 1 Finished */}
        {props.stepDescriptions.length > 0 && (
          <StepItem 
            step={2} 
            title="画面生成" 
            isActive={props.viewStep === 2}
            isCompleted={!!props.generatedArt}
            isDisabled={false}
            onToggle={() => props.onStepChange(2)}
          >
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              AI 将根据分析结果绘制基础分镜。
            </p>
            
            <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-slate-500">提示词 (Prompt)</label>
                {!props.isGeneratingImage && !props.isAnalyzingSteps && (
                  <button onClick={() => props.setCustomPrompt(props.defaultPrompt)} className="text-[10px] text-indigo-400 hover:text-indigo-300">重置</button>
                )}
            </div>
            <textarea
              value={props.customPrompt}
              onChange={(e) => props.setCustomPrompt(e.target.value)}
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none placeholder-slate-700 custom-scrollbar mb-3"
              disabled={props.isGeneratingImage || props.isAnalyzingSteps}
            />

            <Button 
              onClick={props.onGenerateBase}
              disabled={props.isGeneratingImage}
              size="sm"
              className={`w-full ${props.generatedArt ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
            >
              {props.isGeneratingImage && !props.generatedArt ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  绘图中...
                </>
              ) : props.generatedArt ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  重新生成
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-2" />
                  生成手绘分镜
                </>
              )}
            </Button>
          </StepItem>
        )}

        {/* Subsequent Steps - ONLY APPEAR IF Step 2 Finished */}
        {props.generatedArt && (
          <>
            {/* Step 3: Character Integration */}
            <StepItem 
              step={3} 
              title="角色融合 (可选)" 
              isActive={props.viewStep === 3}
              isCompleted={props.workflowStep === 'final_generated' || props.workflowStep === 'refine_mode' || props.workflowStep === 'cover_mode'}
              isDisabled={!props.generatedArt}
              onToggle={() => props.generatedArt && props.onStepChange(3)}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div 
                      onClick={() => avatarInputRef.current?.click()}
                      className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center transition-all overflow-hidden relative shrink-0 cursor-pointer ${
                        props.avatarImage ? 'border-pink-500 bg-slate-950' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      {props.avatarImage ? (
                        <img src={props.avatarImage} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Plus className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={handleFileChange} />
                      {props.avatarImage ? (
                        <div className="flex flex-col">
                            <span className="text-xs text-white">角色图已上传</span>
                            <button onClick={props.onRemoveAvatar} className="text-[10px] text-red-400 hover:text-red-300 text-left w-fit">移除</button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 block">上传角色图以融入画面</span>
                      )}
                    </div>
                </div>

                {props.avatarImage && (
                  <div>
                    <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                        个性水印
                    </label>
                    <input
                      type="text"
                      value={props.watermarkText}
                      onChange={(e) => props.setWatermarkText(e.target.value)}
                      placeholder="@ClipSketch"
                      className="w-full h-8 bg-slate-950 border border-slate-800 rounded px-2 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                    <Button 
                      onClick={props.onIntegrateCharacter}
                      disabled={props.isGeneratingImage || !props.avatarImage}
                      size="sm"
                      className={`flex-1 ${!props.avatarImage ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'bg-pink-600 hover:bg-pink-500 text-white'}`}
                    >
                        {props.isGeneratingImage && props.avatarImage ? (
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 mr-2" />
                        )}
                        {props.workflowStep === 'final_generated' || props.workflowStep === 'refine_mode' || props.workflowStep === 'cover_mode' ? "重新融合" : "开始融合"}
                    </Button>
                    
                    <Button
                        onClick={props.onSkipCharacter}
                        disabled={props.isGeneratingImage}
                        size="sm"
                        variant="secondary"
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700"
                    >
                        {props.workflowStep === 'final_generated' || props.workflowStep === 'refine_mode' || props.workflowStep === 'cover_mode' ? "恢复原图" : "跳过"}
                    </Button>
                </div>
              </div>
            </StepItem>

            {/* Step 4: Refine */}
            <StepItem 
              step={4} 
              title="分镜精修" 
              isActive={props.viewStep === 4}
              isCompleted={completedRefineCount > 0}
              isDisabled={!props.generatedArt}
              onToggle={() => props.generatedArt && props.onStepChange(4)}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 whitespace-nowrap">切分数量</label>
                  <input 
                    type="number"
                    min="1"
                    max="20"
                    value={props.panelCount}
                    onChange={(e) => props.setPanelCount(parseInt(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white w-full focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <Button 
                  onClick={props.onStartRefine}
                  disabled={props.isGeneratingImage || props.subPanels.some(p => p.status === 'generating')}
                  size="sm"
                  variant="secondary"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                >
                  <Grid3X3 className="w-3.5 h-3.5 mr-2" />
                  开启精修模式
                </Button>

                {/* Batch Status / Recovery Section - Only visible if useBatch is enabled */}
                {props.useBatch && (
                    props.batchJobId ? (
                       <div className="pt-2 border-t border-slate-800 mt-2">
                          <div className="text-[10px] text-slate-500 mb-1 font-mono break-all leading-tight">
                             ID: {props.batchJobId.slice(0, 8)}...
                          </div>
                          <Button 
                             onClick={props.onRefreshBatch}
                             size="sm"
                             className="w-full bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/50 hover:border-indigo-700 text-xs h-8"
                          >
                             <RefreshCw className="w-3 h-3 mr-1.5" />
                             刷新进度 / 加载图片
                          </Button>
                       </div>
                    ) : (
                       <div className="pt-2 border-t border-slate-800 mt-2">
                           <label className="text-[10px] text-slate-500 block mb-1">恢复任务 (可选)</label>
                           <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="输入 Job ID"
                                value={recoverId}
                                onChange={(e) => setRecoverId(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded px-2 text-[10px] text-white w-full h-7 focus:outline-none focus:border-indigo-500"
                              />
                              <Button
                                 onClick={() => props.onRecoverBatch?.(recoverId)}
                                 disabled={!recoverId.trim()}
                                 size="sm"
                                 className="bg-slate-800 hover:bg-slate-700 text-slate-300 h-7 px-2"
                                 title="恢复任务"
                              >
                                 <DownloadCloud className="w-3.5 h-3.5" />
                              </Button>
                           </div>
                       </div>
                    )
                )}
              </div>
            </StepItem>

            {/* Step 5: Captions */}
            <StepItem 
              step={5} 
              title="社交文案" 
              isActive={props.viewStep === 5}
              isCompleted={!!props.selectedCaption}
              isDisabled={!props.generatedArt}
              onToggle={() => props.generatedArt && props.onStepChange(5)}
            >
              <Button 
                onClick={props.onGenerateCaptions}
                isLoading={props.isGeneratingCaptions}
                disabled={props.isGeneratingCaptions || props.isGeneratingImage}
                size="sm"
                className="w-full mb-3 bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {props.captionOptions.length > 0 ? "重新生成文案" : "生成匹配文案"}
              </Button>

              {props.captionOptions.length > 0 && !props.selectedCaption && (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-500">点击选择一个文案进行编辑：</p>
                  {props.captionOptions.map((opt, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => props.onSelectCaption(opt)}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2 hover:border-indigo-500/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-[10px] font-bold text-slate-400 line-clamp-1 flex-1 group-hover:text-indigo-400" title={opt.title}>
                          {opt.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-wrap max-h-20 overflow-hidden line-clamp-3">
                        {opt.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Caption Editing Mode */}
              {props.selectedCaption && (
                 <div className="space-y-2 animate-in fade-in slide-in-from-right-4">
                     <div className="flex items-center justify-between">
                        <span className="text-xs text-indigo-400 flex items-center gap-1">
                           <PenTool className="w-3 h-3" /> 编辑选中与标题
                        </span>
                        <button 
                           onClick={() => props.onSelectCaption(null as any)} // Hack to clear selection
                           className="text-[10px] text-slate-500 hover:text-white underline"
                        >
                           重选
                        </button>
                     </div>
                     
                     <input
                        type="text"
                        value={props.selectedCaption.title}
                        onChange={(e) => props.onUpdateSelectedCaption(e.target.value, props.selectedCaption!.content)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="标题..."
                     />
                     <textarea
                        value={props.selectedCaption.content}
                        onChange={(e) => props.onUpdateSelectedCaption(props.selectedCaption!.title, e.target.value)}
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-2 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500 custom-scrollbar resize-none leading-relaxed"
                        placeholder="文案内容..."
                     />
                     <Button 
                       onClick={() => props.onCopyCaption(`${props.selectedCaption!.title}\n\n${props.selectedCaption!.content}`, -1)}
                       size="sm"
                       className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                     >
                        {props.copiedIndex === -1 ? <Check className="w-3.5 h-3.5 mr-2" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                        复制最终文案
                     </Button>
                 </div>
              )}
            </StepItem>

            {/* Step 6: Cover Generation - ONLY APPEARS IF Caption Selected */}
            {props.selectedCaption && (
                <StepItem 
                    step={6} 
                    title="生成封面" 
                    isActive={props.viewStep === 6}
                    isCompleted={!!props.coverImage}
                    isDisabled={false}
                    onToggle={() => props.onStepChange(6)}
                >
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                        基于选中的文案标题和原始画面，生成高品质竖屏封面。
                    </p>
                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800 mb-3">
                         <span className="text-[10px] text-slate-500 block mb-0.5">当前标题:</span>
                         <span className="text-xs text-indigo-300 font-medium line-clamp-1">{props.selectedCaption.title}</span>
                    </div>

                    <Button 
                        onClick={props.onGenerateCover}
                        isLoading={props.isGeneratingCover}
                        disabled={props.isGeneratingCover}
                        size="sm"
                        className={`w-full ${props.coverImage ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border-none'}`}
                    >
                        {props.coverImage ? "重新生成封面" : "生成封面特效"}
                        {!props.isGeneratingCover && <LayoutTemplate className="w-3.5 h-3.5 ml-2" />}
                    </Button>
                </StepItem>
            )}
          </>
        )}

      </div>
    </div>
  );
};
