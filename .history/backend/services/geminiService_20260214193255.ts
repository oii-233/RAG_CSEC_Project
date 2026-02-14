import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Confirmed available model for this key
const MODEL_NAME = 'gemini-2.5-flash';

class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;

    constructor() {
        if (GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
        } else {
            console.warn('⚠️ GEMINI_API_KEY is missing in environment variables.');
        }
    }

    /**
     * Generate content from Gemini
     * @param prompt The prompt to send to the model
     * @returns The generated text
     */
    async generateContent(prompt: string): Promise<string> {
        if (!this.model) {
            throw new Error('Gemini model is not initialized (missing API key).');
        }

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ Gemini API Error:', error);
            if (error instanceof Error && error.message.includes('404')) {
                throw new Error(`Model ${MODEL_NAME} not found. Ensure your API Key supports it.`);
            }
            throw new Error('Failed to generate content from Gemini.');
        }
    }
}

export const geminiService = new GeminiService();
