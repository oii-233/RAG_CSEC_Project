const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const axios = require('axios');

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('No API Key');
        return;
    }
    console.log('Using Key:', key.substring(0, 10) + '...');
    
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        
        const response = await axios.get(url);
        console.log('✅ Available Models:');
        response.data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                 console.log(`- ${m.name.replace('models/', '')}`);
            }
        });

    } catch (err) {
        console.error('❌ Error listing models:', err.response ? err.response.data : err.message);
    }
}

main();