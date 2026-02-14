import { GoogleGenerativeAI } from '@google/generative-ai';
import DocumentModel, { IDocument } from '../models/Document';
import { truncateText } from '../utils/textProcessing';

// Constants
// Using text-embedding-004 which is the latest stable embedding model from Google
const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATIVE_MODEL = 'gemini-1.5-flash';

interface RAGResponse {
    answer: string;
    relevantDocs: Array<IDocument & { similarity?: number }>;
}

export class RAGService {
    private genAI: GoogleGenerativeAI;
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        
        if (!this.apiKey) {
            console.warn('⚠️ GEMINI_API_KEY is not set. RAG features will fail.');
        }

        this.genAI = new GoogleGenerativeAI(this.apiKey || '');
    }

    /**
     * Generate text embedding using Gemini
     */
    async generateEmbedding(text: string): Promise<number[] | null> {
        if (!this.apiKey) return null;

        try {
            const model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
            
            // Generate embedding
            const result = await model.embedContent(text);
            const embedding = result.embedding.values;
            
            return embedding;
        } catch (error) {
            console.error('❌ Error generating embedding with Gemini:', error);
            return null;
        }
    }

    /**
     * Search for relevant documents using Vector Search or fallback to Text Search
     */
    async searchDocuments(query: string, embedding: number[] | null, limit: number = 3): Promise<Array<IDocument & { similarity?: number }>> {
        let results: Array<IDocument & { similarity?: number }> = [];

        // 1. Try Vector Search if embedding exists
        if (embedding && embedding.length > 0) {
            try {
                // Check if vectorSearch is available (it depends on Atlas configuration)
                if (typeof DocumentModel.vectorSearch === 'function') {
                    console.log('🔍 Searching using Vector Search...');
                    results = await DocumentModel.vectorSearch(embedding, limit);
                    
                    if (results.length > 0) {
                        console.log(`✅ Found ${results.length} documents via Vector Search`);
                        return results;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Vector search failed/returned empty, falling back to text search:', error);
            }
        }

        // 2. Fallback to Text Search
        try {
            console.log('🔍 Falling back to Text Search...');
            results = await DocumentModel.findSimilar(query, limit);
            console.log(`✅ Found ${results.length} documents via Text Search`);
        } catch (error) {
            console.error('❌ Text search failed:', error);
        }

        return results;
    }

    /**
     * Generate answer using Gemini with retrieved context
     */
    async generateAnswer(question: string, context: Array<IDocument & { similarity?: number }>): Promise<string> {
        if (!this.apiKey) {
            return "I apologize, but I'm currently unable to process your request due to missing configuration (API Key).";
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: GENERATIVE_MODEL });

            // Prepare context text
            let contextText = '';
            
            if (context && context.length > 0) {
                contextText = context.map((doc, index) => {
                    const similarityInfo = doc.similarity ? ` (Relevance: ${(doc.similarity * 100).toFixed(1)}%)` : '';
                    return `[Document ${index + 1}]: ${doc.title}${similarityInfo}\nContent: "${truncateText(doc.content, 1500)}"`;
                }).join('\n\n---\n\n');
            } else {
                contextText = "No specific internal documents found matching this query in the knowledge base.";
            }

            const systemInstruction = `You are "ዘብ AI" (Zeb AI), the smart campus safety assistant for ASTU (Addis Science and Technology University).

INSTRUCTIONS:
1. Answer based PRIMARILY on the provided Context Documents.
2. If the context contains the answer, cite the document title.
3. If the context is empty or irrelevant, you may use general safety knowledge but MUST clarify that this is general advice, not specific ASTU policy.
4. If the question involves an ACTIVE EMERGENCY (fire, crime, medical), start with "🚨 CALL CAMPUS SECURITY IMMEDIATELY" and provide emergency numbers if known (or tell them to call 911/local emergency).
5. Be concise, professional, and supportive.
6. Do NOT invent policies or phone numbers if they are not in the context.

CONTEXT DOCUMENTS:
${contextText}
`;

            const prompt = `User Question: ${question}`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + prompt }] }]
            });
            
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ Error generating AI response:', error);
            return "I encountered an error while analyzing your request. Please try again later.";
        }
    }

    /**
     * Main RAG pipeline
     */
    async processQuestion(question: string): Promise<RAGResponse> {
        console.log(`🚀 RAG Processing: "${question}"`);
        
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
