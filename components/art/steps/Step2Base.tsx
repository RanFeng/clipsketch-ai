
import React from 'react';
import { ImageViewer } from '../common/ImageViewer';

interface Step2BaseProps {
  imageSrc: string | null;
  isGenerating: boolean;
}

export const Step2Base: React.FC<Step2BaseProps> = ({ imageSrc, isGenerating }) => {
  return (
    <ImageViewer 
      imageSrc={imageSrc} 
      isLoading={isGenerating} 
      loadingText="正在绘制基础故事板..." 
    />
  );
};
