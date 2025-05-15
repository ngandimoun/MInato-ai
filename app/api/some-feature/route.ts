import { NextResponse } from 'next/server';
import { appConfig } from '@/lib/config'; // OK here - runs in Node.js
import { config as memoryFrameworkConfig, logger } from '@/memory-framework/config/index'; // OK here

export async function GET(request: Request) {
    // You can now safely use the full configurations
    logger.info(`API Route using memory framework config. Log Level: ${memoryFrameworkConfig.logLevel}`);
    logger.debug(`App config Neo4j URI: ${appConfig.neo4jUri}`);

    // Access server-only keys
    const apiKey = appConfig.openaiApiKey;
    // ... perform actions using the configs ...

    if (!apiKey) {
         logger.error("OpenAI API Key is missing in server config!");
         return NextResponse.json({ error: 'Server configuration issue' }, { status: 500 });
    }

    // Example logic
    const responseData = {
        message: "Data from API using full config",
        modelUsed: appConfig.openai.text,
        memoryCacheTTL: memoryFrameworkConfig.cache.searchCacheTTLSeconds,
    };

    return NextResponse.json(responseData);
}