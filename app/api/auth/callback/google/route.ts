import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { appConfig } from "@/lib/config";
import { encryptData } from "@/lib/utils/encryption";
import { logger } from "@/memory-framework/config";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const logPrefix = "[API GoogleCallback]";
  const url = new URL(req.url);
  const cookieStore = cookies();

  // Extract parameters from the URL query string
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const scopeStr = url.searchParams.get("scope");
  
  logger.info(`${logPrefix} Received callback with params - code exists: ${!!code}, state exists: ${!!state}, error: ${error || 'none'}, scopes: ${scopeStr || 'none'}`);
  
  // Get the stored state from the cookie
  const storedState = cookieStore.get("google_oauth_state")?.value;
  
  // Delete the state cookie regardless of outcome (it's one-time use)
  cookieStore.delete("google_oauth_state");
  
  // Check for errors from Google OAuth
  if (error) {
    logger.error(`${logPrefix} Google OAuth error: ${error}`);
    return NextResponse.redirect(new URL("/?error=google_auth_error", url.origin));
  }
  
  // Verify state parameter to prevent CSRF attacks
  if (!storedState || !state || storedState !== state) {
    logger.error(`${logPrefix} Invalid OAuth state parameter. Stored: ${storedState?.substring(0, 6) || 'none'}, Received: ${state?.substring(0, 6) || 'none'}`);
    return NextResponse.redirect(new URL("/?error=invalid_state", url.origin));
  }
  
  // Ensure we have an authorization code
  if (!code) {
    logger.error(`${logPrefix} No authorization code provided.`);
    return NextResponse.redirect(new URL("/?error=no_auth_code", url.origin));
  }

  // Get the authenticated user
  let userId: string;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id) {
      logger.error(`${logPrefix} Auth error: ${error?.message || "No user found"}`);
      return NextResponse.redirect(new URL("/?error=auth_required", url.origin));
    }
    userId = user.id;
    logger.info(`${logPrefix} Processing Google OAuth callback for user: ${userId.substring(0, 8)}...`);
  } catch (authError: any) {
    logger.error(`${logPrefix} Auth exception:`, authError);
    return NextResponse.redirect(new URL("/?error=auth_error", url.origin));
  }

  // Check OAuth configuration
  logger.info(`${logPrefix} Google OAuth configuration check - ClientID exists: ${!!appConfig.toolApiKeys.googleClientId}, ClientSecret exists: ${!!appConfig.toolApiKeys.googleClientSecret}, RedirectURI: ${process.env.GOOGLE_REDIRECT_URI}, EncryptionKey exists: ${!!appConfig.encryptionKey}`);
  
  if (!appConfig.toolApiKeys.googleClientId || !appConfig.toolApiKeys.googleClientSecret || !process.env.GOOGLE_REDIRECT_URI) {
    logger.error(`${logPrefix} Missing Google OAuth configuration.`);
    return NextResponse.redirect(new URL("/?error=config_error", url.origin));
  }

  try {
    // Create OAuth client
    const oauth2Client = new OAuth2Client(
      appConfig.toolApiKeys.googleClientId,
      appConfig.toolApiKeys.googleClientSecret,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Exchange the authorization code for tokens
    logger.info(`${logPrefix} Exchanging authorization code for tokens...`);
    const { tokens } = await oauth2Client.getToken(code);
    logger.info(`${logPrefix} Token exchange result - Access token exists: ${!!tokens.access_token}, Refresh token exists: ${!!tokens.refresh_token}, Expiry date exists: ${!!tokens.expiry_date}`);
    
    if (!tokens.refresh_token) {
      logger.error(`${logPrefix} No refresh token received from Google. User may need to revoke access and try again.`);
      const errorMessage = "Google didn't provide a refresh token. This typically happens when you've previously granted access. Please go to your Google account settings (https://myaccount.google.com/permissions), revoke access for Minato AI, and try connecting again.";
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorMessage)}`, url.origin));
    }
    
    // Check if we have the required encryption key
    if (!appConfig.encryptionKey) {
      logger.error(`${logPrefix} No encryption key available to secure the refresh token.`);
      return NextResponse.redirect(new URL("/?error=missing_encryption", url.origin));
    }
    
    // Encrypt the refresh token
    const encryptedRefreshToken = encryptData(tokens.refresh_token, appConfig.encryptionKey);
    if (!encryptedRefreshToken) {
      logger.error(`${logPrefix} Failed to encrypt refresh token.`);
      return NextResponse.redirect(new URL("/?error=encryption_failed", url.origin));
    }
    
    // Determine which permissions were granted based on the scopes
    const scopes = scopeStr?.split(' ') || [];
    const hasCalendarScope = scopes.includes('https://www.googleapis.com/auth/calendar.readonly');
    const hasGmailScope = scopes.includes('https://www.googleapis.com/auth/gmail.readonly');
    
    logger.info(`${logPrefix} Scopes granted - Calendar: ${hasCalendarScope}, Gmail: ${hasGmailScope}, All scopes: ${scopes.join(', ')}`);
    
    if (!hasCalendarScope && !hasGmailScope) {
      logger.warn(`${logPrefix} No recognized scopes granted. Scopes: ${scopeStr}`);
      return NextResponse.redirect(new URL("/?error=no_scopes_granted", url.origin));
    }
    
    // Store the tokens in the database using the admin client
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      logger.error(`${logPrefix} Admin Supabase client unavailable.`);
      return NextResponse.redirect(new URL("/?error=db_client_error", url.origin));
    }
    
    // Store the integration in the database
    logger.info(`${logPrefix} Storing Google integration in database for user ${userId.substring(0, 8)}...`);
    const { error: upsertError } = await supabaseAdmin
      .from("user_integrations")
      .upsert({
        user_id: userId,
        provider: "google",
        refresh_token_encrypted: encryptedRefreshToken,
        access_token_encrypted: tokens.access_token ? encryptData(tokens.access_token, appConfig.encryptionKey) : null,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scopes: scopes.join(' '),
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" });
    
    if (upsertError) {
      logger.error(`${logPrefix} Error storing Google integration: ${upsertError.message}, Code: ${upsertError.code}, Details: ${JSON.stringify(upsertError.details || {})}`);
      return NextResponse.redirect(new URL("/?error=db_storage_error", url.origin));
    }
    
    // Update user state to enable the appropriate services
    logger.info(`${logPrefix} Updating user_states to enable Google services - Calendar: ${hasCalendarScope}, Gmail: ${hasGmailScope}`);
    const { error: updateError } = await supabaseAdmin
      .from("user_states")
      .update({
        googlecalendarenabled: hasCalendarScope,
        googleemailenabled: hasGmailScope,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    
    if (updateError) {
      logger.warn(`${logPrefix} Error updating user state with Google permissions: ${updateError.message}, Code: ${updateError.code}, Details: ${JSON.stringify(updateError.details || {})}`);
      // Continue despite error, the integration is already stored
    }
    
    // Check if the user has a record in user_states
    const { data: userState, error: userStateError } = await supabaseAdmin
      .from("user_states")
      .select("user_id, googlecalendarenabled, googleemailenabled")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (userStateError) {
      logger.warn(`${logPrefix} Error checking user state: ${userStateError.message}`);
    } else if (!userState) {
      logger.warn(`${logPrefix} No user_states record found for user ${userId.substring(0, 8)}. Attempting to create one...`);
      const { error: insertError } = await supabaseAdmin
        .from("user_states")
        .insert({
          user_id: userId,
          googlecalendarenabled: hasCalendarScope,
          googleemailenabled: hasGmailScope,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
      if (insertError) {
        logger.error(`${logPrefix} Failed to create user_states record: ${insertError.message}`);
      } else {
        logger.info(`${logPrefix} Successfully created user_states record for user ${userId.substring(0, 8)}`);
      }
    } else {
      logger.info(`${logPrefix} Confirmed user_states record updated - Calendar: ${userState.googlecalendarenabled}, Gmail: ${userState.googleemailenabled}`);
    }
    
    logger.info(`${logPrefix} Successfully stored Google integration for user ${userId.substring(0, 8)} with scopes: ${scopes.join(', ')}`);
    
    // Redirect to success page
    return NextResponse.redirect(new URL("/?googleConnected=true", url.origin));
  } catch (error: any) {
    logger.error(`${logPrefix} Error during Google OAuth token exchange: ${error.message}, Stack: ${error.stack}`);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(`google_token_error: ${error.message?.substring(0, 100) || "Unknown error"}`)}`, url.origin));
  }
} 