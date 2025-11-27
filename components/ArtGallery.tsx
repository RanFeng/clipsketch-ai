import React, { useEffect, useState, useRef } from 'react';
import { Tag } from '../types';
import { captureFramesAsBase64 } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { 
  X, Loader2, Wand2, Sparkles, AlertCircle, LayoutGrid, 
  Image as ImageIcon, Copy, Check, FileText, Clipboard,
  ChevronLeft, ArrowRight, Quote, RefreshCw
} from 'lucide-react';
import { Button } from './Button';

interface ArtGalleryProps {
  tags: Tag[];
  videoUrl: string;
  onClose: () => void;
}

type GalleryStage = 'idle' | 'has_image';

interface CaptionOption {
  title: string;
  content: string;
  style?: string;
}

export const ArtGallery: React.FC<ArtGalleryProps> = ({ tags, videoUrl, onClose }) => {
  const [sourceFrames, setSourceFrames] = useState<{tagId: string, timestamp: number, data: string}[]>([]);
  const [generatedArt, setGeneratedArt] = useState<string | null>(null);
  const [captionOptions, setCaptionOptions] = useState<CaptionOption[]>([]);
  const [apiKey, setApiKey] = useState('');
  
  // Independent loading states for regeneration
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  
  const [stage, setStage] = useState<GalleryStage>('idle'); // Controls layout visibility
  const [isLoadingFrames, setIsLoadingFrames] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize gallery by capturing frames
  useEffect(() => {
    const initGallery = async () => {
      try {
        setIsLoadingFrames(true);
        const captured = await captureFramesAsBase64(videoUrl, tags);
        setSourceFrames(captured);
      } catch (err) {
        console.error("Failed to capture frames for gallery:", err);
        setError("获取视频帧失败。请确保视频已加载且可访问。");
      } finally {
        setIsLoadingFrames(false);
      }
    };

    initGallery();
  }, [tags, videoUrl]);

  const handleCopyCaption = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePasteApiKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKey(text);
    } catch (err) {
      if (apiKeyInputRef.current) {
        apiKeyInputRef.current.focus();
        apiKeyInputRef.current.select();
      }
      alert("请按 Ctrl+V 粘贴您的 API Key。");
    }
  };

  const validateAndGetAI = () => {
    if (!apiKey.trim()) {
      setError("请输入您的 Google Gemini API Key。");
      if (apiKeyInputRef.current) apiKeyInputRef.current.focus();
      return null;
    }
    if (sourceFrames.length === 0) {
      setError("没有可处理的图片帧。");
      return null;
    }
    setError(null);
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  };

  const handleGenerateImage = async () => {
    const ai = validateAndGetAI();
    if (!ai) return;

    setIsGeneratingImage(true);
    // Don't clear previous art immediately so we can show loading overlay
    // setGeneratedArt(null); 

    try {
      const imageParts: any[] = [
        {
          text: `将这些图片转为可爱风格的手绘图，用于描述整个过程，主体形状特征不要有大的变化。
          除了必要的原料和操作过程，每个步骤标注序号和简短说明，不需要多余的文字。
          每个步骤图要尽量独立，小图之间要有明显的空白分割`
        }
      ];

      sourceFrames.forEach((frame) => {
        imageParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: frame.data.split(',')[1],
          },
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: imageParts },
        config: {
          imageConfig: { 
            aspectRatio: "16:9",
            imageSize: "2K"
          },
          // thinkingConfig: {
          //   ThinkingLevel: "HIGH"
          // }
        }
      });

      let resultImage = null;
      if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                  resultImage = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                  break;
              }
          }
      }

      if (resultImage) {
           setGeneratedArt(resultImage);
           setStage('has_image');
      } else {
          const textPart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
          throw new Error(textPart ? "模型返回了文本而非图片。" : "图片生成失败。");
      }

    } catch (err: any) {
      console.error("Image Gen Error:", err);
      handleError(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateCaption = async () => {
    const ai = validateAndGetAI();
    if (!ai) return;

    setIsGeneratingCaptions(true);
    setCaptionOptions([]);

    try {
      const textParts: any[] = [
        {
          text: `根据给定的图像，生成 3 个不同风格的小红书爆款宣传文案。使用中文。
          
          要求：
          1. 风格1：情感共鸣/故事型（温馨、治愈）。
          2. 风格2：干货教程型（清晰、步骤感强）。
          3. 风格3：短小精悍/种草型（带Emoji，吸引眼球）。

          请严格以 JSON 数组格式返回，不要包含 Markdown 代码块标记。格式如下：
          [
            { "title": "标题1", "content": "文案内容1..." },
            { "title": "标题2", "content": "文案内容2..." },
            { "title": "标题3", "content": "文案内容3..." }
          ]`
        }
      ];

      sourceFrames.forEach((frame) => {
        textParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: frame.data.split(',')[1],
          },
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: textParts },
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text;
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          if (Array.isArray(parsed)) {
            setCaptionOptions(parsed);
          } else {
             throw new Error("返回格式不正确");
          }
        } catch (e) {
          console.error("JSON Parse Error", e);
          setCaptionOptions([{ title: "生成结果", content: responseText }]);
        }
      } else {
        throw new Error("文案生成失败。");
      }

    } catch (err: any) {
      console.error("Caption Gen Error:", err);
      handleError(err);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const handleError = (err: any) => {
    if (err.message && (err.message.includes('permission') || err.message.includes('403') || err.message.includes('PERMISSION_DENIED'))) {
      setError("访问被拒绝 (403)。请确保您的 API Key 支持该模型。");
    } else {
      setError(err.message || "发生未知错误。");
    }
  };

  if (isLoadingFrames) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">正在从视频提取帧...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-14 lg:h-16 px-4 lg:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 gap-2 shadow-md z-10">
        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
           <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white pl-0 text-xs lg:text-sm">
             <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 mr-1" />
             <span className="hidden sm:inline">返回视频</span>
           </Button>

           <div className="h-6 w-px bg-slate-800 mx-2 hidden sm:block"></div>

           <h2 className="text-base lg:text-xl font-bold text-white flex items-center gap-2">
             <Wand2 className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-400" />
             <span className="hidden sm:inline">AI 艺术工作室</span>
             <span className="sm:hidden">AI 工作室</span>
           </h2>
        </div>

        <div className="flex items-center gap-2 lg:gap-3 flex-1 justify-end min-w-0">
           {/* API Key Input */}
           <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all max-w-[120px] lg:max-w-[220px]">
              <input
                ref={apiKeyInputRef}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Gemini API Key..."
                className="bg-transparent border-none text-[10px] lg:text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-0 w-full px-2"
              />
              <button 
                onClick={handlePasteApiKey}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                title="粘贴 API Key"
              >
                <Clipboard className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
              </button>
           </div>

           {/* Image Generation Button */}
           <Button 
             onClick={handleGenerateImage}
             isLoading={isGeneratingImage}
             disabled={isGeneratingImage}
             size="sm"
             className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-none shadow-lg shadow-indigo-900/20 whitespace-nowrap"
           >
             {generatedArt ? (
               <>
                 <RefreshCw className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
                 <span className="text-xs lg:text-sm">重新绘图</span>
               </>
             ) : (
               <>
                 <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
                 <span className="text-xs lg:text-sm">开始绘图</span>
               </>
             )}
           </Button>
        </div>
      </div>
      
      {/* Error Banner */}
      {error && (
         <div className="bg-red-900/50 border-b border-red-900/30 px-4 py-2 text-center text-xs text-red-200">
           {error}
         </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
        
        {/* Sidebar: Inputs & Caption (Left on Desktop, Bottom on Mobile) */}
        <div className="w-full lg:w-96 h-[45vh] lg:h-full border-t lg:border-t-0 lg:border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 order-2 lg:order-1">
           
           {/* Section 1: Source Frames */}
           <div className={`flex-1 overflow-hidden flex flex-col ${stage === 'has_image' ? 'h-1/3 min-h-[120px] border-b border-slate-800' : 'h-full'}`}>
              <div className="p-3 lg:p-4 pb-2 shrink-0">
                <h3 className="text-xs lg:text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  参考帧
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  已选 {sourceFrames.length} 帧
                </p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 lg:px-4 pb-4 space-y-3">
                {sourceFrames.map((frame, index) => (
                  <div key={frame.tagId} className="flex gap-3 items-start group">
                     <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono shrink-0 mt-1 border border-slate-700">
                       {index + 1}
                     </div>
                     <div className="relative flex-1 aspect-[9/16] rounded-md overflow-hidden bg-black border border-slate-800 shadow-sm transition-all group-hover:border-indigo-500/50">
                        <img src={frame.data} alt="Frame" className="w-full h-full object-contain opacity-90" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                           <span className="text-[10px] font-mono text-white/90 ml-1">
                             {(frame.timestamp).toFixed(1)}s
                           </span>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
           </div>

           {/* Section 2: Generated Captions (Visible only after image generated) */}
           {stage === 'has_image' && (
             <div className="flex flex-col flex-1 bg-slate-900 animate-in slide-in-from-bottom duration-300 min-h-0">
                <div className="p-3 lg:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
                   <h3 className="text-xs lg:text-sm font-semibold text-slate-300 flex items-center gap-2">
                     <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-pink-500" />
                     社交媒体文案
                   </h3>
                   
                   {/* Caption Generation Button - Now in Sidebar */}
                   <Button 
                      onClick={handleGenerateCaption}
                      isLoading={isGeneratingCaptions}
                      disabled={isGeneratingCaptions}
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs px-2"
                   >
                     {captionOptions.length > 0 ? (
                       <>
                         <RefreshCw className="w-3 h-3 mr-1.5" />
                         重新生成
                       </>
                     ) : (
                       <>
                         <Sparkles className="w-3 h-3 mr-1.5" />
                         生成文案
                       </>
                     )}
                   </Button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 relative bg-slate-950">
                   {isGeneratingCaptions ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                        <span className="animate-pulse">正在构思 3 种不同风格的文案...</span>
                     </div>
                   ) : captionOptions.length > 0 ? (
                     <div className="space-y-4">
                        {captionOptions.map((opt, idx) => (
                          <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 hover:border-pink-500/30 transition-colors group">
                             <div className="flex justify-between items-start mb-2 gap-2">
                                <h4 className="font-bold text-xs lg:text-sm text-pink-200 line-clamp-1 flex-1" title={opt.title}>
                                  {opt.title}
                                </h4>
                                <button 
                                  onClick={() => handleCopyCaption(`${opt.title}\n\n${opt.content}`, idx)}
                                  className={`shrink-0 p-1.5 rounded-md transition-all ${
                                    copiedIndex === idx 
                                      ? "bg-green-500/20 text-green-400" 
                                      : "bg-slate-700 text-slate-400 hover:bg-indigo-600 hover:text-white"
                                  }`}
                                  title="复制标题和内容"
                                >
                                  {copiedIndex === idx ? <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> : <Copy className="w-3 h-3 lg:w-3.5 lg:h-3.5" />}
                                </button>
                             </div>
                             <div className="text-[10px] lg:text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-900/50 p-2 rounded-lg max-h-40 overflow-y-auto custom-scrollbar">
                               {opt.content}
                             </div>
                             <div className="mt-2 flex items-center gap-1.5">
                               <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                                 {idx === 0 ? "情感故事" : idx === 1 ? "干货教程" : "短小精悍"}
                                </span>
                             </div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                        <Quote className="w-8 h-8 mb-3 opacity-20" />
                        <p className="text-xs mb-3 max-w-[180px]">点击上方按钮，AI 将为您生成 3 种不同风格的小红书爆款文案</p>
                     </div>
                   )}
                </div>
             </div>
           )}
        </div>

        {/* Right Stage: Result (Right on Desktop, Top on Mobile) */}
        <div className="flex-1 bg-black/20 relative p-4 lg:p-8 flex flex-col min-w-0 order-1 lg:order-2 h-[55vh] lg:h-full">
           <div className="flex-1 flex items-center justify-center bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden relative shadow-2xl">
             {generatedArt ? (
               <>
                 <img 
                   src={generatedArt} 
                   alt="AI Storyboard" 
                   className={`w-full h-full object-contain transition-opacity duration-300 ${isGeneratingImage ? 'opacity-50 blur-sm' : 'opacity-100'}`}
                 />
                 {isGeneratingImage && (
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                   </div>
                 )}
               </>
             ) : (
               <div className="text-center max-w-md p-6">
                 {isGeneratingImage ? (
                   <div className="flex flex-col items-center gap-4">
                     <div className="relative">
                       <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
                       <div className="absolute inset-0 flex items-center justify-center">
                         <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-500" />
                       </div>
                     </div>
                     <div>
                       <h3 className="text-base lg:text-lg font-medium text-white mb-1">正在创作大作...时间可能非常长，不要关闭本页面</h3>
                       <p className="text-xs lg:text-sm text-slate-400">分析画面 • 绘制故事板</p>
                     </div>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center gap-4 opacity-50">
                     <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-800 rounded-2xl flex items-center justify-center">
                       <ImageIcon className="w-8 h-8 lg:w-10 lg:h-10 text-slate-600" />
                     </div>
                     <p className="text-xs lg:text-sm text-slate-400 text-center px-4">输入 API Key 并点击“开始绘图”以创作。</p>
                   </div>
                 )}
               </div>
             )}
           </div>
           
           {generatedArt && !isGeneratingImage && (
             <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = generatedArt;
                    a.download = `storyboard-${new Date().getTime()}.png`;
                    a.click();
                  }}
                  className="shadow-lg text-xs lg:text-sm"
                  size="sm"
                >
                  <ImageIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-2" />
                  保存图片
                </Button>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};