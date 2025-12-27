
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
  personality: string = '',
  userId?: string
): Promise<CommentResponse> => {
  if (!licenseActive) {
    return { success: false, error: 'Licencia no válida o inactiva.' };
  }

  // Pre-check limit on client side for better UX (optional, but good)
  const limit = RISK_LIMITS[riskLevel];
  if (usedToday >= limit) {
    return { success: false, error: 'Límite diario alcanzado para tu nivel de riesgo.' };
  }

  if (!userId) {
    return { success: false, error: 'Usuario no autenticado.' };
  }

  try {
    const response = await fetch('/api/generate-comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        prompt: postText, // API expects 'prompt'
        // personality is handled by backend fetching user settings, 
        // but we might want to update it if the UI allows changing it on the fly?
        // The current backend fetches 'persona_prompt' from DB. 
        // If we want the UI value to take precedence or update the DB, we'd need extra logic.
        // For now, let's rely on the backend fetching from DB as per requirements.
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error');
    }

    if (!data.result) {
      throw new Error("API returned empty response.");
    }

    return {
      success: true,
      comment: data.result
    };
  } catch (error: any) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error.message || 'Error de conexión con IngenIA. Por favor, intenta de nuevo.'
    };
  }
};
