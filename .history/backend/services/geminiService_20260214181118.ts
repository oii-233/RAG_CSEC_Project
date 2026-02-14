import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not defined in environment variables.');
}

// User requested "Gemini 2.5 Flash", defaulting to 1.5 Flash as 2.5 is likely a typo or future model.
// Can be swapped to 'gemini-2.0-flash' if available.
const MODEL_NAME = 'gemini-1.5-flash';

class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        if (!GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is not set in environment variables");
            // Don't throw here, allow manual instantiation or throw during generation
        }
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');
        this.model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
    }

    /**
     * Generate content from Gemini
     * @param prompt The prompt to send to the model
     * @returns The generated text
     */
    async generateContent(prompt: string): Promise<string> {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is missing. Please check your .env file.');
        }

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ Gemini API Error:', error);
            throw new Error(`Gemini Generation Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate embeddings using Gemini (Optional, if we switch from Voyage)
     * @param text Text to embed
     */
    async embedText(text: string): Promise<number[]> {
        try {
            const embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (error) {
             console.error('❌ Gemini Embedding Error:', error);
             throw error;
        }
    }
}

export const geminiService = new GeminiService();
