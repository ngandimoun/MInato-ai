import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: "Text and target language are required" },
        { status: 400 }
      );
    }

    // Skip translation if already in target language
    if (sourceLanguage === targetLanguage || targetLanguage === "en") {
      return NextResponse.json({
        translatedText: text,
        detectedLanguage: sourceLanguage || "en",
        wasTranslated: false,
      });
    }

    const languageMap: { [key: string]: string } = {
      en: "English",
      es: "Spanish",
      fr: "French", 
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      hi: "Hindi",
    };

    const targetLanguageName = languageMap[targetLanguage] || targetLanguage;

    const translationPrompt = `You are a professional translator. Translate the following text to ${targetLanguageName} while preserving the meaning, tone, and context.

Text to translate: "${text}"

Rules:
- Maintain the original tone and style
- Preserve any technical terms appropriately
- Keep formatting and structure
- If the text is already in ${targetLanguageName}, return it unchanged
- Only return the translated text, no additional explanation

Translated text:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system", 
          content: "You are a professional translator. Provide accurate, contextual translations while preserving tone and meaning."
        },
        {
          role: "user",
          content: translationPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translatedText = response.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      translatedText,
      detectedLanguage: sourceLanguage || "unknown",
      wasTranslated: true,
    });

  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 