// FILE: memory-framework/services/Neo4jService.ts
// (Content from finalcodebase.txt - verified)
import neo4j, {
  Driver,
  Session,
  Transaction,
  QueryResult,
  Integer,
  Record as Neo4jRecord,
  SessionMode,
  ManagedTransaction, // Import ManagedTransaction
} from "neo4j-driver";
import {
  FrameworkConfig,
  ExtractedInfo,
  PaginationParams,
  PaginatedResults,
  LatestGraphInfo,
  GraphSearchResult,
} from "../core/types";
import { getCurrentISOTimestamp } from "../core/utils";
import { config as frameworkConfigInternal, logger } from "../config";

const APOC_MISSING_ERROR_CODE = "Neo.ClientError.Statement.SyntaxError";
const APOC_MISSING_ERROR_FRAGMENT = "Unknown function 'apoc.";

export class Neo4jService {
  private driver: Driver;
  private config: FrameworkConfig["graphStore"];
  private apocAvailable: boolean | null = null;

  constructor(config: FrameworkConfig) {
    this.config = config.graphStore;
    if (!this.config.url || !this.config.username || !this.config.password) {
      throw new Error("Neo4j URL, username, and password are required.");
    }
    try {
      this.driver = neo4j.driver(
        this.config.url,
        neo4j.auth.basic(this.config.username, this.config.password),
        {
          maxConnectionPoolSize: 50,
          connectionTimeout: 7500,
          logging: neo4j.logging.console(
            frameworkConfigInternal.logLevel === "debug" ? "debug" : "warn"
          ),
        }
      );
      this.verifyConnectionAndApoc().catch((err) => {
        logger.error(
          "Neo4jService: Initial connection/APOC verification failed:",
          err.message
        );
      });
      logger.info("Neo4j Driver initialized.");
    } catch (error: any) {
      logger.error(
        "Neo4jService: Failed to create Neo4j driver:",
        error.message
      );
      throw error;
    }
  }

  private async verifyConnectionAndApoc(): Promise<void> {
    let session: Session | null = null;
    try {
      session = this.getSession("READ");
      await session.run("RETURN 1");
      logger.info("Neo4j Driver Connection Verified Successfully.");

      // Check for APOC Core by attempting to call a common function
      try {
        const apocResult = await session.run(
          "RETURN apoc.version() AS version"
        );
        if (
          apocResult.records.length > 0 &&
          apocResult.records[0].get("version")
        ) {
          this.apocAvailable = true;
          logger.info(
            `APOC Core plugin detected (Version: ${apocResult.records[0].get(
              "version"
            )}).`
          );
        } else {
          this.apocAvailable = false;
          logger.warn(
            "APOC Core plugin not detected or apoc.version() function unavailable. Relationship merging may fail."
          );
        }
      } catch (apocError: any) {
        if (
          apocError.code === APOC_MISSING_ERROR_CODE ||
          apocError.message?.includes(APOC_MISSING_ERROR_FRAGMENT)
        ) {
          this.apocAvailable = false;
          logger.warn(
            "APOC Core plugin test failed. Assuming APOC is unavailable. Relationship merging may fail."
          );
        } else {
          logger.warn(
            `Neo4j: Unexpected error during APOC check: ${apocError.message}. Assuming APOC might be available but check failed.`
          );
          this.apocAvailable = null; // Indicate uncertainty
        }
      }
    } catch (error: any) {
      logger.error("Neo4j Driver Connection Error:", error.message || error);
      this.apocAvailable = null; // Cannot determine APOC availability if connection fails
      // Re-throw connection error
      throw error;
    } finally {
      await this.safelyCloseSession(session);
    }
  }

  private getSession(accessMode: SessionMode): Session {
    return this.driver.session({ defaultAccessMode: accessMode });
  }

  private async safelyCloseSession(session: Session | null): Promise<void> {
    if (session) {
      try {
        await session.close();
      } catch (e: any) {
        logger.error("Neo4j session close error:", e.message);
      }
    }
  }

