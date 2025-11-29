import React, { useState, useEffect, useRef } from 'react';
import { X, Bot, User, Sparkles, ArrowRight, Filter, Calendar, Tag } from 'lucide-react';
import { ChatMessage, Memory, Language, TRANSLATIONS, SearchFilters } from '../types';
import { queryBrain } from '../services/gemini';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  onHighlightMemories: (ids: string[]) => void;
  language: Language;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  isOpen, 
  onClose, 
  memories,
  onHighlightMemories,
  language
}) => {
  const t = TRANSLATIONS[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when language changes
  useEffect(() => {
    setMessages([{ role: 'model', text: t.welcomeMessage }]);
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await queryBrain(userMsg.text, memories, language);
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: result.answer,
        relatedMemoryIds: result.relatedIds,
        usedFilters: result.usedFilters
      }]);

      if (result.relatedIds && result.relatedIds.length > 0) {
        onHighlightMemories(result.relatedIds);
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: t.errorGeneric }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const renderFilters = (filters?: SearchFilters) => {
    if (!filters) return null;
    const hasCategory = !!filters.category;
    const hasDate = !!filters.startDate || !!filters.endDate;
    const hasTags = filters.tags && filters.tags.length > 0;

    if (!hasCategory && !hasDate && !hasTags) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2 mb-1">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">{t.filterApplied}:</span>
        {hasCategory && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full border border-indigo-100">
            <Filter size={10} />
            {t.category}: {filters.category}
          </span>
        )}
        {hasTags && filters.tags?.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded-full border border-pink-100">
            <Tag size={10} />
            #{tag}
          </span>
        ))}
        {hasDate && (
           <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-100">
             <Calendar size={10} />
             {t.date}
           </span>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      />
      
      <div className="bg-white w-full sm:w-[500px] h-[85vh] sm:h-[650px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-transform animate-in slide-in-from-bottom-10 fade-in duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-300" />
            <h2 className="font-semibold">{t.recallTitle}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`flex flex-col gap-2 max-w-[85%]`}>
                
                {/* Message Bubble */}
                <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-slate-800 text-white rounded-2xl rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-none'
                }`}>
                  {msg.role === 'model' && renderFilters(msg.usedFilters)}
                  {msg.text}
                </div>

                {/* View Results Button */}
                {msg.role === 'model' && msg.relatedMemoryIds && msg.relatedMemoryIds.length > 0 && (
                   <button 
                     onClick={onClose}
                     className="self-start flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors border border-indigo-200"
                   >
                     <span>{msg.relatedMemoryIds.length} {t.referencesFound}</span>
                     <span className="w-1 h-1 bg-indigo-300 rounded-full" />
                     <span className="uppercase tracking-wider font-bold text-[10px]">{t.viewReferences}</span>
                     <ArrowRight size={12} />
                   </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                 <span className="text-xs text-slate-400 mr-2">{t.searching}</span>
                 <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.chatPlaceholder}
              className="w-full pl-4 pr-12 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Sparkles size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};