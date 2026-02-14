import { GoogleGenerativeAI } from '@google/generative-ai';
import axios, { AxiosResponse } from 'axios';
import DocumentModel, { IDocument } from '../models/Document';
import { truncateText } from '../utils/textProcessing';

// Constants
const VOYAGE_MODEL = 'voyage-3-large';
// User's key has access to 'gemini-2.5-flash', 'gemini-2.0-flash', etc. 
// 'gemini-1.5-flash' was not in the list, hence 404.
const GEMINI_MODEL = 'gemini-2.5-flash';

interface VoyageEmbeddingResponse {
    data: Array<{
        embedding: number[];
    }>;
}

interface RAGResponse {
    answer: string;
    relevantDocs: Array<IDocument & { similarity?: number }>;
}

export class RAGService {
    private genAI: GoogleGenerativeAI;
    private voyageApiKey: string;

    constructor() {
        const geminiKey = process.env.GEMINI_API_KEY;
        const voyageKey = process.env.VOYAGE_API_KEY;

        if (!geminiKey) {
            console.warn('⚠️ GEMINI_API_KEY is not set');
        }
        if (!voyageKey) {
            console.warn('⚠️ VOYAGE_API_KEY is not set');
        }

        this.genAI = new GoogleGenerativeAI(geminiKey || '');
        this.voyageApiKey = voyageKey || '';
    }

    /**
     * Generate text embedding using Voyage AI
     */
    async generateEmbedding(text: string): Promise<number[] | null> {
        try {
            if (!this.voyageApiKey) return null;

            console.log(`🔢 Generating embedding with ${VOYAGE_MODEL}...`);
            const response: AxiosResponse<VoyageEmbeddingResponse> = await axios.post(
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
            console.error('❌ Error generating embedding:', error);
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
                console.log('🔍 Searching using Vector Search...');
                results = await DocumentModel.vectorSearch(embedding, limit);
                if (results.length > 0) {
                    return results;
                }
            } catch (error) {
                console.error('⚠️ Vector search failed, falling back to text search:', error);
            }
        }

        // 2. Fallback to Text Search
        try {
            console.log('🔍 Falling back to Text Search...');
            results = await DocumentModel.findSimilar(query, limit);
        } catch (error) {
            console.error('❌ Text search failed:', error);
        }

        return results;
    }

    /**
     * Generate answer using Gemini with retrieved context
     */
    async generateAnswer(question: string, context: Array<IDocument & { similarity?: number }>): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

            // Prepare context text
            let contextText = '';
            if (context.length > 0) {
                contextText = context.map((doc, index) => {
                    const info = doc.similarity ? ` (Relevance: ${(doc.similarity * 100).toFixed(1)}%)` : '';
                    return `Document ${index + 1}: ${doc.title}${info}\nContent: ${truncateText(doc.content, 1000)}`;
                }).join('\n\n');
            } else {
                contextText = "No specific documents found in the database.";
            }

            const prompt = `You are "ዘብ AI" (Zeb AI), the smart campus safety assistant for ASTU (Addis Science and Technology University).
Your role is to assist students and staff with safety information, emergency procedures, and campus resources.

INSTRUCTIONS:
1. Answer the user's question based PRIMARILY on the provided context documents.
2. If the context contains the answer, use it and cite the document title if possible.
3. If the context is empty or irrelevant, you may use your general knowledge but MUST clarify that this is general advice, not specific tailored ASTU policy.
4. If the question implies an ACTIVE EMERGENCY, immediately provide emergency contact numbers (Campus Security, Ambulance) and advice to seek safety.
5. Keep your response concise, professional, and supportive.
6. Do not make up facts about ASTU.

CONTEXT DOCUMENTS:
${contextText}

USER QUESTION:
${question}
`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ Error generating AI response:', error);
            throw new Error('Failed to generate response from AI service.');
        }
    }

    /**
     * Main RAG pipeline
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
