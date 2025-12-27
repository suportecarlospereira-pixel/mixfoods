
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getBusinessInsights(salesData: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise estes dados de vendas da minha lanchonete e dê 3 sugestões estratégicas curtas para aumentar o lucro: ${JSON.stringify(salesData)}. Responda em Português do Brasil.`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights da IA:", error);
    return "Não foi possível gerar insights no momento. Tente novamente mais tarde.";
  }
}
