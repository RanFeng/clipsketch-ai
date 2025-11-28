
import React from 'react';
import { Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { Button } from '../../Button';

interface ImageViewerProps {
  imageSrc: string | null;
  isLoading: boolean;
  loadingText: string;
  placeholderText?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageSrc, isLoading, loadingText, placeholderText }) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden relative shadow-2xl min-h-[300px]">
      {imageSrc ? (
        <>
          <img 
            src={imageSrc} 
            alt="AI Storyboard" 
            className={`w-full h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-50 blur-sm' : 'opacity-100'}`}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-black/50 p-4 rounded-xl backdrop-blur-sm flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-2" />
                <span className="text-white text-sm font-medium">{loadingText}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center max-w-md p-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-500" />
                </div>
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-medium text-white mb-1">{loadingText}</h3>
                <p className="text-xs lg:text-sm text-slate-400">AI 正在绘制手绘故事板</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 opacity-50">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-800 rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-8 h-8 lg:w-10 lg:h-10 text-slate-600" />
              </div>
              <p className="text-xs lg:text-sm text-slate-400 text-center px-4">
                {placeholderText || "输入 API Key 并点击“开始绘图”以创作。"}
              </p>
            </div>
          )}
        </div>
      )}
      
      {imageSrc && !isLoading && (
        <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => {
              const a = document.createElement('a');
              a.href = imageSrc;
              a.download = `storyboard-${new Date().getTime()}.png`;
              a.click();
            }}
            className="shadow-lg text-xs lg:text-sm"
            size="sm"
          >
            <ImageIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-2" />
            保存大图
          </Button>
        </div>
      )}
    </div>
  );
};
