import { generateRAGResponse } from './services/ragService';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Testing RAG with gemini-2.5-flash...");
    try {
        const answer = await generateRAGResponse("What is the emergency number?");
        console.log("✅ RAG Response:", answer);
    } catch (error) {
        console.error("❌ RAG Failed:", error);
    }
}

test();