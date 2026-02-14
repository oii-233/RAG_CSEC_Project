import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';

console.log('--- DIAGNOSTIC START ---');
console.log('GEMINI_API_KEY present:', !!GEMINI_API_KEY, GEMINI_API_KEY.substring(0, 5) + '...');
console.log('VOYAGE_API_KEY present:', !!VOYAGE_API_KEY, VOYAGE_API_KEY.substring(0, 5) + '...');

async function testGemini() {
    console.log('\nTesting Gemini API...');
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Try 1.5-flash as a fallback test if 2.0 fails, but let's try the one in code first
        let modelName = 'gemini-2.0-flash';
        console.log(`Attempting model: ${modelName}`);
        
        let model = genAI.getGenerativeModel({ model: modelName });
        let result = await model.generateContent("Hello, are you working?");
        console.log(`✅ ${modelName} responded:`, result.response.text());
    } catch (error: any) {
        console.error(`❌ Gemini ${'gemini-2.0-flash'} failed:`, error.message);
        
        // Fallback test
        try {
            const fallbackParams = 'gemini-1.5-flash';
            console.log(`\nAttempting fallback model: ${fallbackParams}`);
            const model = genAI.getGenerativeModel({ model: fallbackParams });
            const result = await model.generateContent("Hello, are you working?");
            console.log(`✅ ${fallbackParams} responded:`, result.response.text());
        } catch (fbError: any) {
            console.error(`❌ Gemini ${'gemini-1.5-flash'} failed:`, fbError.message);
        }
    }
}

async function testVoyage() {
    console.log('\nTesting Voyage API...');
    try {
        const response = await axios.post(
            'https://api.voyageai.com/v1/embeddings',
            {
                input: "Test embedding",
                model: 'voyage-3-large'
            },
            {
                headers: {
                    'Authorization': `Bearer ${VOYAGE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        if (response.data?.data?.[0]?.embedding) {
            console.log('✅ Voyage embedding success. Vector length:', response.data.data[0].embedding.length);
        } else {
            console.error('❌ Voyage response invalid:', response.data);
        }
    } catch (error: any) {
        console.error('❌ Voyage API failed:', error.response?.data || error.message);
    }
}

async function run() {
    await testGemini();
    await testVoyage();
    console.log('\n--- DIAGNOSTIC END ---');
}

run();
