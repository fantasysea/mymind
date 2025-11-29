import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Memory, ProcessingResult, Language, SearchFilters } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to clean base64 string
const cleanBase64 = (data: string) => {
  return data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

/**
 * Calculates Cosine Similarity between two vectors.
 * Returns a value between -1 and 1. 1 means identical direction.
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Generates an embedding vector for text using Gemini.
 */
const getEmbedding = async (text: string): Promise<number[] | undefined> => {
  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: { parts: [{ text }] }
    });
    return response.embeddings?.[0]?.values;
  } catch (error) {
    console.error("Embedding error:", error);
    return undefined;
  }
};

/**
 * Analyzes new input (text or image) to generate metadata AND embeddings.
 */
export const analyzeContent = async (
  text: string,
  base64Image: string | null,
  existingCategories: string[],
  language: Language
): Promise<ProcessingResult> => {
  
  const categoriesStr = existingCategories.length > 0 
    ? `Existing categories you should try to reuse if fitting: ${existingCategories.join(', ')}.`
    : "No existing categories yet. Create broad, useful categories.";

  const langInstruction = language === 'zh' 
    ? "IMPORTANT: Generate the summary, tags, and category in Chinese (Simplified)." 
    : "IMPORTANT: Generate the summary, tags, and category in English.";

  const prompt = `
    Analyze the following user input (text and/or image).
    Your goal is to organize this into a "Second Brain" knowledge base.
    
    1. Create a concise summary (max 2 sentences) of what this information is about.
    2. Generate 3-5 relevant tags (lowercase, single words or short phrases).
    3. Assign a single high-level category. ${categoriesStr}
    
    ${langInstruction}
    
    Return the result in JSON format.
  `;

  const parts: any[] = [{ text: prompt }];
  if (text) parts.push({ text: `User Text Input: "${text}"` });
  if (base64Image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64(base64Image),
      },
    });
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "A concise summary of the content." },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 relevant tags." },
      category: { type: Type.STRING, description: "A high-level category." }
    },
    required: ["summary", "tags", "category"]
  };

  try {
    const analysisOp = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const response = await analysisOp;
    
    if (!response.text) throw new Error("No response text from Gemini");
    
    const result = JSON.parse(response.text) as ProcessingResult;

    // Generate embedding based on the Summary + Tags + Original Text (if text)
    const textToEmbed = `Category: ${result.category}. Tags: ${result.tags.join(', ')}. Content: ${result.summary}. ${text || ''}`;
    const embedding = await getEmbedding(textToEmbed);

    return {
      ...result,
      embedding
    };

  } catch (error) {
    console.error("Error analyzing content:", error);
    return {
      summary: text.slice(0, 50) + "...",
      tags: ["uncategorized"],
      category: "General"
    };
  }
};

interface ParsedIntent {
  keywords: string;
  category: string | null;
  tags: string[];
  startDate: number | null;
  endDate: number | null;
}

/**
 * Uses LLM to parse natural language into structured search filters.
 */
