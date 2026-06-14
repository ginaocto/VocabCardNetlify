export const handler = async () => {
  const hasAI = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hasAI,
      message: hasAI
        ? "Gemini API is ready to craft custom flashcards."
        : "GEMINI_API_KEY is not set. Add it in Netlify → Site Settings → Environment Variables.",
    }),
  };
};
