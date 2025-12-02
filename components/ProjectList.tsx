
import React from 'react';
import { ProjectState } from '../services/storage';
import { formatTime } from '../utils';
import { Trash2, Film, Edit2, Calendar, ArrowRight } from 'lucide-react';
import { Button } from './Button';

interface ProjectListProps {
  projects: ProjectState[];
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelectProject, onDeleteProject }) => {
  if (projects.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-10 px-4 pb-10">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <ClockIcon className="w-5 h-5 text-indigo-400" />
        最近项目
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {projects.map((project) => (
          <div 
            key={project.id}
            className="group bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-indigo-500/50 hover:bg-slate-800 transition-all cursor-pointer"
            onClick={() => onSelectProject(project.id)}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 bg-slate-950 rounded-lg flex items-center justify-center shrink-0 border border-slate-800 text-slate-600 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors">
                 {project.coverImage ? (
                     <img src={project.coverImage} alt="Cover" className="w-full h-full object-cover rounded-lg" />
                 ) : (
                     <Film className="w-6 h-6" />
                 )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                  {project.name || '未命名项目'}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.lastUpdated).toLocaleDateString()} {new Date(project.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  {project.tags && project.tags.length > 0 && (
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                        {project.tags.length} 个标记
                      </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="text-indigo-400 text-xs font-medium flex items-center mr-2">
                   打开 <ArrowRight className="w-3 h-3 ml-1" />
               </div>
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                 onClick={(e) => {
                   e.stopPropagation();
                   if(confirm('确定要删除这个项目吗？')) {
                       onDeleteProject(project.id);
                   }
                 }}
               >
                 <Trash2 className="w-4 h-4" />
               </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClockIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);
