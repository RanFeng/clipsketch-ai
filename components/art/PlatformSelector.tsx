
import React from 'react';
import { X, Globe } from 'lucide-react';
import { Button } from '../Button';
import { SocialPlatformStrategy, strategies } from '../../services/strategies';

interface PlatformSelectorProps {
  onSelect: (platform: SocialPlatformStrategy) => void;
  onClose: () => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({ onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
      <Button variant="ghost" className="absolute top-4 left-4" onClick={onClose}>
        <X className="w-6 h-6" />
      </Button>
      
      <div className="max-w-2xl w-full px-6 text-center">
        <div className="mb-8">
          <Globe className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">选择目标平台</h1>
          <p className="text-slate-400">我们将根据您的选择，优化 AI 的绘画风格和文案语言。</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            // Extract the color class like 'text-pink-500' to create hover/bg variations dynamically if needed, 
            // or just rely on the Strategy object configuration if we expand it.
            // For now, hardcoding hover styles based on the primaryColorClass is a bit tricky without Tailwind arbitrary values,
            // so we will simplify or map them.
            
            let hoverBorder = "hover:border-slate-500";
            let bgIcon = "group-hover:bg-slate-500";
            let iconColor = strategy.primaryColorClass;
            let groupHoverText = "group-hover:text-white";

            if (strategy.id === 'xhs') {
                hoverBorder = "hover:border-pink-500 hover:shadow-pink-500/20";
                bgIcon = "group-hover:bg-pink-500 bg-pink-500/20";
                iconColor = "text-pink-500";
            } else if (strategy.id === 'instagram') {
                hoverBorder = "hover:border-purple-500 hover:shadow-purple-500/20";
                bgIcon = "group-hover:bg-purple-500 bg-purple-500/20";
                iconColor = "text-purple-500";
            }

            return (
              <button 
                key={strategy.id}
                onClick={() => onSelect(strategy)}
                className={`group relative bg-slate-900 border border-slate-700 rounded-2xl p-8 transition-all hover:scale-105 hover:shadow-2xl text-left ${hoverBorder}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${bgIcon}`}>
                  <Icon className={`w-6 h-6 ${iconColor} ${groupHoverText}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{strategy.name}</h3>
                <p className="text-sm text-slate-500 group-hover:text-slate-300">{strategy.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
