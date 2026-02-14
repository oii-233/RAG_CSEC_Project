import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const runTest = async () => {
    console.log('🧪 Starting Gemini API Connection Test...');

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('🔑 API Key present:', !!apiKey);
    if (apiKey) {
        console.log('🔑 API Key length:', apiKey.length);
        console.log('🔑 API Key preview:', apiKey.substring(0, 5) + '...');
    } else {
        console.error('❌ CRITICAL: GEMINI_API_KEY is missing from .env');
        process.exit(1);
    }

    const modelName = 'gemini-1.5-flash';
    console.log(`🤖 Model: ${modelName}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
        console.log('📡 Sending test prompt to Google AI...');
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        const text = response.text();

        console.log('✅ SUCCESS! API is working.');
        console.log('📝 Response:', text);
    } catch (error: any) {
        console.error('❌ TEST FAILED');
        console.error('   Error Message:', error.message);
        if (error.response) {
            console.error('   API Response:', error.response.data);
        }

        if (error.message.includes('API_KEY')) {
            console.error('👉 DIAGNOSIS: Your API Key is invalid. You likely need a new one from aistudio.google.com');
        } else if (error.message.includes('not found')) {
            console.error('👉 DIAGNOSIS: The model name might be wrong or not available to your key.');
        }
    }
};

runTest();