  private mapRecordToObject<T = Record<string, any>>(record: Neo4jRecord): T {
    const obj: Record<string, any> = {};
    record.keys.forEach((key) => {
      const value = record.get(key);
      // Handle Neo4j Integer type explicitly
      if (neo4j.isInt(value)) {
        obj[key as string] = (value as Integer).toNumber();
      } else if (typeof value === "bigint") {
        try {
          obj[key as string] = Number(value);
        } catch {
          obj[key as string] = value.toString();
        }
      }
      // Handle Neo4j temporal types
      else if (
        neo4j.isDate(value) ||
        neo4j.isDateTime(value) ||
        neo4j.isLocalDateTime(value) ||
        neo4j.isTime(value) ||
        neo4j.isLocalTime(value) ||
        neo4j.isDuration(value)
      ) {
        obj[key as string] = value.toString();
      } else if (value instanceof neo4j.types.Point) {
        obj[key as string] = { latitude: value.y, longitude: value.x };
      } // Example: Map Point to {lat, lon}
      else {
        obj[key as string] = value;
      } // Handle standard types
    });
    return obj as T;
  }

  private async runQuery<T = Record<string, any>>(
    mode: SessionMode,
    query: string,
    params?: Record<string, any>
  ): Promise<T[] | null> {
    let session: Session | null = null;
    const querySnippet = query.substring(0, 150).replace(/\n/g, " ");
    const paramKeys = params ? Object.keys(params).join(",") : "None";
    logger.debug(
      `Neo4j Exec (${mode}): "${querySnippet}..." Param Keys: [${paramKeys}]`
    );
    const startTime = Date.now();

    try {
      session = this.getSession(mode);
      // Prepare parameters, ensuring Neo4j Integer compatibility for SKIP/LIMIT
      const preparedParams = params ? { ...params } : undefined;
      if (
        preparedParams?.limit !== undefined &&
        typeof preparedParams.limit === "number"
      ) {
        preparedParams.limit = neo4j.int(preparedParams.limit); // Use neo4j.int()
      }
      if (
        preparedParams?.offset !== undefined &&
        typeof preparedParams.offset === "number"
      ) {
        preparedParams.offset = neo4j.int(preparedParams.offset); // Use neo4j.int()
      }
      if (
        preparedParams?.skip !== undefined &&
        typeof preparedParams.skip === "number"
      ) {
        preparedParams.skip = neo4j.int(preparedParams.skip); // Use neo4j.int() for SKIP too
      }
      // Convert Dates to Neo4j temporal types if necessary (or use ISO strings directly)
      // Example: if params contain a JS Date:
      // if (preparedParams && preparedParams.someDate instanceof Date) {
      //     preparedParams.someDate = neo4j.types.DateTime.fromStandardDate(preparedParams.someDate);
      // }

      const transactionWork = (tx: ManagedTransaction) =>
        tx.run(query, preparedParams);
      let result: QueryResult;
      result =
        mode === "WRITE"
          ? await session.executeWrite(transactionWork)
          : await session.executeRead(transactionWork);

      const duration = Date.now() - startTime;
      const mappedResults = result.records.map((record) =>
        this.mapRecordToObject<T>(record)
      );
      logger.debug(
        `Neo4j Query successful (${duration}ms). Returned ${mappedResults.length} records.`
      );
      return mappedResults;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      if (
        error.code === APOC_MISSING_ERROR_CODE ||
        error.message?.includes(APOC_MISSING_ERROR_FRAGMENT)
      ) {
        this.apocAvailable = false;
        logger.error(
          `Neo4j ${mode} error (${duration}ms) - APOC function likely missing: ${error.message}`
        );
        logger.error(
          " -> Ensure APOC Core plugin is installed and enabled in Neo4j."
        );
      } else {
        logger.error(
          `Neo4j ${mode} error (${duration}ms) executing query "${querySnippet}...":`,
          {
            message: error.message || String(error),
            code: error.code,
            query: querySnippet + "...",
            params: paramKeys,
          }
        );
      }
      return null; // Return null on error
    } finally {
      await this.safelyCloseSession(session);
    }
  }

