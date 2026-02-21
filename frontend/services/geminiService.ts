
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const chatWithTutor = async (
  message: string, 
  history: { role: string; content: string }[], 
  instructions: string
): Promise<string> => {
  if (!ai) {
    return "Gemini API is not configured. Please add your GEMINI_API_KEY to the .env file.";
  }
  try {
    const formattedHistory = history.map(h => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content}`).join('\n');
    
    const prompt = `
      System Instruction: You are a helpful AI Tutor in the Lyrning LMS. 
      Teacher's specific restrictions: ${instructions || "Don't give the student the full answer directly. Guide them with hints and examples."}
      
      Conversation History:
      ${formattedHistory}
      
      Student: ${message}
      Tutor:
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "I'm having trouble thinking right now. Could you rephrase that?";
  } catch (error) {
    console.error("Gemini Tutoring Error:", error);
    return "Error: Unable to connect to AI Tutor.";
  }
};

export const generateAssignment = async (topic: string, materials: string[]): Promise<string> => {
  try {
    const prompt = `
      Create an assignment for a class on the topic: "${topic}".
      Reference materials provided: ${materials.join(', ') || 'General textbook knowledge'}.
      
      Structure:
      1. Directions
      2. 5-7 Practice Problems (mix of calculations and conceptual)
      3. 1 Free Response reflection question.
      Format it as professional educational content.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Failed to generate assignment.";
  } catch (error) {
    console.error("Assignment Gen Error:", error);
    return "Error generating assignment.";
  }
};
