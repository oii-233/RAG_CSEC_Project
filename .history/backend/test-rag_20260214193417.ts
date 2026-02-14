import { ragService } from './services/ragService';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Testing RAG with gemini-2.5-flash...");
    try {
        const result = await ragService.processQuestion("What is the emergency number?");
        console.log("✅ RAG Response:", result.answer);
    } catch (error) {
        console.error("❌ RAG Failed:", error);
    }
}

test();