  /** Stores extracted graph data */
  async storeGraphData(
    userId: string, // userId must be provided externally
    runId: string | null,
    memoryId: string,
    extractedInfo: ExtractedInfo
  ): Promise<boolean> {
    const timestamp = getCurrentISOTimestamp();
    const logPrefix = `Neo4j Store (Mem:${memoryId.substring(
      0,
      8
    )}, User:${userId.substring(0, 8)})`;
    const detectedLanguage =
      extractedInfo.detected_language ||
      extractedInfo.metadata?.detected_language ||
      null;

    const validEntities = (extractedInfo.entities || []).filter(
      (e) => e?.name && e.type
    );
    const validRelationships = (extractedInfo.relationships || []).filter(
      (r) => r?.subj && r.pred && r.obj
    );

    if (
      validEntities.length === 0 &&
      validRelationships.length === 0 &&
      !extractedInfo.summary
    ) {
      logger.info(
        `${logPrefix}: Skipped - No graphable entities, relationships, or summary.`
      );
      return true;
    }
    logger.info(
      `${logPrefix}: Storing - Entities: ${validEntities.length}, Rels: ${
        validRelationships.length
      }, Summary: ${!!extractedInfo.summary}, Lang: ${
        detectedLanguage || "N/A"
      }`
    );

    if (validRelationships.length > 0 && this.apocAvailable === false) {
      logger.error(
        `${logPrefix}: Cannot store relationships. APOC plugin required but not detected.`
      );
      // Decide if this should be a fatal error for the whole operation
      // return false; // Optionally fail if relationships are critical
    } else if (validRelationships.length > 0 && this.apocAvailable === null) {
      logger.warn(
        `${logPrefix}: APOC availability unknown, proceeding with relationship merge query. May fail.`
      );
    }

    let session: Session | null = null;
    try {
      session = this.getSession("WRITE");
      await session.executeWrite(async (tx) => {
        // 1. User Node
        await tx.run(
          `MERGE (u:User {user_id: $userId}) ON CREATE SET u.created_at = $ts, u.updated_at = $ts ON MATCH SET u.updated_at = $ts`,
          { userId, ts: timestamp }
        );
        // 2. Session Node (if runId provided)
        if (runId) {
          await tx.run(
            `MERGE (s:Session {run_id: $runId}) ON CREATE SET s.created_at = $ts WITH s MATCH (u:User {user_id: $userId}) MERGE (u)-[r:PARTICIPATED_IN]->(s) ON CREATE SET r.timestamp = $ts`,
            { runId, userId, ts: timestamp }
          );
        }
        // 3. Memory Node
        // Storing summary and language directly on the Memory node
        await tx.run(
          `MERGE (m:Memory {memory_id: $memoryId})
           ON CREATE SET m.created_at = $ts, m.updated_at = $ts, m.summary = $summary, m.language = $language
           ON MATCH SET m.updated_at = $ts, m.summary = $summary, m.language = $language
           WITH m
           MATCH (u:User {user_id: $userId})
           MERGE (m)-[r_user:ASSOCIATED_WITH_USER { updated_at: $ts }]->(u)
           ${
             runId
               ? `WITH m MATCH (s:Session {run_id: $runId}) MERGE (m)-[r_sess:DERIVED_FROM { updated_at: $ts }]->(s)`
               : ""
           }`,
          {
            memoryId,
            userId,
            runId,
            ts: timestamp,
            summary: extractedInfo.summary || null,
            language: detectedLanguage,
          }
        );
        // 4. Entities (Batch Unwind)
        if (validEntities.length > 0) {
          const entitiesParams = validEntities.map((e) => ({
            name: e.name,
            type: e.type,
            language: e.language || detectedLanguage || null,
          }));
          await tx.run(
            `UNWIND $entities as entityData
             MERGE (e:Entity {name: entityData.name, type: entityData.type})
             ON CREATE SET e.created_at = $ts, e.updated_at = $ts, e.language = entityData.language
             ON MATCH SET e.updated_at = $ts, e.language = CASE WHEN entityData.language IS NOT NULL THEN entityData.language ELSE e.language END
             WITH e, entityData
             MATCH (m:Memory {memory_id: $memoryId}) MERGE (m)-[r_mem:CONTAINS_ENTITY { updated_at: $ts }]->(e)
             WITH e, m, entityData
             MATCH (u:User {user_id: $userId})
             MERGE (u)-[r_user:MENTIONED]->(e)
             ON CREATE SET r_user.first_mentioned = $ts, r_user.last_mentioned = $ts, r_user.mention_count = 1, r_user.in_memory = [$memoryId]
             ON MATCH SET r_user.last_mentioned = $ts, r_user.mention_count = coalesce(r_user.mention_count, 0) + 1, r_user.in_memory = CASE WHEN $memoryId IN coalesce(r_user.in_memory, []) THEN r_user.in_memory ELSE coalesce(r_user.in_memory, []) + [$memoryId] END`,
            { entities: entitiesParams, memoryId, userId, ts: timestamp }
          );
          logger.debug(
            `${logPrefix}: Processed ${validEntities.length} entities.`
          );
        }
        // 5. Relationships (Batch with APOC if available)
        if (validRelationships.length > 0 && this.apocAvailable !== false) {
          const relationshipsData = validRelationships.map((rel) => {
            // Sanitize relationship type: uppercase, replace non-alphanumeric with _, collapse underscores, truncate
            const relType =
              rel.pred
                ?.toUpperCase()
                .replace(/[^A-Z0-9_]/g, "_")
                .replace(/_+/g, "_")
                .substring(0, 50) || "RELATED_TO";
            // Include source_memory_id and language in relationship properties
            const properties = {
              ...(rel.qualifiers || {}),
              source_memory_id: memoryId, // Add source memory ID
              language: rel.language || detectedLanguage || null, // Add language
              // created_at / updated_at handled by apoc.merge.relationship's ON MATCH SET
            };
            return {
              subj: rel.subj,
              obj: rel.obj,
              relType: relType,
              properties,
            };
          });

          if (relationshipsData.length > 0) {
            logger.debug(
              `${logPrefix}: Preparing to merge ${relationshipsData.length} relationships using APOC...`
            );
            // Use apoc.merge.relationship for safe upserting
            const apocResult = await tx.run(
              `UNWIND $relationships as relData
                CALL { WITH relData MATCH (u:User {user_id: relData.subj}) WHERE u IS NOT NULL RETURN u AS subjNode UNION ALL WITH relData MATCH (e:Entity {name: relData.subj}) WHERE e IS NOT NULL RETURN e AS subjNode }
                CALL { WITH relData MATCH (u:User {user_id: relData.obj}) WHERE u IS NOT NULL RETURN u AS objNode UNION ALL WITH relData MATCH (e:Entity {name: relData.obj}) WHERE e IS NOT NULL RETURN e AS objNode }
                WITH subjNode, objNode, relData WHERE subjNode IS NOT NULL AND objNode IS NOT NULL
                // Use apoc.merge.relationship for safe upserting
                CALL apoc.merge.relationship(subjNode, relData.relType,
                    { updated_at: $ts }, // Properties checked for merge (identity)
                    relData.properties, // Properties set ON CREATE or ON MATCH
                    objNode) YIELD rel
                // Optionally set updated_at ON MATCH
                // SET rel.updated_at = $ts // Handled by properties passed to apoc.merge.relationship now
                RETURN count(rel) as mergedRels`,
              { relationships: relationshipsData, ts: timestamp } // Removed memoryId here as it's in properties
            );
            logger.debug(
              `${logPrefix}: UNWIND Relationships APOC completed. Summary:`,
              apocResult.summary.counters
            );
            logger.debug(
              `${logPrefix}: Processed ${relationshipsData.length} relationships via APOC.`
            );

            // Handle HAS_PREFERENCE separately for potential overwrite logic
            const preferenceRels = relationshipsData.filter(
              (rel) =>
                (rel.subj === userId || rel.subj === "User") &&
                ["LIKES", "DISLIKES", "PREFERS", "HATES"].includes(rel.relType)
            );
            if (preferenceRels.length > 0) {
              logger.debug(
                `${logPrefix}: Updating ${preferenceRels.length} preference relationships...`
              );
              // This query removes any *old* preference of any type between user and entity, then creates the new one.
              await tx.run(
                `UNWIND $preferences as prefData
                  MATCH (u:User {user_id: $userId}) MATCH (e:Entity {name: prefData.obj})
                  OPTIONAL MATCH (u)-[old_pref:HAS_PREFERENCE]->(e) DELETE old_pref
                  CREATE (u)-[p:HAS_PREFERENCE {type: prefData.relType, created_at: $ts, updated_at: $ts, source_memory_id: $memoryId}]->(e)`,
                { preferences: preferenceRels, userId, memoryId, ts: timestamp }
              );
            }
          }
        } else if (
          validRelationships.length > 0 &&
          this.apocAvailable === false
        ) {
          logger.warn(
            `${logPrefix}: Skipped relationship storage due to missing APOC plugin.`
          );
        }
        logger.debug(`${logPrefix}: Neo4j transaction commit starting...`);
      });
      logger.info(`${logPrefix}: Neo4j data storage completed.`);
      return true;
    } catch (error: any) {
      if (
        error.code === APOC_MISSING_ERROR_CODE ||
        error.message?.includes(APOC_MISSING_ERROR_FRAGMENT)
      ) {
        this.apocAvailable = false; // Mark APOC as definitively unavailable
        logger.error(
          `${logPrefix}: Neo4j transaction failed - APOC function likely missing: ${error.message}`
        );
      } else {
        logger.error(
          `${logPrefix}: Neo4j transaction failed:`,
          error.message || error,
          { code: error.code }
        );
      }
      return false;
    } finally {
      await this.safelyCloseSession(session);
    }
  }

