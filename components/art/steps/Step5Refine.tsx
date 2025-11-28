import React from 'react';
import { Grid3X3, Package, Loader2, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Button } from '../../Button';
import { SubPanel } from '../../../services/gemini';

interface Step5RefineProps {
  subPanels: SubPanel[];
  onBatchDownload: () => void;
  onDownloadSingle: (url: string, filename: string) => void;
  onRegenerateSingle: (index: number) => void;
}

export const Step5Refine: React.FC<Step5RefineProps> = ({ 
  subPanels, onBatchDownload, onDownloadSingle, onRegenerateSingle 
}) => {
  const completedCount = subPanels.filter(p => p.status === 'completed').length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-indigo-400" />
          精修分镜
        </h3>
        <Button 
          onClick={onBatchDownload}
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={completedCount === 0}
        >
          <Package className="w-4 h-4" />
          批量下载 ({completedCount})
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {subPanels.map((panel) => (
          <div key={panel.index} className="relative aspect-[9/16] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-lg">
            {panel.imageUrl ? (
              <img src={panel.imageUrl} alt={`Panel ${panel.index + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
                {panel.status === 'generating' ? (
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                ) : panel.status === 'error' ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <span className="text-xs text-red-400">生成失败</span>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-slate-700"></div>
                )}
              </div>
            )}
            
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
              <span className="text-xs font-bold text-white shadow-black drop-shadow-md">#{panel.index + 1}</span>
              <div className="flex gap-2">
                {panel.imageUrl && (
                  <Button 
                    size="icon" 
                    className="h-8 w-8 bg-black/50 hover:bg-green-600 text-white backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadSingle(panel.imageUrl!, `panel-${panel.index + 1}.png`);
                    }}
                    title="下载此格"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  size="icon" 
                  className="h-8 w-8 bg-black/50 hover:bg-indigo-600 text-white backdrop-blur-sm"
                  onClick={() => onRegenerateSingle(panel.index)}
                  disabled={panel.status === 'generating'}
                  title="重新生成此格"
                >
                  <RefreshCw className={`w-4 h-4 ${panel.status === 'generating' ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};