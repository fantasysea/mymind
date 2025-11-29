import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Send, X, Loader2 } from 'lucide-react';
import { Language, TRANSLATIONS } from '../types';

interface InputAreaProps {
  onSubmit: (text: string, image: File | null) => Promise<void>;
  isProcessing: boolean;
  language: Language;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSubmit, isProcessing, language }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image) return;
    await onSubmit(text, image);
    setText('');
    clearImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white border-t border-slate-200 p-4 shadow-lg z-20">
      <div className="max-w-4xl mx-auto">
        {preview && (
          <div className="relative inline-block mb-3 animate-fade-in">
            <img 
              src={preview} 
              alt="Preview" 
              className="h-24 w-auto rounded-lg border border-slate-200 object-cover shadow-sm" 
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-full transition-colors"
            title="Upload Image"
          >
            <ImageIcon size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.inputPlaceholder}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 text-slate-700 placeholder:text-slate-400 text-sm sm:text-base"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto'; 
              target.style.height = `${target.scrollHeight}px`;
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={isProcessing || (!text && !image)}
            className={`p-2 rounded-full mb-0.5 transition-all duration-300 ${
              text || image 
                ? 'bg-primary text-white shadow-md hover:shadow-lg hover:scale-105' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <div className="text-center mt-2">
            <p className="text-xs text-slate-400">{t.subText}</p>
        </div>
      </div>
    </div>
  );
};