  /** Enhanced graph search */
  async searchGraph(
    userId: string, // userId must be provided externally
    queryEntities: string[],
    pagination: PaginationParams
  ): Promise<PaginatedResults<GraphSearchResult>> {
    const defaultResult: PaginatedResults<GraphSearchResult> = {
      results: [],
      limit: pagination.limit,
      offset: pagination.offset,
      total_estimated: 0,
    };
    if (
      !userId ||
      !Array.isArray(queryEntities) ||
      queryEntities.length === 0
    ) {
      logger.warn(
        `[Neo4j SearchGraph] Invalid input: userId='${userId?.substring(
          0,
          8
        )}', entities=${JSON.stringify(queryEntities)}`
      );
      return defaultResult;
    }
    const userLogId = userId.substring(0, 8);
    const entitiesLog = queryEntities.join(", ").substring(0, 50);
    logger.info(
      `Neo4j Graph Search: User=${userLogId}..., Entities=[${entitiesLog}...], Offset=${pagination.offset}, Limit=${pagination.limit}`
    );

    // Optimized query using OPTIONAL MATCH and scoring based on path patterns
    const query = `
        MATCH (u:User {user_id: $userId})
        // Find memories containing ANY of the query entities
        MATCH (u)<-[:ASSOCIATED_WITH_USER]-(m:Memory)-[:CONTAINS_ENTITY]->(e_query:Entity)
        WHERE e_query.name IN $queryEntities
        WITH u, m, COLLECT(DISTINCT e_query) AS matchedEntitiesInMem

        // Calculate initial relevance based on number of matched entities in the memory
        WITH u, m, matchedEntitiesInMem,
             toFloat(size(matchedEntitiesInMem)) / toFloat(size($queryEntities)) AS directMatchScore // Ratio of query entities found in this memory

        // Optional: Boost score if memory contains related entities (1 hop)
        OPTIONAL MATCH (m)-[:CONTAINS_ENTITY]->(e_related:Entity)
        WHERE NOT e_related IN matchedEntitiesInMem
        WITH u, m, matchedEntitiesInMem, directMatchScore, count(DISTINCT e_related) AS relatedEntityCount

        // Optional: Boost score based on user preferences linked to matched entities
        OPTIONAL MATCH (u)-[pref:HAS_PREFERENCE]->(e_pref:Entity)
        WHERE e_pref IN matchedEntitiesInMem
        WITH u, m, matchedEntitiesInMem, directMatchScore, relatedEntityCount,
             CASE WHEN pref IS NOT NULL THEN 0.2 ELSE 0 END AS preferenceBoost // Simple boost if any preference exists

        // Optional: Boost score for recency (adjust decay factor as needed)
        WITH u, m, matchedEntitiesInMem, directMatchScore, relatedEntityCount, preferenceBoost,
             duration.between(datetime(m.updated_at), datetime()).seconds AS secondsAgo
        // Decay factor: e.g., half-life of 1 week (604800 seconds)
        WITH u, m, matchedEntitiesInMem, directMatchScore, relatedEntityCount, preferenceBoost,
             exp(-toFloat(secondsAgo) / (604800.0 * 1.44)) AS recencyBoost // More gradual decay

        // Calculate final score
        WITH m,
             (directMatchScore * 1.0) +                  // Weight direct matches highly
             (coalesce(relatedEntityCount, 0) * 0.1) +  // Small boost for related context
             preferenceBoost +                           // Boost for preferences
             (recencyBoost * 0.3) AS relevanceScore     // Weight recency
        ORDER BY relevanceScore DESC, m.updated_at DESC // Primary sort by score, secondary by recency

        // Pagination
        SKIP $offset LIMIT $limit

        RETURN m.memory_id AS memory_id,
               relevanceScore AS score,
               m.updated_at AS latestUpdate // Return for potential secondary sorting if needed
        `;

    const params = {
      userId,
      queryEntities,
      offset: neo4j.int(pagination.offset), // Use neo4j.int()
      limit: neo4j.int(pagination.limit), // Use neo4j.int()
    };
    logger.debug(
      `[Neo4j SearchGraph] Params prepared - Offset: ${params.offset}, Limit: ${params.limit}`
    );

    const results = await this.runQuery<GraphSearchResult>(
      "READ",
      query,
      params
    );
    logger.info(
      `Neo4j Graph search returned ${
        results?.length ?? 0
      } results for page (User: ${userLogId}).`
    );

    // Note: A separate count query would be needed for accurate total_estimated.
    // This example omits it for simplicity as the primary query handles relevance ranking.
    return {
      results: results || [],
      limit: pagination.limit,
      offset: pagination.offset,
      total_estimated: undefined, // Indicate total is not calculated by this query
    };
  }

