// FILE: app/api/example-server-route/route.ts
// (Content from finalcodebase.txt - verified)
import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import {
  config as memoryFrameworkConfig,
  logger,
} from "@/memory-framework/config/index";

export async function GET(request: Request) {
  logger.info(
    `[API Example] Route using memory framework config. Log Level: ${memoryFrameworkConfig.logLevel}`
  );
  logger.debug(`[API Example] App config Neo4j URI: ${appConfig.neo4jUri}`);
  const apiKey = appConfig.openaiApiKey;
  if (!apiKey) {
    logger.error("[API Example] OpenAI API Key is missing in server config!");
    return NextResponse.json(
      { error: "Server configuration issue" },
      { status: 500 }
    );
  }

  const responseData = {
    message: "Data from API using full config",
    modelUsed: appConfig.openai.text,
    memoryCacheTTL: memoryFrameworkConfig.cache.searchCacheTTLSeconds,
  };
  return NextResponse.json(responseData);
}
