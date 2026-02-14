import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import axios, { AxiosResponse } from 'axios';
import DocumentModel, { IDocument } from '../models/Document';
import { truncateText } from '../utils/textProcessing';

// Constants
const VOYAGE_MODEL = 'voyage-3-large';
const GEMINI_MODEL = 'gemini-2.0-flash'; // Updated to 2.0 Flash (2.5 is not yet available)


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
            console.error('❌ FATAL: GEMINI_API_KEY is missing in environment variables');
        } else {
            console.log('✅ Gemini API Key found');
        }

        if (!voyageKey) {
            console.error('❌ FATAL: VOYAGE_API_KEY is missing in environment variables');
        } else {
            console.log('✅ Voyage API Key found');
        }

        this.genAI = new GoogleGenerativeAI(geminiKey || '');
        this.voyageApiKey = voyageKey || '';
    }

    /**
     * Generate text embedding using Voyage AI
     */
    async generateEmbedding(text: string): Promise<number[] | null> {
        if (!this.voyageApiKey) {
            console.error('❌ Voyage API key is not set. Cannot generate embeddings.');
            return null;
        }

        try {
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
                    },
                    timeout: 10000 // 10s timeout
                }
            );

            if (response.data?.data?.[0]?.embedding) {
                return response.data.data[0].embedding;
            }
            return null;
        } catch (error: any) {
            console.error('❌ Error generating embedding:', error?.message || error);
            if (error.response) {
                console.error('Voyage API Error Data:', error.response.data);
            }
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
                    console.log(`✅ Found ${results.length} documents via Vector Search`);
                    return results;
                }
                console.log('⚠️ Vector Search returned 0 results');
            } catch (error) {
                console.error('⚠️ Vector search failed, falling back to text search:', error);
            }
        } else {
            console.log('⚠️ No embedding available, skipping Vector Search');
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
        try {
            const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

            // Prepare context text
            let contextText = '';
            if (context.length > 0) {
                contextText = context.map((doc, index) => {
                    const info = doc.similarity ? ` (Relevance: ${(doc.similarity * 100).toFixed(1)}%)` : '';
                    return `Document ${index + 1}: ${doc.title}${info}\nContent: ${truncateText(doc.content, 2000)}`;
                }).join('\n\n---\n\n');
            } else {
                contextText = "No specific documents found in the database. Use general knowledge but mention you are using general knowledge.";
            }

            const prompt = `You are "ዘብ AI" (Zeb AI), the smart campus safety assistant for ASTU (Addis Science and Technology University).

CONTEXT FROM KNOWLEDGE BASE:
${contextText}

USER QUESTION:
${question}

INSTRUCTIONS:
1. Answer strictly based on the provided CONTEXT if relevant information is present.
2. If the answer is found in the documents, cite the document title.
3. If the context is empty or irrelevant, you may answer using general safety knowledge, but you MUST assume the context of a university campus.
4. If the question involves an emergency (fire, crime, injury), start with "🚨 EMERGENCY CRITICAL:" and provide general emergency advice (Call Campus Security).
5. Be concise, professional, and helpful.
`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 800,
                },
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                ],
            });

            const response = await result.response;
            const text = response.text();
            
            if (!text) {
                console.error('⚠️ Gemini returned empty response text (blocked?)');
                return "I apologize, but I couldn't generate a response. Please try rephrasing your question.";
            }

            return text;
        } catch (error: any) {
            console.error('❌ Error generating AI response:', error?.message || error);
            if (error.response) {
                console.error('Gemini API Error details:', JSON.stringify(error.response, null, 2));
            }
            throw new Error(`Failed to generate response from AI service: ${error?.message}`);
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
