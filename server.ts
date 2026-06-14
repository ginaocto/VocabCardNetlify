import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini SDK with custom user-agent for telemetry as required
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Check if AI is configured
app.get("/api/ai-config", (req, res) => {
  res.json({
    hasAI: !!ai,
    message: ai ? "Gemini API is ready to craft custom flashcards." : "Gemini API key is missing. Set GEMINI_API_KEY in Secrets to unlock AI vocabulary generation."
  });
});

// API: Generate brand new english vocab card via Gemini
app.post("/api/gemini/custom-vocab", async (req, res) => {
  try {
    const { topic, category } = req.body;
    if (!topic || typeof topic !== "string" || topic.trim() === "") {
      return res.status(400).json({ error: "Topic/word is required" });
    }

    if (!ai) {
      return res.status(503).json({ 
        error: "Google Gemini API key is missing. Please add GEMINI_API_KEY in Settings > Secrets to generate custom vocabulary cards." 
      });
    }

    const cleanTopic = topic.trim().substring(0, 50);
    const cleanCategory = typeof category === "string" && category.trim() !== "" ? category.trim() : "others";

    const promptText = `Generate 3 high quality vocabulary items for learning English, related to the topic or word: "${cleanTopic}". Be creative, useful for daily life, and make sure the examples are helpful. Always translate words and sentences to Indonesian. Ensure each item has a unique generated ID like "custom_" plus a random number. Set the 'category' property of ALL items to exactly: "${cleanCategory}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are an elite bilingual English-Indonesian linguist and language teacher. Output high-impact learning flashcards strictly structured in the requested JSON schema. Make sure phonetic guides are accurate and easy to read (IPA phonetics format like /ˈpɪl.oʊ/). For 'imageSearchTerm', output simple search keywords in English (no punctuation, max 4 words) that would fetch a beautiful photo about this word on Unsplash. CRITICAL: The 'meaning' field must always be written entirely in Bahasa Indonesia — never in English, even when an English phrasing would feel more natural for a dictionary-style definition.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              english: { type: Type.STRING, description: "The English word (strictly lower-case, e.g. 'microwave')." },
              phonetic: { type: Type.STRING, description: "IPA Phonetic pronunciation guide, e.g. /ˈkaʊtʃ/ or /bʊk/" },
              indonesian: { type: Type.STRING, description: "Core Indonesian translation." },
              meaning: { type: Type.STRING, description: "Brief definition in Indonesian explaining what the word is." },
              example: { type: Type.STRING, description: "Clear, practical, conversational example sentence in English using the word." },
              exampleTranslation: { type: Type.STRING, description: "Accurate Indonesian translation of the example sentence." },
              category: { type: Type.STRING, description: `The category ID. Set exactly to: '${cleanCategory}'` },
              imageSearchTerm: { type: Type.STRING, description: "Simple photographic English keyword search term representing this item for Unsplash (e.g. 'cozy couch living-room')." }
            },
            required: ["id", "english", "phonetic", "indonesian", "meaning", "example", "exampleTranslation", "category", "imageSearchTerm"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    let cards = [];
    try {
      cards = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("Failed to parse fallback response JSON: ", jsonText);
      throw new Error("Invalid output format returned by Gemini model. Please retry.");
    }

    // append isCustom flag to distinguish custom items and enforce category matching
    const processedCards = cards.map((card: any) => ({
      ...card,
      id: card.id || `custom_${Math.random().toString(36).substr(2, 9)}`,
      category: cleanCategory,
      isCustom: true
    }));

    return res.json({ cards: processedCards });

  } catch (error: any) {
    console.error("Gemini route error:", error);
    return res.status(500).json({ 
      error: error.message || "An unexpected error occurred while calling the Gemini vocabulary maker on the server." 
    });
  }
});

// API: Generate 50 brand-new vocabulary items bulk for a category
app.post("/api/gemini/bulk-more-vocab", async (req, res) => {
  try {
    const { category, categoryName, existingWords } = req.body;
    if (!category || !categoryName) {
      return res.status(400).json({ error: "Category ID and categoryName are required" });
    }

    if (!ai) {
      return res.status(503).json({ 
        error: "Google Gemini API key is missing. Please add GEMINI_API_KEY in Settings > Secrets to unlock adding more words." 
      });
    }

    const cleanCategory = String(category).trim().substring(0, 50);
    const cleanCategoryName = String(categoryName).trim().substring(0, 50);
    const excludeList = Array.isArray(existingWords) ? existingWords.map(w => String(w).toLowerCase().trim()) : [];

    const promptText = `Generate exactly 50 dynamic, high-quality, practical, and highly useful English vocabulary words with phonetic guides & Indonesian translations specifically of relevance to the theme: "${cleanCategoryName}".
To prevent duplicates, DO NOT generate any of the following existing words: ${excludeList.slice(0, 150).join(", ")}.
Make sure each vocabulary word is realistic, helpful for conversations, and has a unique generated ID starting with "bulk_" and a random string. Set the 'category' property of ALL generated items to exactly: "${cleanCategory}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are an elite bilingual English-Indonesian linguist and language teacher. Output high-impact learning flashcards strictly structured in the requested JSON schema. Make sure phonetic guides are accurate and easy to read (IPA phonetics format like /ˈpɪl.oʊ/). For 'imageSearchTerm', output simple search keywords in English (no punctuation, max 4 words) that would fetch a beautiful photo about this word on Unsplash. CRITICAL: The 'meaning' field must always be written entirely in Bahasa Indonesia — never in English, even when an English phrasing would feel more natural for a dictionary-style definition.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              english: { type: Type.STRING, description: "The English word (strictly lower-case)." },
              phonetic: { type: Type.STRING, description: "IPA Phonetic pronunciation guide, e.g. /ˈkaʊtʃ/ or /bʊk/" },
              indonesian: { type: Type.STRING, description: "Core Indonesian translation." },
              meaning: { type: Type.STRING, description: "Brief definition in Indonesian explaining what the word is." },
              example: { type: Type.STRING, description: "Clear, practical, conversational example sentence in English using the word." },
              exampleTranslation: { type: Type.STRING, description: "Accurate Indonesian translation of the example sentence." },
              category: { type: Type.STRING, description: `Must be exactly the provided category ID value: '${cleanCategory}'` },
              imageSearchTerm: { type: Type.STRING, description: "Simple photographic English keyword search term representing this item for Unsplash (e.g. 'cozy couch living-room')." }
            },
            required: ["id", "english", "phonetic", "indonesian", "meaning", "example", "exampleTranslation", "category", "imageSearchTerm"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    let cards = [];
    try {
      cards = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("Failed to parse response JSON: ", jsonText);
      throw new Error("Gagal mengurai respons asisten AI. Silakan coba kembali beberapa saat lagi.");
    }

    const processedCards = cards.map((card: any) => ({
      ...card,
      id: card.id || `bulk_${Math.random().toString(36).substr(2, 9)}`,
      category: cleanCategory,
      isCustom: true
    }));

    return res.json({ cards: processedCards });

  } catch (error: any) {
    console.error("Bulk generate error:", error);
    return res.status(500).json({ 
      error: error.message || "Terjadi kesalahan saat memproses penambahan kosakata oleh Gemini."
    });
  }
});

// Configure Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static build assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
