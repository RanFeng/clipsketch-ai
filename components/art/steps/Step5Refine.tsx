
import React from 'react';
import { Grid3X3, Package, Loader2, AlertCircle, Download, RefreshCw, Clock } from 'lucide-react';
import { Button } from '../../Button';
import { SubPanel } from '../../../services/gemini';

interface Step5RefineProps {
  subPanels: SubPanel[];
  onBatchDownload: () => void;
  onDownloadSingle: (url: string, filename: string) => void;
  onRegenerateSingle: (index: number) => void;
  
  // Batch Props
  batchJobId?: string | null;
  batchStatus?: 'idle' | 'pending' | 'completed' | 'failed';
  onRefreshBatch?: () => void;
  
  useBatch: boolean;
}

export const Step5Refine: React.FC<Step5RefineProps> = ({ 
  subPanels, onBatchDownload, onDownloadSingle, onRegenerateSingle,
  batchJobId, batchStatus, onRefreshBatch, useBatch
}) => {
  const completedCount = subPanels.filter(p => p.status === 'completed').length;

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-indigo-400" />
          精修分镜
        </h3>
        
        {/* Only show Refresh Button if useBatch is active AND there is a jobId */}
        {useBatch && batchJobId ? (
            <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-400 hidden sm:inline">任务ID: {batchJobId.slice(-8)}</span>
                 <Button 
                    onClick={onRefreshBatch}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 animate-pulse"
                 >
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                    刷新任务状态
                 </Button>
            </div>
        ) : (
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
        )}
      </div>

      {/* Only show the full blocking loading UI if useBatch is active */}
      {useBatch && batchJobId && batchStatus === 'pending' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="relative mb-6">
                 <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-indigo-400" />
                 </div>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">批量任务进行中...</h4>
              <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
                  已提交批量生成请求。由于使用 Batch API 以节省成本，处理可能需要一些时间。
                  <br/>您可以点击右上角的“刷新任务状态”来查看进度。
              </p>
              <div className="text-xs font-mono text-slate-600 bg-black/30 px-3 py-1 rounded">
                  Job ID: {batchJobId}
              </div>
          </div>
      ) : (
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
      )}
    </div>
  );
};
