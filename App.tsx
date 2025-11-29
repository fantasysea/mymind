import React, { useState, useEffect, useMemo } from 'react';
import { Memory, ContentType, Language, TRANSLATIONS } from './types';
import { analyzeContent } from './services/gemini';
import { InputArea } from './components/InputArea';
import { MemoryCard } from './components/MemoryCard';
import { ChatInterface } from './components/ChatInterface';
import { Brain, Sparkles, Filter, Globe } from 'lucide-react';

// Simple UUID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showChat, setShowChat] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [language, setLanguage] = useState<Language>('zh'); // Default to Chinese based on prompt

  const t = TRANSLATIONS[language];

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('secondBrain_memories');
    if (saved) {
      try {
        setMemories(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load memories", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('secondBrain_memories', JSON.stringify(memories));
  }, [memories]);

  // Derived state
  const categories = useMemo(() => {
    const cats = new Set(memories.map(m => m.category));
    return ['All', ...Array.from(cats)];
  }, [memories]);

  const filteredMemories = useMemo(() => {
    let result = memories;
    // If specific highlight is active, prioritize showing those first or filtering to them
    // But typically user wants to see context. 
    // Here we handle category filter.
    if (selectedCategory !== 'All') {
      result = result.filter(m => m.category === selectedCategory);
    }
    // Sort by creation date desc
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [memories, selectedCategory]);

  const handleSubmit = async (text: string, image: File | null) => {
    setIsProcessing(true);
    try {
      let imageData = null;
      if (image) {
        imageData = await fileToBase64(image);
      }

      const existingCats = categories.filter(c => c !== 'All');
      const analysis = await analyzeContent(text, imageData, existingCats, language);

      const newMemory: Memory = {
        id: generateId(),
        originalContent: text || (image ? 'Image Upload' : ''),
        type: image ? ContentType.IMAGE : ContentType.TEXT,
        imageData: imageData || undefined,
        summary: analysis.summary,
        tags: analysis.tags,
        category: analysis.category,
        createdAt: Date.now()
      };

      setMemories(prev => [newMemory, ...prev]);
    } catch (error) {
      console.error("Failed to add memory:", error);
      alert(t.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHighlight = (ids: string[]) => {
    setHighlightedIds(ids);
    // Reset category to 'All' so we can see the highlighted items if they are in different categories
    if (ids.length > 0) {
        setSelectedCategory('All');
    }
    
    // Auto-scroll to the first highlighted item (simple DOM approach)
    setTimeout(() => {
        const firstId = ids[0];
        const el = document.getElementById(`memory-${firstId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
               <Brain className="text-primary" size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">{t.appTitle}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
             <button
               onClick={toggleLanguage}
               className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 px-3 py-2 rounded-full text-sm font-medium transition-colors"
             >
                <Globe size={16} />
                <span className="uppercase">{language}</span>
             </button>

             <button 
              onClick={() => setShowChat(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              <Sparkles size={16} className="text-yellow-400" />
              <span className="hidden sm:inline">{t.askAi}</span>
              <span className="sm:hidden">{t.ask}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        
        {/* Filters & Controls */}
        <div className="px-4 py-4 max-w-7xl mx-auto w-full flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <div className="flex gap-2">
                <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === 'All' 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t.all}
                </button>
                {categories.filter(c => c !== 'All').map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* Masonry Grid of Memories */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 scroll-smooth">
          <div className="max-w-7xl mx-auto">
             {memories.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-center mt-20">
                 <div className="bg-slate-100 p-6 rounded-full mb-4">
                    <Brain size={48} className="text-slate-300" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-700">{t.emptyTitle}</h3>
                 <p className="text-slate-500 max-w-xs mt-2">{t.emptyDesc}</p>
               </div>
             ) : (
               <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                {filteredMemories.map(memory => (
                  <div key={memory.id} id={`memory-${memory.id}`}>
                    <MemoryCard 
                        memory={memory} 
                        onClick={() => {}} 
                        isHighlighted={highlightedIds.includes(memory.id)}
                    />
                  </div>
                ))}
               </div>
             )}
          </div>
        </div>

        {/* Bottom Input Area */}
        <InputArea onSubmit={handleSubmit} isProcessing={isProcessing} language={language} />
      </main>

      {/* Chat Overlay */}
      <ChatInterface 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
        memories={memories}
        onHighlightMemories={handleHighlight}
        language={language}
      />
    </div>
  );
};

export default App;