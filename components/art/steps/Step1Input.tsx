
import React, { useState, useEffect } from 'react';
import { ImageViewer } from '../common/ImageViewer';
import { FrameData } from '../../../services/gemini';
import { Film, LayoutGrid, Clock, ChevronRight } from 'lucide-react';

interface Step1InputProps {
  isGenerating: boolean;
  frames: FrameData[];
}

export const Step1Input: React.FC<Step1InputProps> = ({ isGenerating, frames }) => {
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
                        已提取 <span className="text-white font-medium">{frames.length}</span> 个关键帧。AI 将基于这些画面构建故事板。
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
                ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6' 
                : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'
          }`}>
             {frames.map((frame, idx) => (
                <div 
                    key={idx} 
                    className={`relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-900/20 hover:-translate-y-1 transition-all duration-300 ${
                        isVertical ? 'aspect-[9/16]' : 'aspect-video'
                    }`}
                    style={{ animation: `fadeIn 0.5s ease-out ${idx * 0.05}s backwards` }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                >
                   {/* Gradient Overlay for Text Readability */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-60 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none" />
                   
                   <img 
                    src={frame.data} 
                    alt={`Frame ${idx}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                   />
                   
                   {/* Timestamp Badge */}
                   <div className="absolute top-2 left-2 z-20">
                       <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono text-slate-200 border border-white/10 flex items-center gap-1.5 shadow-sm group-hover:bg-indigo-600/80 group-hover:border-indigo-500/50 transition-colors">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(frame.timestamp || 0)}
                       </div>
                   </div>

                   {/* Frame Number Indicator (Slides in on hover) */}
                   <div className={`absolute bottom-2 right-2 z-20 transition-all duration-300 transform ${
                       hoveredIdx === idx ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                   }`}>
                      <div className="flex items-center gap-1 bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg">
                        <span>#{idx + 1}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                   </div>
                </div>
             ))}
          </div>
          
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
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
