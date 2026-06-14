import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "GEMINI_API_KEY is not configured in Netlify environment variables." }),
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const { category, categoryName, existingWords } = JSON.parse(event.body || "{}");
    if (!category || !categoryName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Category ID and categoryName are required" }) };
    }

    const cleanCategory = String(category).trim().substring(0, 50);
    const cleanCategoryName = String(categoryName).trim().substring(0, 50);
    const excludeList = Array.isArray(existingWords) ? existingWords.map((w) => String(w).toLowerCase().trim()) : [];

    const promptText = `Generate exactly 50 dynamic, high-quality, practical, and highly useful English vocabulary words with phonetic guides & Indonesian translations specifically of relevance to the theme: "${cleanCategoryName}".\nTo prevent duplicates, DO NOT generate any of the following existing words: ${excludeList.slice(0, 150).join(", ")}.\nMake sure each vocabulary word is realistic, helpful for conversations, and has a unique generated ID starting with "bulk_" and a random string. Set the 'category' property of ALL generated items to exactly: "${cleanCategory}"`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are an elite bilingual English-Indonesian linguist and language teacher. Output high-impact learning flashcards strictly structured in the requested JSON schema. Make sure phonetic guides are accurate and easy to read (IPA phonetics format like /ˈpɪl.oʊ/). For 'imageSearchTerm', output simple search keywords in English (no punctuation, max 4 words) that would fetch a beautiful photo about this word on Unsplash.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              english: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              indonesian: { type: Type.STRING },
              meaning: { type: Type.STRING },
              example: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING },
              category: { type: Type.STRING },
              imageSearchTerm: { type: Type.STRING },
            },
            required: ["id", "english", "phonetic", "indonesian", "meaning", "example", "exampleTranslation", "category", "imageSearchTerm"],
          },
        },
      },
    });

    const jsonText = response.text || "[]";
    let cards = JSON.parse(jsonText);

    const processedCards = cards.map((card) => ({
      ...card,
      id: card.id || `bulk_${Math.random().toString(36).substr(2, 9)}`,
      category: cleanCategory,
      isCustom: true,
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ cards: processedCards }) };
  } catch (error) {
    console.error("Gemini bulk-vocab error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Unexpected error calling Gemini." }),
    };
  }
};
