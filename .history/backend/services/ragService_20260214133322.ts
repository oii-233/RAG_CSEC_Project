import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DocumentModel, { IDocument } from '../models/Document';
import { truncateText } from '../utils/textProcessing';

// Constants
const VOYAGE_MODEL = 'voyage-3-large';
const GEMINI_MODEL = 'gemini-2.0-flash'; // Updated to 2.0 as it is generally available and stable
const DEFAULT_LIMIT = 5;

export class RAGService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ GEMINI_API_KEY is not set. AI features will not work.');
        }
        this.genAI = new GoogleGenerativeAI(apiKey || '');
    }

    /**
     * Generate embedding for a given text using Voyage AI
     */
    async generateEmbedding(text: string): Promise<number[] | null> {
        try {
            if (!process.env.VOYAGE_API_KEY) {
                console.warn('⚠️ VOYAGE_API_KEY is missing. Skipping embedding generation.');
                return null;
            }

            const response = await axios.post(
                'https://api.voyageai.com/v1/embeddings',
                {
                    input: text,
                    model: VOYAGE_MODEL
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data?.data?.[0]?.embedding) {
                return response.data.data[0].embedding;
            }
            return null;
        } catch (error: any) {
            console.error('❌ Embedding Error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Retrieve relevant documents using Vector Search or Text Search fallback
     */
    async retrieveContext(query: string): Promise<IDocument[]> {
        let documents: IDocument[] = [];
        
        // 1. Try Vector Search
        const embedding = await this.generateEmbedding(query);
        if (embedding) {
            try {
                // Assuming DocumentModel has a vectorSearch static method
                documents = await DocumentModel.vectorSearch(embedding, DEFAULT_LIMIT);
                console.log(`✅ Retrieved ${documents.length} docs via Vector Search`);
            } catch (err) {
                console.warn('⚠️ Vector search failed, falling back to text search.', err);
            }
        }

        // 2. Fallback to Text Search if no docs found
        if (documents.length === 0) {
            try {
                documents = await DocumentModel.findSimilar(query, DEFAULT_LIMIT);
                console.log(`✅ Retrieved ${documents.length} docs via Text Search`);
            } catch (err) {
                console.error('❌ Text search failed:', err);
            }
        }

        return documents;
    }

    /**
     * Generate answer using Gemini and retrieved context
     */
    async generateAnswer(question: string, contextDocs: IDocument[]): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

            // Format context
            const contextText = contextDocs
                .map((doc, i) => `[Source ${i + 1} - ${doc.category.toUpperCase()}]: ${truncateText(doc.content, 400)}`)
                .join('\n\n');

            const systemInstruction = `You are ዘብ AI (Zeb AI), the smart safety assistant for ASTU (Addis Science and Technology University).
            
            ROLE & BEHAVIOR:
            - Answer ONLY based on the provided Context.
            - If the answer is not in the Context, state: "I don't have information about that in my safety database. Please contact the security office."
            - Be concise, professional, and reassuring.
            - Provide emergency numbers immediately if the query suggests danger.
            
            CONTEXT:
            ${contextText || 'No specific safety documents found for this query.'}
            `;

            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: systemInstruction + `\n\nUSER QUESTION: ${question}` }] }
                ],
                generationConfig: {
                    temperature: 0.3, // Lower temperature for factual answers
                    maxOutputTokens: 1000,
                }
            });

            return result.response.text();

        } catch (error: any) {
            console.error('❌ Generation Error:', error);
            return "I'm currently unable to process your request due to a connection issue. Please try again later.";
        }
    }

    /**
     * Full RAG Pipeline
     */
    async processQuery(question: string): Promise<{ answer: string; sources: IDocument[] }> {
        const sources = await this.retrieveContext(question);
        const answer = await this.generateAnswer(question, sources);
        return { answer, sources };
    }
}

export const ragService = new RAGService();
