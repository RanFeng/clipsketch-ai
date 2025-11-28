
import React from 'react';
import { ImageViewer } from '../common/ImageViewer';

interface Step3AvatarProps {
  imageSrc: string | null;
  isGenerating: boolean;
}

export const Step3Avatar: React.FC<Step3AvatarProps> = ({ imageSrc, isGenerating }) => {
  return (
    <ImageViewer 
      imageSrc={imageSrc} 
      isLoading={isGenerating} 
      loadingText="正在融合主角..." 
    />
  );
};
