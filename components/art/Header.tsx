
import React, { useRef } from 'react';
import { 
  ChevronLeft, Wand2, Settings, 
  Box, BrainCircuit, Clipboard, Layers
} from 'lucide-react';
import { Button } from '../Button';
import { ProviderType } from '../../services/llm';
import { SocialPlatformStrategy } from '../../services/strategies';

interface HeaderProps {
  onClose: () => void;
  targetPlatform: SocialPlatformStrategy;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  provider: ProviderType;
  setProvider: (p: ProviderType) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  useThinking: boolean;
  setUseThinking: (use: boolean) => void;
  useBatch: boolean;
  setUseBatch: (use: boolean) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onClose, targetPlatform, showSettings, setShowSettings,
  provider, setProvider, baseUrl, setBaseUrl, useThinking, setUseThinking,
  useBatch, setUseBatch, apiKey, setApiKey
}) => {
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

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

  const StrategyIcon = targetPlatform.icon;
  // Fallback map if needed
  let badgeColorClass = "bg-slate-800 text-slate-300";
  if (targetPlatform.id === 'xhs') badgeColorClass = "bg-pink-500/20 text-pink-400 border-pink-500/30";
  if (targetPlatform.id === 'instagram') badgeColorClass = "bg-purple-500/20 text-purple-400 border-purple-500/30";

  return (
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
          <span className={`text-xs px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1 ${badgeColorClass}`}>
             <StrategyIcon className="w-3 h-3" /> {targetPlatform.name} 模式
          </span>
        </h2>
      </div>

      <div className="flex items-center gap-2 lg:gap-3 flex-1 justify-end min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className={`w-8 h-8 ${showSettings ? 'text-indigo-400 bg-slate-800' : 'text-slate-400'}`}
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4" />
        </Button>

        {showSettings && (
          <div className="absolute top-16 right-4 lg:right-40 z-50 bg-slate-900 border border-slate-700 shadow-xl rounded-xl p-4 w-72 animate-in slide-in-from-top-2">
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-400 block mb-2 flex items-center gap-1">
                <Box className="w-3 h-3" /> 服务提供商
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => {
                    setProvider('google');
                    setBaseUrl("https://generativelanguage.googleapis.com/v1beta");
                  }}
                  className={`text-xs py-1.5 rounded-md transition-all ${provider === 'google' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Google Gemini
                </button>
                <button
                  onClick={() => {
                    setProvider('openai');
                    setBaseUrl("https://api.openai.com/v1");
                  }}
                  className={`text-xs py-1.5 rounded-md transition-all ${provider === 'openai' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  OpenAI
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1">API Base URL (Optional)</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={provider === 'google' ? "https://generativelanguage.googleapis.com/v1beta" : "https://api.openai.com/v1"}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 text-indigo-400" />
                  深度思考 (Deep Thinking)
                </span>
                <span className="text-[10px] text-slate-500">
                  {provider === 'google' ? 'Gemini 思考模式' : 'OpenAI Reasoning (o1)'}
                </span>
              </div>
              <div 
                className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${useThinking ? 'bg-indigo-600' : 'bg-slate-700'}`}
                onClick={() => setUseThinking(!useThinking)}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useThinking ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  批量生成模式 (Batch)
                </span>
                <span className="text-[10px] text-slate-500 max-w-[180px] leading-tight mt-0.5">
                  启用后使用 Batch API 节省成本 (较慢)。<br/>关闭则并发请求 (较快，消耗 Quota)。
                </span>
              </div>
              <div 
                className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors shrink-0 ${useBatch ? 'bg-indigo-600' : 'bg-slate-700'}`}
                onClick={() => setUseBatch(!useBatch)}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useBatch ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>

          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all max-w-[120px] lg:max-w-[220px]">
          <input
            ref={apiKeyInputRef}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key..."
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
      </div>
    </div>
  );
};
