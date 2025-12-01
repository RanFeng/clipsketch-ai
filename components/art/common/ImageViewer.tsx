import React from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageViewerProps {
  imageSrc: string | null;
  isLoading: boolean;
  loadingText?: string;
  placeholderText?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ 
  imageSrc, 
  isLoading, 
  loadingText = "Generating...", 
  placeholderText = "Waiting for generation..." 
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group">
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-300 text-sm font-medium animate-pulse">{loadingText}</p>
        </div>
      ) : null}

      {imageSrc ? (
        <div className="flex-1 relative w-full h-full flex items-center justify-center p-4">
          <img 
            src={imageSrc} 
            alt="Generated Content" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-10 h-10 opacity-50" />
          </div>
          <p className="text-sm font-medium">{placeholderText}</p>
        </div>
      )}
    </div>
  );
};