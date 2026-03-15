import { GoogleGenAI } from "@google/genai";
import { type DrugAnalysis, type ChatMessage } from "../types";


export const getGeminiResponse = async (
  prompt: string,
  history: ChatMessage[],
  drugData: DrugAnalysis
): Promise<string> => {
  // Uses the API key defined in your vite.config.tsx
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
  
  const summary = `
    Context: You are an AI Pharmacological Assistant.
    Current Drug: ${drugData.drug_name}
    Trust Score: ${(drugData.trust_score * 100).toFixed(2)}%
    Total Reviews: ${drugData.total_reviews}
  `;

  const systemInstruction = `
    ${summary}
    Rules:
    1. Base answers strictly on provided data and general pharmacological knowledge.
    2. Be concise and professional.
    3. Always include a disclaimer to consult a medical professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({
          role: (m.role === 'assistant' ? 'model' : 'user') as "model" | "user",
          parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: { systemInstruction, temperature: 0.7 },
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Connection error. Please try again later.";
  }
};