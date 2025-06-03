// FILE: app/api/auth/connect/google/route.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/memory-framework/config";

export async function GET(req: NextRequest) {
  const logPrefix = "[API GoogleConnect Initiate]";
  
  logger.info(`${logPrefix} Placeholder route - Google integration temporarily disabled.`);
  
  // Return a placeholder response that indicates this feature is coming soon
  return NextResponse.json({
    message: "Google integration is currently disabled and will be available in a future Minato upgrade.",
    comingSoon: true
  });
}