  /** Fetches latest graph info */
  async getLatestGraphInfo(
    userId: string, // userId must be provided externally
    subject: string,
    predicate: string
  ): Promise<LatestGraphInfo | null> {
    const logPrefix = `Neo4j GetLatest (User:${userId.substring(
      0,
      8
    )}, Subj:${subject}, Pred:${predicate})`;
    logger.debug(`${logPrefix}: Querying graph...`);
    const preferencePredicates = ["LIKES", "DISLIKES", "PREFERS", "HATES"];
    let query: string;
    let params: Record<string, any>;

    // Use parameter for subject name/ID
    const subjectMatchClause =
      subject.toLowerCase() === "user" || subject === userId
        ? `(subj:User {user_id: $userId})`
        : `(subj:Entity {name: $subjectName})`;

    const subjectNameParam =
      subject.toLowerCase() === "user" || subject === userId ? null : subject;

    if (preferencePredicates.includes(predicate.toUpperCase())) {
      query = `
        MATCH ${subjectMatchClause}
        MATCH (subj)-[r:HAS_PREFERENCE]->(obj:Entity)
        WHERE r.type = $predicate AND r.updated_at IS NOT NULL
        WITH r, obj ORDER BY r.updated_at DESC LIMIT 1
        RETURN $subjectInput AS subject, // Return the original input subject string
               r.type AS predicate,
               obj.name AS object,
               toString(datetime(r.updated_at)) AS timestamp, // Convert to ISO string
               r.source_memory_id AS source_memory_id
        LIMIT 1
      `;
      params = {
        userId,
        subjectName: subjectNameParam,
        predicate: predicate.toUpperCase(),
        subjectInput: subject,
      };
    } else {
      // Sanitize predicate to form a valid relationship type
      const relType = predicate
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .substring(0, 50);
      if (!relType) {
        // Handle case where predicate becomes empty after sanitization
        logger.warn(
          `${logPrefix}: Invalid predicate after sanitization: '${predicate}'`
        );
        return null;
      }
      logger.debug(
        `${logPrefix}: Searching for generic relationship type: [:${relType}]`
      );
      query = `
         MATCH ${subjectMatchClause}
         MATCH (subj)-[r:${relType}]->(obj) // Use sanitized relType directly in the query
         WHERE r.updated_at IS NOT NULL
         WITH r, obj ORDER BY r.updated_at DESC LIMIT 1
         RETURN $subjectInput AS subject, // Return original input subject
                type(r) AS predicate,
                // Get name for Entity nodes, user_id for User nodes, or fallback to string
                CASE WHEN obj:Entity THEN obj.name WHEN obj:User THEN obj.user_id ELSE toString(obj) END AS object,
                toString(datetime(r.updated_at)) AS timestamp, // Convert to ISO string
                r.source_memory_id AS source_memory_id
         LIMIT 1
       `;
      params = { userId, subjectName: subjectNameParam, subjectInput: subject }; // Only pass needed params
    }

    const results = await this.runQuery<LatestGraphInfo>("READ", query, params);
    if (results && results.length > 0) {
      logger.debug(
        `${logPrefix}: Latest graph info found: Mem=${results[0].source_memory_id?.substring(
          0,
          8
        )} @${results[0].timestamp}`
      );
      return results[0];
    } else {
      logger.debug(
        `${logPrefix}: No latest graph info found matching pattern.`
      );
      return null;
    }
  }

