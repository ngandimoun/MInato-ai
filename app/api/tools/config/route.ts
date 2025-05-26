// API endpoint: GET /api/tools/config
// Returns key orchestration/tooling config values for UI/LLM/devs (maxToolsPerTurn, timeouts, model names, feature flags, etc.)
import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";

export async function GET(_req: NextRequest) {
  const openai = appConfig.openai;
  return NextResponse.json({
    maxToolsPerTurn: openai.maxToolsPerTurn,
    toolTimeoutMs: appConfig.toolTimeoutMs,
    chatModel: openai.chatModel,
    planningModel: openai.planningModel,
    extractionModel: openai.extractionModel,
    developerModel: openai.developerModel,
    sttModel: openai.sttModel,
    ttsModel: openai.ttsModel,
    embedderModel: openai.embedderModel,
    embeddingDims: openai.embeddingDims,
    enableVision: openai.enableVision,
    visionDetail: openai.visionDetail,
    enableTtsPostProcessing: (openai as any).enableTtsPostProcessing ?? null,
    ttsDefaultVoice: openai.ttsDefaultVoice,
    ttsVoices: openai.ttsVoices,
    temperature: openai.temperature,
    maxTokens: openai.maxTokens,
    maxVisionTokens: openai.maxVisionTokens,
    mediaUploadBucket: openai.mediaUploadBucket,
    fastModel: openai.fastModel,
    balancedModel: openai.balancedModel,
    complexModel: openai.complexModel,
    // Add more config fields as needed
  });
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 