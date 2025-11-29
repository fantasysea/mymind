import React from 'react';
import { Memory, ContentType } from '../types';
import { Tag, Calendar, Image as ImageIcon, Type } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
  onClick: (memory: Memory) => void;
  isHighlighted?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick, isHighlighted }) => {
  return (
    <div 
      onClick={() => onClick(memory)}
      className={`group relative break-inside-avoid mb-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
        ${isHighlighted 
          ? 'bg-indigo-50 border-indigo-300 shadow-indigo-100 ring-2 ring-indigo-400 ring-offset-2' 
          : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
        }
      `}
    >
      {memory.type === ContentType.IMAGE && memory.imageData && (
        <div className="relative h-48 w-full overflow-hidden bg-slate-100">
          <img 
            src={memory.imageData} 
            alt="Memory" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            Image
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isHighlighted ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'
            }`}>
                {memory.category}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
                {new Date(memory.createdAt).toLocaleDateString()}
            </span>
        </div>

        <h3 className="text-sm font-semibold text-slate-800 leading-snug mb-2 line-clamp-3">
            {memory.summary}
        </h3>

        {memory.type === ContentType.TEXT && (
           <p className="text-xs text-slate-500 line-clamp-3 mb-3 font-mono bg-slate-50 p-2 rounded">
             {memory.originalContent}
           </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {memory.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              #{tag}
            </span>
          ))}
          {memory.tags.length > 3 && (
            <span className="text-[10px] text-slate-400 px-1.5 py-0.5">+{memory.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
};