
import { GoogleGenAI } from "@google/genai";
import { RiskLevel, RISK_LIMITS } from '../types';

export interface CommentResponse {
  success: boolean;
  comment?: string;
  error?: string;
}

/**
 * Uses the Google Gemini API to generate a human-like LinkedIn comment.
 * We use 'gemini-3-flash-preview' for fast, efficient text generation.
 */
export const generateComment = async (
  postText: string, 
  usedToday: number, 
  riskLevel: RiskLevel,
  licenseActive: boolean,
  personality: string = ''
): Promise<CommentResponse> => {
  if (!licenseActive) {
    return { success: false, error: 'Licencia no válida o inactiva.' };
  }

  const limit = RISK_LIMITS[riskLevel];
  if (usedToday >= limit) {
    return { success: false, error: 'Límite diario alcanzado para tu nivel de riesgo.' };
  }

  try {
    // Initialize GoogleGenAI with the provided API key from environment.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a LinkedIn comment for the following post: "${postText}"`,
      config: {
        systemInstruction: personality 
          ? `You are a professional on LinkedIn with this personality: ${personality}. Generate a natural, human-sounding comment (1-3 sentences) that adds value. Avoid generic AI phrases.`
          : "You are a professional on LinkedIn. Generate a concise, engaging, and natural-sounding comment (1-3 sentences). Avoid generic phrases like 'Great post!'.",
        temperature: 0.8,
      },
    });

    // Accessing .text directly as per @google/genai guidelines.
    const comment = response.text;

    if (!comment) {
      throw new Error("Gemini API returned an empty response.");
    }

    return {
      success: true,
      comment: comment.trim()
    };
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return { 
      success: false, 
      error: 'Error de conexión con IngenIA (Gemini API). Por favor, intenta de nuevo.' 
    };
  }
};