const parseSearchIntent = async (
  query: string,
  categories: string[],
  language: Language
): Promise<ParsedIntent> => {
  const now = new Date();
  
  const prompt = `
    System: You are a smart search query parser for a personal knowledge base.
    Context:
    - Current Date: ${now.toISOString()}
    - Available Categories: ${JSON.stringify(categories)}
    - Language: ${language}

    Task: Analyze the User Query and extract structured search filters.
    
    User Query: "${query}"

    Instructions:
    1. keywords: Extract the core topic to search for. Remove filter phrases like "show me", "from last week", "in coding", "about".
       - If the user is just asking a question (e.g. "How do I fix a leak?"), "keywords" should be "fix a leak".
       - If the user is filtering (e.g. "Show coding notes"), "keywords" can be empty if "category" is captured, or keep "coding" if generic.
    2. category: Match ONE relevant category from the Available Categories list ONLY if explicitly mentioned or strongly implied. Set to null if unsure.
    3. tags: Extract any specific tags mentioned (e.g. "#react" or "react tag").
    4. dateRange: Calculate start and end timestamps (in milliseconds) if time is mentioned (e.g., "last week", "yesterday", "since 2023").

    Output JSON with schema:
    {
      "keywords": string,
      "category": string | null,
      "tags": string[],
      "startDate": number | null,
      "endDate": number | null
    }
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      keywords: { type: Type.STRING },
      category: { type: Type.STRING, nullable: true },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      startDate: { type: Type.NUMBER, nullable: true },
      endDate: { type: Type.NUMBER, nullable: true }
    },
    required: ["keywords", "category", "tags", "startDate", "endDate"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ParsedIntent;
    }
    throw new Error("Empty response for parser");
  } catch (e) {
    console.error("Parse intent failed", e);
    // Fallback
    return { keywords: query, category: null, tags: [], startDate: null, endDate: null };
  }
};

/**
 * Performs a semantic search (RAG) then Chat, with filtering.
 */
export const queryBrain = async (
  userQuery: string,
  memories: Memory[],
  language: Language
): Promise<{ answer: string; relatedIds: string[]; usedFilters?: SearchFilters }> => {
  
  // 0. Extract available metadata for the parser
  const uniqueCategories = Array.from(new Set(memories.map(m => m.category)));
  
  // 1. Parse User Intent
  const parsed = await parseSearchIntent(userQuery, uniqueCategories, language);
  console.log("Parsed Intent:", parsed);

  // 2. Filter Memories (Hard Filtering)
  let filteredMemories = memories.filter(m => {
    // Category Filter
    if (parsed.category && m.category.toLowerCase() !== parsed.category.toLowerCase()) {
      return false;
    }
    // Tag Filter (AND logic - memory must have at least one of the searched tags if provided)
    if (parsed.tags.length > 0) {
      const hasTag = parsed.tags.some(t => m.tags.includes(t.toLowerCase()));
      if (!hasTag) return false;
    }
    // Date Filter
    if (parsed.startDate && m.createdAt < parsed.startDate) return false;
    if (parsed.endDate && m.createdAt > parsed.endDate) return false;

    return true;
  });

  // 3. Vector Search / Ranking
  // If keywords are present, use Embedding search on the filtered subset.
  // If no keywords (e.g. "Show me all coding notes"), sort by recent.
  let relevantMemories: Memory[] = [];

  if (parsed.keywords && parsed.keywords.length > 1) {
    const queryEmbedding = await getEmbedding(parsed.keywords);
    
    if (queryEmbedding && filteredMemories.length > 0) {
      const memoriesWithScore = filteredMemories.map(m => {
        if (!m.embedding) return { memory: m, score: -1 };
        return { 
          memory: m, 
          score: cosineSimilarity(queryEmbedding, m.embedding) 
        };
      });

      // Sort by score
      memoriesWithScore.sort((a, b) => b.score - a.score);
      
      // Top 10
      relevantMemories = memoriesWithScore.slice(0, 10).map(i => i.memory);
    } else {
      // Fallback if embedding fails or list empty
      relevantMemories = filteredMemories.slice(0, 10);
    }
  } else {
    // No specific keyword (e.g. "Show me notes from yesterday")
    // Just show most recent filtered
    relevantMemories = filteredMemories.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  }

  // 4. Construct Context
  if (relevantMemories.length === 0) {
    return {
      answer: language === 'zh' 
        ? "抱歉，根据您的过滤条件，我没有找到任何相关记忆。" 
        : "Sorry, I couldn't find any memories matching those filters.",
      relatedIds: [],
      usedFilters: parsed
    };
  }

  const memoryContext = relevantMemories.map(m => ({
    id: m.id,
    summary: m.summary,
    tags: m.tags,
    category: m.category,
    originalText: m.type === 'TEXT' ? m.originalContent : '[Image Content]',
    date: new Date(m.createdAt).toLocaleDateString()
  }));

  const langInstruction = language === 'zh'
    ? "IMPORTANT: Answer in Chinese (Simplified)."
    : "IMPORTANT: Answer in English.";

  const prompt = `
    You are the "Second Brain" AI. 
    User Query: "${userQuery}"
    Parsed Keywords: "${parsed.keywords}"
    
    Here are the most relevant ${memoryContext.length} notes found (filtered by user constraints):
    ${JSON.stringify(memoryContext)}

    Instructions:
    1. Answer the user's question based ONLY on the provided notes.
    2. If the user asked for a list (e.g. "Show me"), summarize the items found.
    3. If the user asked a question, synthesize the answer from the notes.
    4. Return a JSON object with the "answer" and a list of "relatedIds".
    
    ${langInstruction}
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      answer: { type: Type.STRING },
      relatedIds: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["answer", "relatedIds"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (response.text) {
      const res = JSON.parse(response.text);
      return {
        ...res,
        usedFilters: parsed
      };
    }
    throw new Error("No response from Query");
  } catch (error) {
    console.error("Error querying brain:", error);
    return {
      answer: language === 'zh' ? "抱歉，生成回答时出错了。" : "Sorry, I had trouble processing your request.",
      relatedIds: []
    };
  }
};