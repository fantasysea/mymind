export enum ContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  LINK = 'LINK'
}

export interface Memory {
  id: string;
  originalContent: string;
  type: ContentType;
  imageData?: string; // Base64 string for images
  summary: string;
  tags: string[];
  category: string;
  createdAt: number;
  embedding?: number[]; // Vector representation for semantic search
}

export interface ProcessingResult {
  summary: string;
  tags: string[];
  category: string;
  embedding?: number[];
}

export interface SearchFilters {
  category?: string | null;
  tags?: string[];
  startDate?: number | null;
  endDate?: number | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  relatedMemoryIds?: string[]; // IDs of memories used to generate this answer
  usedFilters?: SearchFilters; // Metadata about filters applied during search
}

export type Language = 'en' | 'zh';

export const TRANSLATIONS = {
  en: {
    appTitle: 'Second Brain',
    askAi: 'Ask AI',
    ask: 'Ask',
    emptyTitle: 'Your brain is empty',
    emptyDesc: 'Start typing notes, pasting articles, or uploading screenshots below.',
    inputPlaceholder: 'Type a note, paste an article, or upload a screenshot...',
    subText: 'Auto-tagged, categorized, and vectorized for efficient recall.',
    processing: 'Processing...',
    recallTitle: 'Recall Assistant',
    chatPlaceholder: 'Ask about your notes... (e.g. "Show coding tips from last week")',
    welcomeMessage: 'Hi! I am your Second Brain. Ask me anything about what you saved.',
    viewReferences: 'View References on Board',
    referencesFound: 'items found',
    searching: 'Searching your brain...',
    errorGeneric: 'Something went wrong.',
    all: 'All',
    filterApplied: 'Filters Applied',
    category: 'Category',
    date: 'Date'
  },
  zh: {
    appTitle: '第二大脑',
    askAi: '问大脑',
    ask: '提问',
    emptyTitle: '大脑空空如也',
    emptyDesc: '在下方输入笔记、粘贴文章链接或上传截图。',
    inputPlaceholder: '输入想法、粘贴文章或上传截图来帮助记忆...',
    subText: '所有内容都会自动分类并向量化，实现高效检索。',
    processing: '整理与向量化中...',
    recallTitle: '记忆助手',
    chatPlaceholder: '问我关于装修、代码或生活常识... (例如“找上周的装修笔记”)',
    welcomeMessage: '你好！我是你的第二大脑。你可以问我任何关于你保存的信息。',
    viewReferences: '在看板查看相关记录',
    referencesFound: '条相关记忆',
    searching: '正在进行智能检索...',
    errorGeneric: '出错了，请稍后再试。',
    all: '全部',
    filterApplied: '已应用过滤',
    category: '分类',
    date: '日期'
  }
};