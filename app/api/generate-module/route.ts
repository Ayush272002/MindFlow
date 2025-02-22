import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Convert the following educational content into an interactive learning module.
      Follow these guidelines:
      1. Break down the content into logical sections
      2. Create engaging questions for each section
      3. Include practical exercises and examples
      4. Generate knowledge check points
      5. Structure the content for progressive learning
      
      Content: ${content}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const moduleContent = response.text();

    const moduleId = crypto.randomUUID();

    return Response.json({
      moduleId,
      success: true,
    });
  } catch (error) {
    console.error("Error generating module:", error);
    return Response.json(
      {
        error: "Failed to generate module",
      },
      {
        status: 500,
      }
    );
  }
}
