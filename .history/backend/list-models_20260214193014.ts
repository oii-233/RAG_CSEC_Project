const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('No API Key');
        return;
    }
    console.log('Using Key:', key.substring(0, 10) + '...');
    
    try {
        const genAI = new GoogleGenerativeAI(key);
        // Note: listModels is on the genAI instance or model? 
        // SDK structure: genAI.makeRequest? No, usually not exposed easily in simple SDK wrapper without model.
        // But we can try hitting the API directly with fetch/axios if SDK doesn't expose it easily.
        // Actually SDK has it via `getGenerativeModel` but not listing.
        // Let's use axios to hit the REST endpoint directly.
        
        const axios = require('axios');
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        
        const response = await axios.get(url);
        console.log('✅ Available Models:');
        response.data.models.forEach(m => {
            console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods.join(', ')})`);
        });

    } catch (err) {
        console.error('❌ Error listing models:', err.response ? err.response.data : err.message);
    }
}

main();
