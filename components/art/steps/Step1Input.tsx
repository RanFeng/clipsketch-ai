
import React from 'react';
import { ImageViewer } from '../common/ImageViewer';

interface Step1InputProps {
  isGenerating: boolean;
}

export const Step1Input: React.FC<Step1InputProps> = ({ isGenerating }) => {
  return (
    <ImageViewer 
      imageSrc={null} 
      isLoading={isGenerating} 
      loadingText="正在初始化..." 
      placeholderText="步骤 1: 分析视频内容并准备绘图"
    />
  );
};
