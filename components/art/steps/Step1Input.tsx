
import React, { useState, useEffect } from 'react';
import { ImageViewer } from '../common/ImageViewer';
import { FrameData } from '../../../services/gemini';
import { Film, LayoutGrid, Clock, ChevronRight, MessageSquare } from 'lucide-react';

interface Step1InputProps {
  isGenerating: boolean;
  frames: FrameData[];
  stepDescriptions?: string[];
  onUpdateStepDescription?: (index: number, text: string) => void;
}

export const Step1Input: React.FC<Step1InputProps> = ({ isGenerating, frames, stepDescriptions, onUpdateStepDescription }) => {
  const [isVertical, setIsVertical] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    if (frames && frames.length > 0) {
      const img = new Image();
      img.onload = () => {
        setIsVertical(img.height > img.width);
      };
      img.src = frames[0].data;
    }
  }, [frames]);

  if (isGenerating) {
    return (
      <ImageViewer 
        imageSrc={null} 
        isLoading={isGenerating} 
        loadingText="正在分析视频内容..." 
        placeholderText="正在分析..."
      />
    );
  }

  if (frames && frames.length > 0) {
      return (
        <div className="w-full h-full flex flex-col">
          {/* Enhanced Header */}
          <div className="mb-6 shrink-0 bg-gradient-to-r from-slate-900 to-slate-800/50 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden group">
             {/* Decorative Background Elements */}
             <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 w-60 h-60 bg-pink-500/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 shadow-inner shadow-indigo-500/10 border border-indigo-500/20">
                           <Film className="w-5 h-5" />
                        </div>
                        关键帧预览
                    </h3>
                    <p className="text-sm text-slate-400 max-w-lg leading-relaxed pl-1">
                        已提取 <span className="text-white font-medium">{frames.length}</span> 个关键帧。
                        {stepDescriptions && stepDescriptions.length > 0 
                            ? " AI 已分析步骤，您可以直接在下方编辑描述。"
                            : " 点击左侧“分析关键步骤”让 AI 理解画面内容。"
                        }
                    </p>
                </div>
                
                <div className="flex items-center gap-3 self-start sm:self-center">
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg border border-white/10 backdrop-blur-md">
                        <LayoutGrid className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-medium text-slate-300">
                            {isVertical ? '竖屏源 (9:16)' : '横屏源 (16:9)'}
                        </span>
                     </div>
                </div>
             </div>
          </div>

          {/* Adaptive Grid */}
          <div className={`grid gap-4 overflow-y-auto custom-scrollbar min-h-0 flex-1 content-start pr-2 pb-6 ${
              isVertical 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5' 
                : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'
          }`}>
             {frames.map((frame, idx) => {
                const stepText = stepDescriptions?.[idx] || '';
                const hasAnalysis = stepDescriptions && stepDescriptions.length > 0;

                return (
                  <div key={idx} className="flex flex-col gap-2">
                    <div 
                        className={`relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-900/20 transition-all duration-300 ${
                            isVertical ? 'aspect-[9/16]' : 'aspect-video'
                        }`}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Gradient Overlay for Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-60 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none" />
                      
                      <img 
                        src={frame.data} 
                        alt={`Frame ${idx}`} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                      
                      {/* Timestamp Badge */}
                      <div className="absolute top-2 left-2 z-20">
                          <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono text-slate-200 border border-white/10 flex items-center gap-1.5 shadow-sm group-hover:bg-indigo-600/80 group-hover:border-indigo-500/50 transition-colors">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(frame.timestamp || 0)}
                          </div>
                      </div>

                      {/* Frame Number Indicator */}
                      <div className={`absolute bottom-2 right-2 z-20 transition-all duration-300 transform ${
                          hoveredIdx === idx ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                      }`}>
                          <div className="flex items-center gap-1 bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                            <span>#{idx + 1}</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                      </div>
                    </div>

                    {/* Step Description Input - Only shown if analysis is present or user wants to input */}
                    {onUpdateStepDescription && (
                        <div className={`relative transition-all duration-500 ${hasAnalysis ? 'opacity-100 translate-y-0' : 'opacity-50 grayscale'}`}>
                            <div className="absolute top-2 left-2 pointer-events-none">
                                <MessageSquare className={`w-3 h-3 ${stepText ? 'text-indigo-400' : 'text-slate-600'}`} />
                            </div>
                            <textarea
                                value={stepText}
                                onChange={(e) => onUpdateStepDescription(idx, e.target.value)}
                                placeholder={hasAnalysis ? "步骤描述..." : "等待分析..."}
                                disabled={!hasAnalysis}
                                className={`w-full bg-slate-900/50 border border-slate-800 rounded-lg py-1.5 pl-7 pr-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none custom-scrollbar transition-colors ${
                                    hasAnalysis ? 'hover:bg-slate-900 hover:border-slate-700' : 'cursor-not-allowed text-slate-600'
                                }`}
                                style={{ minHeight: '60px' }}
                            />
                        </div>
                    )}
                  </div>
                );
             })}
          </div>
        </div>
      );
  }

  return (
    <ImageViewer 
      imageSrc={null} 
      isLoading={false} 
      loadingText="" 
      placeholderText="步骤 1: 分析视频内容并准备绘图"
    />
  );
};

const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};
