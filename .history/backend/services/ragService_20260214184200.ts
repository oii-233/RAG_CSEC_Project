import axios, { AxiosResponse } from 'axios';
import DocumentModel, { IDocument } from '../models/Document';
import { truncateText } from '../utils/textProcessing';
import { geminiService } from './geminiService';

// Constants
const VOYAGE_MODEL = 'voyage-3-large';

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
    private voyageApiKey: string;

    constructor() {
        const voyageKey = process.env.VOYAGE_API_KEY;
        if (!voyageKey) {
            console.warn('⚠️ VOYAGE_API_KEY is not set');
        }
        this.voyageApiKey = voyageKey || '';
    }

    /**
     * Generate text embedding using Voyage AI (matching the DB embeddings)
     */
    async generateEmbedding(text: string): Promise<number[] | null> {
        try {
            if (!this.voyageApiKey) {
                 console.error("❌ Voyage API Key missing.");
                 return null;
            }

            // console.log(`🔢 Generating embedding with ${VOYAGE_MODEL}...`);
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
            console.error('❌ Error generating embedding:', error instanceof Error ? error.message : error);
            // Don't throw, return null to fallback to text search
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
                // console.log('🔍 Searching using Vector Search...');
                results = await DocumentModel.vectorSearch(embedding, limit);
                if (results.length > 0) {
                    return results;
                }
            } catch (error) {
                console.error('⚠️ Vector search failed, falling back to text search:', error instanceof Error ? error.message : error);
            }
        }

        // 2. Fallback to Text Search
        try {
            // console.log('🔍 Falling back to Text Search...');
            results = await DocumentModel.findSimilar(query, limit);
        } catch (error) {
            console.error('❌ Text search failed:', error);
        }

        return results;
    }

    /**
     * Generate answer using Gemini Service
     */
    async generateAnswer(question: string, context: Array<IDocument & { similarity?: number }>): Promise<string> {
        // Prepare context text
        let contextText = '';
        if (context.length > 0) {
            contextText = context.map((doc, index) => {
                const info = doc.similarity ? ` (Relevance: ${(doc.similarity * 100).toFixed(1)}%)` : '';
                return `Document ${index + 1}: ${doc.title}${info}\nContent: ${truncateText(doc.content, 1000)}`;
            }).join('\n\n');
        } else {
            contextText = "No specific documents found in the database. Answer based on general safety knowledge.";
        }

        const prompt = `You are "ዘብ AI" (Zeb AI), the smart campus safety assistant for ASTU.

CONTEXT DOCUMENTS:
${contextText}

USER QUESTION:
${question}

INSTRUCTIONS:
1. Answer strictly based on the provided context if possible.
2. If the answer is not in the context, state that you don't have that information in your internal records, but provide general safety advice if applicable.
3. Be professional and concise.
`;

        try {
            return await geminiService.generateContent(prompt);
        } catch (err) {
            console.error('❌ Failed to generate answer:', err);
            return "I apologize, I am unable to generate a response at this time due to a service error.";
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

