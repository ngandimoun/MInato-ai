import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { logger } from "@/memory-framework/config";

// Make this endpoint publicly accessible without authentication
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const logPrefix = "[API TestGoogleConfig]";
  
  logger.info(`${logPrefix} Testing Google OAuth configuration...`);
  
  const googleConfig = {
    clientIdExists: !!appConfig.toolApiKeys.googleClientId,
    clientSecretExists: !!appConfig.toolApiKeys.googleClientSecret,
    redirectUriExists: !!process.env.GOOGLE_REDIRECT_URI,
    clientId: appConfig.toolApiKeys.googleClientId 
      ? `${appConfig.toolApiKeys.googleClientId.substring(0, 6)}...${appConfig.toolApiKeys.googleClientId.substring(appConfig.toolApiKeys.googleClientId.length - 4)}`
      : null,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    envClientId: process.env.GOOGLE_CLIENT_ID 
      ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 6)}...${process.env.GOOGLE_CLIENT_ID.substring(process.env.GOOGLE_CLIENT_ID.length - 4)}`
      : null,
  };
  
  // Check if toolApiKeys is correctly loaded
  const toolApiKeysStructure = {
    exists: !!appConfig.toolApiKeys,
    keys: appConfig.toolApiKeys ? Object.keys(appConfig.toolApiKeys) : [],
  };
  
  logger.info(`${logPrefix} Google config: ${JSON.stringify(googleConfig)}`);
  logger.info(`${logPrefix} Tool API keys structure: ${JSON.stringify(toolApiKeysStructure)}`);
  
  return NextResponse.json({
    googleConfig,
    toolApiKeysStructure,
    encryptionKeyExists: !!appConfig.encryptionKey,
    // Safe to expose these non-secret values for debugging
    environment: process.env.NODE_ENV,
    appUrl: appConfig.app?.url || process.env.NEXT_PUBLIC_APP_URL,
  });
} 