  /** Deletes a memory node and its relationships */
  async deleteMemoryNodes(memoryId: string): Promise<boolean> {
    if (!memoryId) {
      logger.warn("Neo4j DeleteMemoryNode: memoryId is required.");
      return false;
    }
    logger.info(
      `Neo4j Deleting node and relationships for memory: ${memoryId.substring(
        0,
        8
      )}`
    );
    const query = `MATCH (m:Memory {memory_id: $memoryId}) DETACH DELETE m`;
    const result = await this.runQuery<{ count: number }>("WRITE", query, {
      memoryId,
    }); // Expecting no return, but check success
    const success = result !== null; // runQuery returns null on error
    if (success)
      logger.info(
        `Neo4j delete execution successful for memory ${memoryId.substring(
          0,
          8
        )}.`
      );
    else
      logger.error(
        `Neo4j delete execution failed for memory ${memoryId.substring(0, 8)}.`
      );
    return success;
  }

  /** Deletes a user node and ALL their associated data (memories, relationships, sessions) */
  async deleteUserNodesAndRelationships(userId: string): Promise<boolean> {
    // userId must be provided externally
    if (!userId) {
      logger.warn("Neo4j DeleteUser: userId is required.");
      return false;
    }
    const userLogId = userId.substring(0, 8);
    logger.warn(
      `Neo4j Deleting ALL graph data for user ${userLogId}... IRREVERSIBLE.`
    );
    let session: Session | null = null;
    let success = true;
    try {
      session = this.getSession("WRITE");
      await session.executeWrite(async (tx) => {
        logger.debug(
          `Neo4j Delete (${userLogId}): Deleting associated memories & their relationships...`
        );
        // Delete memories associated with the user, detaching them first
        // Loop to handle potentially large numbers of memories without exceeding memory limits
        let deletedMemories = 0;
        let batchCount = 0;
        const batchLimit = 10000; // Process in batches
        do {
          const memResult = await tx.run(
            `MATCH (u:User {user_id: $userId})<-[:ASSOCIATED_WITH_USER]-(m:Memory)
                 WITH m LIMIT $batchLimit
                 DETACH DELETE m
                 RETURN count(m) as deletedCount`,
            { userId, batchLimit: neo4j.int(batchLimit) } // Pass limit as Neo4j Integer
          );
          deletedMemories =
            memResult.records[0]?.get("deletedCount")?.toNumber() ?? 0;
          batchCount += deletedMemories;
          if (deletedMemories > 0)
            logger.debug(
              `Neo4j Delete (${userLogId}): Deleted batch of ${deletedMemories} memories (Total: ${batchCount}).`
            );
        } while (deletedMemories >= batchLimit); // Continue if we deleted the full batch size

        logger.debug(
          `Neo4j Delete (${userLogId}): Deleting orphaned sessions linked ONLY to this user...`
        );
        // Delete session nodes that are ONLY linked to this user
        await tx.run(
          `MATCH (u:User {user_id: $userId})-[:PARTICIPATED_IN]->(s:Session)
           WHERE size([(otherUser:User)-[:PARTICIPATED_IN]->(s) | otherUser]) = 1
           DETACH DELETE s`,
          { userId }
        );

        logger.debug(
          `Neo4j Delete (${userLogId}): Deleting user node and remaining relationships...`
        );
        // Finally, delete the user node itself (relationships should be gone due to DETACH)
        await tx.run(`MATCH (u:User {user_id: $userId}) DETACH DELETE u`, {
          userId,
        });
      });
      logger.info(`Neo4j delete transaction successful for user ${userLogId}.`);
    } catch (error: any) {
      logger.error(
        `Neo4j delete transaction failed for user ${userLogId}:`,
        error.message || error,
        { code: error.code }
      );
      success = false;
    } finally {
      await this.safelyCloseSession(session);
    }
    return success;
  }

  /** Closes the driver */
  async close(): Promise<void> {
    logger.info("Closing Neo4j Driver...");
    try {
      await this.driver.close();
      logger.info("Neo4j Driver Closed successfully.");
    } catch (e: any) {
      logger.error("Error closing Neo4j driver:", e.message);
    }
  }
}
