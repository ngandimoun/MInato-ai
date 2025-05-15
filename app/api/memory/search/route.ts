// FILE: app/api/memory/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // Utilise le client serveur de @supabase/ssr via notre wrapper
import { cookies } from "next/headers";
import { CompanionCoreMemory } from "@/memory-framework/core/CompanionCoreMemory";
import {
  PaginationParams,
  SearchOptions,
  SearchResult as MemoryFrameworkSearchResult,
  PaginatedResults,
} from "@/memory-framework/core/types"; // Ajout de SearchResult pour le type de retour
import { logger } from "@/memory-framework/config";
import { MEMORY_SEARCH_LIMIT_DEFAULT } from "@/lib/constants";
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";

function getMemoryFramework(): CompanionCoreMemory {
  try {
    return getGlobalMemoryFramework();
  } catch (memError: any) {
    logger.error(
      "[API MemorySearch] Failed to get memory framework:",
      memError.message,
      memError.stack
    );
    throw new Error(`Memory Framework initialization failed: ${memError.message}`);
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API MemorySearch]";
  const cookieStore = cookies();
  let userId: string | null = null;

  // --- Authentication ---
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.error(
        `${logPrefix} Auth] Supabase getUser() error: ${userError.message} (Status: ${userError.status})`,
        userError
      );
      // Si getUser() retourne une erreur explicite, il est préférable de la retourner directement
      return NextResponse.json(
        { error: `Authentication check failed: ${userError.message}` },
        { status: userError.status || 500 }
      );
    }
    if (!user) {
      logger.warn(
        `${logPrefix} Auth] No active Supabase user found via getUser().`
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    logger.info(
      `${logPrefix} Search request from user: ${userId.substring(
        0,
        8
      )}... (Authenticated in API route)`
    );
  } catch (authError: any) {
    logger.error(
      `${logPrefix} Auth Exception during client creation or getUser call:`,
      authError.message,
      authError.stack
    );
    return NextResponse.json(
      { error: "Authentication process error" },
      { status: 500 }
    );
  }
  // --- Fin Authentication ---

  // Input Validation
  let query: string;
  let pagination: PaginationParams;
  let searchOptions: SearchOptions | null = null; // searchOptions peut être null

  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }

    // Validate query
    if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
      throw new Error("Missing or empty 'query' field. Must be a non-empty string.");
    }
    query = body.query.trim();

    // Validate pagination
    const limit = body.limit ?? MEMORY_SEARCH_LIMIT_DEFAULT;
    const offset = body.offset ?? 0;

    if (typeof limit !== 'number' && typeof limit !== 'string') {
      throw new Error("'limit' must be a number or numeric string if provided");
    }
    if (typeof offset !== 'number' && typeof offset !== 'string') {
      throw new Error("'offset' must be a number or numeric string if provided");
    }

    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    if (isNaN(limitNum) || !Number.isInteger(limitNum) || limitNum <= 0) {
      throw new Error("'limit' must be a positive integer");
    }
    if (isNaN(offsetNum) || !Number.isInteger(offsetNum) || offsetNum < 0) {
      throw new Error("'offset' must be a non-negative integer");
    }

    // Validate and clean pagination
    pagination = {
      limit: Math.min(limitNum, 50), // Cap at 50 max
      offset: offsetNum,
    };

    // Validate searchOptions
    if (body.searchOptions !== undefined) {
      if (body.searchOptions === null) {
        searchOptions = null;
      } else if (typeof body.searchOptions !== "object" || Array.isArray(body.searchOptions)) {
        throw new Error("'searchOptions' must be an object or null if provided");
      } else {
        // Create a safe search options object
        const safeOptions: SearchOptions = {};
        
        // Type-safe copying of boolean properties
        if (typeof body.searchOptions.enableHybridSearch === 'boolean') {
          safeOptions.enableHybridSearch = body.searchOptions.enableHybridSearch;
        } else if (body.searchOptions.enableHybridSearch !== undefined) {
          throw new Error("'searchOptions.enableHybridSearch' must be a boolean if provided");
        }
        
        if (typeof body.searchOptions.enableGraphSearch === 'boolean') {
          safeOptions.enableGraphSearch = body.searchOptions.enableGraphSearch;
        } else if (body.searchOptions.enableGraphSearch !== undefined) {
          throw new Error("'searchOptions.enableGraphSearch' must be a boolean if provided");
        }
        
        if (typeof body.searchOptions.enableConflictResolution === 'boolean') {
          safeOptions.enableConflictResolution = body.searchOptions.enableConflictResolution;
        } else if (body.searchOptions.enableConflictResolution !== undefined) {
          throw new Error("'searchOptions.enableConflictResolution' must be a boolean if provided");
        }
        
        if (typeof body.searchOptions.rerank === 'boolean') {
          safeOptions.rerank = body.searchOptions.rerank;
        } else if (body.searchOptions.rerank !== undefined) {
          throw new Error("'searchOptions.rerank' must be a boolean if provided");
        }
        
        // Handle numeric properties - be explicit about property names to avoid indexing errors
        const numericProps = ['vectorWeight', 'keywordWeight', 'graphWeight'];
        numericProps.forEach(prop => {
          if (body.searchOptions[prop] !== undefined) {
            const val = Number(body.searchOptions[prop]);
            if (isNaN(val) || val < 0 || val > 1) {
              throw new Error(`'searchOptions.${prop}' must be a number between 0 and 1 if provided`);
            }
            
            // Type-safe assignment for each specific property
            if (prop === 'vectorWeight') safeOptions.vectorWeight = val;
            if (prop === 'keywordWeight') safeOptions.keywordWeight = val;
            if (prop === 'graphWeight') safeOptions.graphWeight = val;
          }
        });
        
        // Handle filters object
        if (body.searchOptions.filters !== undefined) {
          if (body.searchOptions.filters === null) {
            safeOptions.filters = null;
          } else if (typeof body.searchOptions.filters !== 'object' || Array.isArray(body.searchOptions.filters)) {
            throw new Error("'searchOptions.filters' must be an object or null if provided");
          } else {
            safeOptions.filters = { ...body.searchOptions.filters };
          }
        }
        
        searchOptions = safeOptions;
      }
    }

    logger.debug(
      `${logPrefix} Validated input for user ${userId.substring(
        0,
        8
      )}. Query: "${query.substring(0, 30)}...", Limit: ${
        pagination.limit
      }, Offset: ${pagination.offset}, Options: ${JSON.stringify(
        searchOptions
      )}`
    );
  } catch (e: any) {
    logger.error(
      `${logPrefix} Invalid request body for user ${userId?.substring(0, 8) || 'unknown'}:`,
      e.message
    );
    return NextResponse.json(
      { error: `Invalid request: ${e.message}` },
      { status: 400 }
    );
  }

  // Search Execution
  try {
    const memory = getMemoryFramework(); // Peut lancer une erreur si l'initialisation a échoué
    logger.info(
      `${logPrefix} Searching memory for user ${userId.substring(
        0,
        8
      )} with query "${query.substring(0, 50)}...", Limit: ${
        pagination.limit
      }, Offset: ${pagination.offset}`
    );

    // L'appel à search_memory
    const results: PaginatedResults<MemoryFrameworkSearchResult> =
      await memory.search_memory(
        query,
        userId,
        pagination,
        null, // runId - passer null si non pertinent pour cette recherche spécifique
        searchOptions
      );

    logger.info(
      `${logPrefix} Search completed for user ${userId.substring(
        0,
        8
      )}. Found ${results.results.length} results (Est. Total: ${
        results.total_estimated ?? "N/A"
      }).`
    );
    return NextResponse.json(results);
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error during memory search for user ${userId.substring(
        0,
        8
      )}:`,
      error.message,
      error.stack
    );
    // Gérer le cas où l'erreur vient de getMemoryFramework()
    if (error.message.includes("Memory Framework initialization failed")) {
      return NextResponse.json(
        { error: "Core service unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
