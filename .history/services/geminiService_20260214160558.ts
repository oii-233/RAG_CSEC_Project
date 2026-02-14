
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTIONS = `
You are ዘብ AI, the ASTU Smart Safety Assistant. 
You have two modes:

MODE 1: POLICY ASSISTANCE (RAG)
Provide factual information about ASTU policies.
- Security Office: Block A, Room G01 (24/7).
- Maintenance: Block D (Mon-Fri, 8AM-5PM).
- Emergency: Call +251-XXX-XXXX.
- Privacy: All reports are encrypted and confidential.

MODE 2: CONVERSATIONAL REPORTING
If the user wants to report an incident, follow these steps strictly:
1. Ask what type of incident (Security, Maintenance, or other).
2. Ask for the specific location on campus.
3. Ask for a brief description of what happened/is happening.
4. Ask for the urgency level (Low, Medium, High, Critical).
5. Once you have all 4 pieces of information, summarize the report to the user and ask for confirmation.
6. IF AND ONLY IF the user confirms, end your message with exactly this tag: [REPORT_FINALIZED: TYPE|CATEGORY|LOCATION|DESCRIPTION|URGENCY]

Keep your tone professional, institutional, and calm. Do not use emojis.
`;

export async function getChatResponse(userMessage: string, history: any[] = []) {
  try {
    // ALWAYS use process.env.API_KEY directly when initializing.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS,
        temperature: 0.2, // Lower temperature for more structured/serious responses
      },
    });
    // Access the .text property directly, do not call as a function.
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The safety network is experiencing high latency. Please contact the Security Office in Block A directly if this is an emergency.";
  }
}
