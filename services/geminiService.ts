import { GoogleGenAI } from "@google/genai";

// COLOQUE SUA CHAVE AQUI SE QUISER USAR A IA (Ou deixe vazio para não usar)
const API_KEY = "PLACEHOLDER_API_KEY"; // Ex: "AIzaSy..."

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function getBusinessInsights(salesData: any) {
  if (API_KEY === "PLACEHOLDER_API_KEY" || !API_KEY) {
    return "Funcionalidade de IA desativada. Adicione a chave no arquivo geminiService.ts.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Modelo atualizado
      contents: `Analise estes dados de vendas e dê 3 dicas curtas: ${JSON.stringify(salesData)}`,
    });
    return response.text();
  } catch (error) {
    console.error("Erro IA:", error);
    return "Erro ao consultar a IA.";
  }
}
