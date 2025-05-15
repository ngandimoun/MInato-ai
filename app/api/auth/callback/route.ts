// TEMPORARY TEST for app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/memory-framework/config";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  logger.info(`[AuthCallback_TEST] HIT! Code: ${code}. URL: ${request.url}`);
  console.log(`[AuthCallback_TEST_CONSOLE] HIT! Code: ${code}. URL: ${request.url}`);
  return NextResponse.json({ message: "Auth Callback Test Reached", code: code });
}