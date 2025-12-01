
import React from 'react';
import { ImageViewer } from '../common/ImageViewer';
import { Download } from 'lucide-react';
import { Button } from '../../Button';

interface Step6CoverProps {
  imageSrc: string | null;
  isGenerating: boolean;
  onDownload?: () => void;
}

export const Step6Cover: React.FC<Step6CoverProps> = ({ imageSrc, isGenerating, onDownload }) => {
  return (
    <div className="relative w-full h-full group">
      <ImageViewer 
        imageSrc={imageSrc} 
        isLoading={isGenerating} 
        loadingText="正在生成视频封面..." 
        placeholderText="选择文案后点击生成封面"
      />
      {imageSrc && !isGenerating && onDownload && (
        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
           <Button 
             onClick={onDownload}
             variant="primary"
             className="shadow-lg shadow-black/20 bg-indigo-600/90 hover:bg-indigo-600 backdrop-blur-sm"
           >
             <Download className="w-4 h-4 mr-2" />
             下载封面
           </Button>
        </div>
      )}
    </div>
  );
};
