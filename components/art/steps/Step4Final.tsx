
import React from 'react';
import { ImageViewer } from '../common/ImageViewer';

interface Step4FinalProps {
  imageSrc: string | null;
  isGenerating: boolean;
}

export const Step4Final: React.FC<Step4FinalProps> = ({ imageSrc, isGenerating }) => {
  return (
    <ImageViewer 
      imageSrc={imageSrc} 
      isLoading={isGenerating} 
      loadingText="正在优化最终画面..." 
    />
  );
};
