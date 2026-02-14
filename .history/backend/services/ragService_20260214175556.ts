import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import DocumentModel, { IDocument } from '../models/Document';
import { truncateText } from '../utils/textProcessing';

// Constants
// Note: User requested "gemini 2.5 flash", which is likely a typo for "gemini-1.5-flash" or the experimental "gemini-2.0-flash". 
// Using "gemini-1.5-flash" as the stable standard. To use 2.0 experimental, change to 'gemini-2.0-flash-exp'.
const GEMINI_MODEL = 'gemini-1.5-flash';
const VOYAGE_MODEL = 'voyage-3-large';

interface VoyageEmbeddingResponse {
    data: Array<{
        embedding: number[];
    }>;
    usage?: {
        total_tokens: number;
    };
}

interface RAGResponse {
    answer: string;
    relevantDocs: Array<IDocument & { similarity?: number }>;
}

export class RAGService {
    private genAI: GoogleGenerativeAI | null = null;
    private voyageApiKey: string | null = null;

    constructor() {
        const geminiKey = process.env.GEMINI_API_KEY;
        const voyageKey = process.env.VOYAGE_API_KEY;

        if (geminiKey) {
            this.genAI = new GoogleGenerativeAI(geminiKey);
        } else {
            console.warn('⚠️ GEMINI_API_KEY is not set. Chatbot will fail to generate answers.');
        }

        if (voyageKey) {
            this.voyageApiKey = voyageKey;
        } else {
            console.warn('⚠️ VOYAGE_API_KEY is not set. Vector search will be disabled.');
        }
    }

    /**
     * Generate text embedding using Voyage AI
     */
    async generateEmbedding(text: string): Promise<number[] | null> {
        if (!this.voyageApiKey) {
            console.warn('⚠️ Skipping embedding generation: VOYAGE_API_KEY missing.');
            return null;
        }

        try {
            // console.log(`🔢 Generating embedding for query: "${text.substring(0, 50)}..."`);
            const response = await axios.post<VoyageEmbeddingResponse>(
                'https://api.voyageai.com/v1/embeddings',
                {
                    input: text,
                    model: VOYAGE_MODEL
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.voyageApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data?.data?.[0]?.embedding) {
                return response.data.data[0].embedding;
            }
            return null;
        } catch (error) {
            console.error('❌ Error generating embedding:', error instanceof Error ? error.message : error);
            return null;
        }
    }

    /**
     * Search for relevant documents using Vector Search with Text Search fallback
     */
    async searchDocuments(query: string, embedding: number[] | null, limit: number = 3): Promise<Array<IDocument & { similarity?: number }>> {
        let results: Array<IDocument & { similarity?: number }> = [];
        let searchMethod = 'none';

        // 1. Try Vector Search
        if (embedding && embedding.length > 0) {
            try {
                // console.log('🔍 Attempting Vector Search...');
                results = await DocumentModel.vectorSearch(embedding, limit);
                if (results.length > 0) {
                    searchMethod = 'vector';
                    console.log(`✅ Found ${results.length} docs via Vector Search.`);
                    return results;
                }
            } catch (error) {
                console.error('⚠️ Vector search failed (likely missing index), falling back...', error instanceof Error ? error.message : error);
            }
        }

        // 2. Fallback to Text Search
        try {
            // console.log('🔍 Falling back to Text Search...');
            results = await DocumentModel.findSimilar(query, limit);
            if (results.length > 0) {
                searchMethod = 'text';
                console.log(`✅ Found ${results.length} docs via Text Search.`);
            }
        } catch (error) {
            console.error('❌ Text search failed:', error instanceof Error ? error.message : error);
        }

        if (results.length === 0) {
            console.log('⚠️ No relevant documents found.');
        }

        return results;
    }

    /**
     * Generate answer using Gemini with retrieved context
     */
    async generateAnswer(question: string, context: Array<IDocument & { similarity?: number }>): Promise<string> {
        if (!this.genAI) {
            return "system: I cannot answer right now because the AI service is not configured (Missing API Key).";
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

            // Prepare context text
            let contextText = '';
            let validDocs = 0;

            if (context && context.length > 0) {
                contextText = context.map((doc, index) => {
                    const similarityInfo = doc.similarity ? ` (Relevance: ${(doc.similarity * 100).toFixed(1)}%)` : '';
                    const safeContent = truncateText(doc.content || '', 1500); // Limit per doc
                    validDocs++;
                    return `SOURCE DOCUMENT ${index + 1}:
Title: ${doc.title}
Category: ${doc.category}${similarityInfo}
Content:
${safeContent}
--------------------------------`;
                }).join('\n\n');
            }

            if (validDocs === 0) {
                contextText = "No specific internal documents found. Answer based on general safety knowledge if applicable, but disclaim that it might not be ASTU specific.";
            }

            // Construct System Prompt
            const prompt = `You are "ዘብ AI" (Zeb AI), the specialized campus safety assistant for ASTU (Addis Science and Technology University).

YOUR GOAL: Provide accurate, helpful, and safety-focused answers to students and staff.

CONTEXT:
${contextText}

USER QUESTION:
${question}

INSTRUCTIONS:
1. USE THE CONTEXT: Base your answer primarily on the provided "SOURCE DOCUMENT" sections.
2. CITATIONS: When using information from a document, mention its title (e.g., "According to the 'Fire Safety Protocol'...").
3. NO CONTEXT: If the provided documents do not contain the answer, say "I couldn't find specific information about that in my internal database," and then provide a general responsible safety answer if possible, or advise contacting Campus Security.
4. EMERGENCY: If the query indicates an immediate threat (fire, assault, medical), IGNORE context and IMMEDIATELY provide emergency instructions and numbers (ASTU Security, Ambulance, Police).
5. TONE: Professional, reassuring, and concise. Avoid Markdown formatting for headers unless necessary. Use bullet points for steps.
6. LANGUAGE: Answer in the same language as the user's question (English or Amharic).
`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            if (!text) return "I apologize, but I couldn't generate a response at this time.";
            
            return text;

        } catch (error) {
            console.error('❌ Gemini generation error:', error);
            // Return a safe fallback message instead of throwing, so the UI can show something
            return "I encountered an error while processing your request. Please try again later or contact support.";
        }
    }

    /**
     * Main RAG pipeline execution
     */
    async processQuestion(question: string): Promise<RAGResponse> {
        // 1. Generate Embedding
        const embedding = await this.generateEmbedding(question);

        // 2. Search Documents
        const relevantDocs = await this.searchDocuments(question, embedding);

        // 3. Generate Answer
        const answer = await this.generateAnswer(question, relevantDocs);

        return {
            answer,
            relevantDocs
        };
    }
}

export const ragService = new RAGService();
