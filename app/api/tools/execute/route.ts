// FILE: app/api/tools/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  RATE_LIMIT_ID_TOOL_EXECUTION,
  DEFAULT_TOOL_TIMEOUT_MS,
} from "@/lib/constants";
import { tools as appToolsRegistry, resolveToolName } from "@/lib/tools/index";
import { ToolInput, ToolOutput } from "@/lib/tools/base-tool";
import type { UserState } from "@/lib/types";
import Ajv from "ajv";
// Locally defined for this route (not exported from types)
interface ToolExecutionRequest {
  toolName: string;
  toolArgs: Record<string, any> | null;
  sessionId?: string;
}

interface ToolExecutionResponse {
  status: 'success' | 'error';
  message: string;
  data: any;
  error?: string;
}
import { logger } from "../../../../memory-framework/config"; // Ajuster le chemin relatif si nécessaire
import { appConfig } from "@/lib/config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const logPrefix = "[API ToolExecute]";
  const origin = req.headers.get("origin");

  // --- Integrated Auth Check --- 
  const cookieStore = cookies();
  const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
  let userId: string;
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.error(
        `${logPrefix} Auth Supabase getUser error:`,
        userError.message
      );
      // Don't return NextResponse here, throw an error to be caught below
      throw new Error("Authentication failed"); 
    }
    if (!user?.id) {
      logger.warn(`${logPrefix} Auth No authenticated Supabase user found.`);
      // Don't return NextResponse here, throw an error to be caught below
      throw new Error("Unauthorized");
    }
    userId = user.id; // Assign userId here

  } catch (authError: any) {
    logger.error(`${logPrefix} Auth check failed:`, authError.message);
    const status = authError.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: authError.message }, { status });
  }
  // --- End Integrated Auth Check ---
  
  logger.info(
    `${logPrefix} Request received for user: ${userId.substring(0, 8)}...`
  );
  
  // --- Rate Limiting --- (Moved below auth check)
  const { success: rateLimitSuccess } = await checkRateLimit(
    userId,
    RATE_LIMIT_ID_TOOL_EXECUTION
  );
  if (!rateLimitSuccess) {
    logger.warn(
      `${logPrefix} Rate limit exceeded for user ${userId.substring(0, 8)}`
    );
    return NextResponse.json(
      { error: "Tool execution rate limit exceeded" },
      { status: 429 }
    );
  }
  // --- End Rate Limiting ---

  let requestBody: ToolExecutionRequest;
  try {
    requestBody = await req.json();
    if (!requestBody.toolName || typeof requestBody.toolName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid toolName." },
        { status: 400 }
      );
    }
    if (typeof requestBody.toolArgs !== "object") {
      // Permettre null ici
      logger.warn(
        `${logPrefix} Invalid toolArgs (not an object or null) for user ${userId.substring(
          0,
          8
        )}:`,
        requestBody.toolArgs
      );
      return NextResponse.json(
        { error: "Missing or invalid toolArgs object." },
        { status: 400 }
      );
    }
    if (requestBody.toolArgs === null) {
      // Si null, le remplacer par un objet vide
      requestBody.toolArgs = {};
    }
  } catch (e: any) {
    // Typer l'erreur
    logger.error(`${logPrefix} Invalid JSON request body:`, e.message);
    return NextResponse.json(
      { error: `Invalid JSON request body: ${e.message}` },
      { status: 400 }
    );
  }

  const { toolName, toolArgs, sessionId } = requestBody;
  let tool = appToolsRegistry[toolName];

  if (!tool) {
    const resolved = resolveToolName(toolName);
    if (resolved && typeof resolved === 'object' && 'execute' in resolved) tool = resolved;
  }

  if (!tool) {
    logger.error(
      `${logPrefix} Tool not found: ${toolName} for user ${userId.substring(
        0,
        8
      )}`
    );
    return NextResponse.json(
      {
        status: "error",
        error: `Tool '${toolName}' not found.`,
      } as ToolExecutionResponse,
      { status: 404 }
    );
  }

  // Check if the tool is enabled
  if (tool.enabled === false) {
    logger.warn(
      `${logPrefix} Attempted to use disabled tool: ${toolName} for user ${userId.substring(
        0,
        8
      )}`
    );
    return NextResponse.json(
      {
        status: "error",
        error: `Tool '${toolName}' is currently disabled.`,
        message: "This feature is currently unavailable. It will be available in a future upgrade."
      } as ToolExecutionResponse,
      { status: 403 }
    );
  }

  // Validate arguments
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(tool.argsSchema);
  if (!validate(toolArgs)) {
    logger.error(
      `${logPrefix} Invalid arguments for user ${userId.substring(0, 8)}:`,
      validate.errors
    );
    return NextResponse.json(
      { error: `Invalid arguments: ${JSON.stringify(validate.errors)}` },
      { status: 400 }
    );
  }

  try {
    const userState: UserState | null = await supabaseAdmin.getUserState(userId);
    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    let locale = req.headers.get("accept-language")?.split(",")[0]
      ?? userState?.preferred_locale
      ?? undefined;
    if (!locale) locale = appConfig.defaultLocale;

    const abortController = new AbortController();
    const timeoutDuration =
      (tool as any).timeoutMs ||
      appConfig.toolTimeoutMs ||
      DEFAULT_TOOL_TIMEOUT_MS;
    const timeoutId = setTimeout(() => {
      logger.warn(
        `${logPrefix} Tool execution timeout triggered for '${toolName}' (User: ${userId.substring(
          0,
          8
        )}) after ${timeoutDuration}ms`
      );
      abortController.abort();
    }, timeoutDuration);

    const toolInput: ToolInput = {
      ...(toolArgs || {}), // S'assurer que toolArgs n'est pas null
      userId: userId,
      lang: (locale?.split("-")[0] ?? 'en'),
      sessionId: sessionId,
      context: {
        ipAddress: ipAddress,
        latitude: userState?.latitude ?? undefined,
        longitude: userState?.longitude ?? undefined,
        timezone: userState?.timezone ?? undefined,
        userState: userState ?? undefined,
        origin: origin,
        locale: (locale ?? appConfig.defaultLocale),
        countryCode: userState?.country_code ?? undefined,
        runId: sessionId,
        abortSignal: abortController.signal,
        userName: userState?.user_first_name ?? undefined,
      },
    };

    logger.info(
      `${logPrefix} Executing tool '${toolName}' for user ${userId.substring(
        0,
        8
      )} with args keys: ${Object.keys(toolArgs || {}).join(", ")}`
    );
    const start = Date.now();
    const output: ToolOutput = await tool.execute(
      toolInput,
      abortController.signal
    );
    clearTimeout(timeoutId);
    const duration = Date.now() - start;
    logger.info(
      `${logPrefix} Tool '${toolName}' execution finished for user ${userId.substring(
        0,
        8
      )} (${duration}ms). Success: ${!output.error}`
    );

    const responsePayload: ToolExecutionResponse = {
      status: output.error ? "error" : "success",
      message: output.result ?? "",
      data: output.structuredData || null,
      error: output.error || undefined,
    };
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    // Typer l'erreur
    let errorMessage = `Internal server error during tool execution: ${error.message}`;
    let status = 500;
    if (error.name === "AbortError") {
      errorMessage = `Tool execution timed out after ${
        (appConfig.toolTimeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS) / 1000
      } seconds.`;
      status = 408; // Request Timeout
      logger.error(
        `${logPrefix} Tool '${toolName}' timed out for user ${userId.substring(
          0,
          8
        )}.`
      );
    } else {
      logger.error(
        `${logPrefix} Unhandled exception executing tool '${toolName}' for user ${userId.substring(
          0,
          8
        )}:`,
        error.message,
        error.stack
      );
    }
    const responsePayload: ToolExecutionResponse = {
      status: "error",
      error: errorMessage,
      message: "An unexpected error occurred while running the tool.", // Message plus générique pour l'utilisateur
      data: null,
    };
    return NextResponse.json(responsePayload, { status: status });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
