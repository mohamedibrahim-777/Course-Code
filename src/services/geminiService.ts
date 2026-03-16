import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateCourseContent = async (language: string, level: string) => {
  const prompt = `Generate a structured lesson for ${language} at ${level} level. 
  Include:
  1. Lesson Title
  2. Detailed Content (Markdown)
  3. A code example
  4. 3 Practice exercises
  Return in JSON format with keys: title, content, codeExample, exercises.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
