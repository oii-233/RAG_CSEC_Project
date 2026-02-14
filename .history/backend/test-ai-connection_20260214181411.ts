import 'dotenv/config'; // Ensure environment variables are loaded FIRST
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Log partial keys for verification (never log full keys in prod!)
console.log('--- Environment Check ---');
console.log('VOYAGE_API_KEY present:', !!VOYAGE_API_KEY, VOYAGE_API_KEY ? `(Starts with ${VOYAGE_API_KEY.substring(0, 5)}...)` : 'MISSING');
console.log('GEMINI_API_KEY present:', !!GEMINI_API_KEY, GEMINI_API_KEY ? `(Starts with ${GEMINI_API_KEY.substring(0, 5)}...)` : 'MISSING');
console.log('-------------------------\n');

async function testVoyage() {
    console.log('🧪 Testing Voyage AI Embedding...');
    if (!VOYAGE_API_KEY) {
        console.error('❌ SKIPPED: VOYAGE_API_KEY is missing.');
        return;
    }

    try {
        const response = await axios.post(
            'https://api.voyageai.com/v1/embeddings',
            {
                input: "Hello world",
                model: "voyage-3-large"
            },
            {
                headers: {
                    'Authorization': `Bearer ${VOYAGE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data?.data?.[0]?.embedding) {
            console.log('✅ Voyage AI Success! Vector dimension:', response.data.data[0].embedding.length);
        } else {
            console.error('❌ Voyage AI Failed: No embedding returned.', response.data);
        }
    } catch (error: any) {
        console.error('❌ Voyage AI Error:', error.response?.data || error.message);
    }
}

async function testGemini() {
    console.log('\n🧪 Testing Gemini AI Generation...');
    if (!GEMINI_API_KEY) {
        console.error('❌ SKIPPED: GEMINI_API_KEY is missing.');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent("Say hello briefly.");
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Gemini Success! Response:', text);
    } catch (error: any) {
        console.error('❌ Gemini Error:', error.message);
    }
}

async function runTests() {
    await testVoyage();
    await testGemini();
}

runTests();
