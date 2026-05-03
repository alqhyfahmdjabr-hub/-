import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing');
    return;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Say hello!'
    });
    console.log('✅ Gemini Response:', result.text);
  } catch (err) {
    console.error('❌ Gemini Error:', err);
  }
}

testGemini();
