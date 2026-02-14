// Debug script to test RAG Service independently
import 'dotenv/config'; // Load env vars first
import mongoose from 'mongoose';
import { ragService } from './services/ragService';

const runTest = async () => {
    console.log('🧪 Starting RAG Service Test...');
    
    // Check Env Vars
    console.log('Checking Environment Variables:');
    console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('VOYAGE_API_KEY:', process.env.VOYAGE_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');

    try {
        // Connect DB (needed for Vector Search, though optimization might skip it if we just test generation)
        if (process.env.MONGODB_URI) {
            console.log('🔌 Connecting to MongoDB...');
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ MongoDB Connected');
        }

        const question = "Where is the security office?";
        console.log(`\n❓ Testing Question: "${question}"`);

        console.log('PLEASE WAIT... Calling processQuestion...');
        const result = await ragService.processQuestion(question);

        console.log('\n📄 Result:');
        console.log('Answer:', result.answer);
        console.log(`Sources: ${result.relevantDocs.length} documents found`);
        result.relevantDocs.forEach(d => console.log(` - ${d.title} (${d.similarity})`));

    } catch (error) {
        console.error('\n❌ TEST FAILED with Error:');
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🏁 Test Complete');
    }
};

runTest();
