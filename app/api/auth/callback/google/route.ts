import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/memory-framework/config";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const logPrefix = "[API GoogleCallback]";
  
  logger.info(`${logPrefix} Placeholder route - Google integration temporarily disabled.`);
  
  // Redirect to home page with message indicating feature is coming soon
  return NextResponse.redirect(new URL("/?googleComingSoon=true", req.url));
} 