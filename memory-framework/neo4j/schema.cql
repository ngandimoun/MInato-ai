  // memory-framework/neo4j/schema.cql
// Cypher script to set up constraints and indexes for the CompanionCoreMemory Neo4j graph.

// --- Constraints (Ensure Uniqueness) ---
// These help maintain data integrity and improve lookup performance for unique identifiers.

// User nodes must have a unique user_id
CREATE CONSTRAINT constraint_user_unique_id IF NOT EXISTS
FOR (u:User) REQUIRE u.user_id IS UNIQUE;

// Memory nodes must have a unique memory_id
CREATE CONSTRAINT constraint_memory_unique_id IF NOT EXISTS
FOR (m:Memory) REQUIRE m.memory_id IS UNIQUE;

// Session nodes must have a unique run_id (if using sessions)
CREATE CONSTRAINT constraint_session_unique_run_id IF NOT EXISTS
FOR (s:Session) REQUIRE s.run_id IS UNIQUE;

// Optional: Entities could be unique based on name AND type
// CREATE CONSTRAINT constraint_entity_unique_name_type IF NOT EXISTS
// FOR (e:Entity) REQUIRE (e.name, e.type) IS UNIQUE;
// Note: Decide if entities like "Paris" (LOCATION) should be the same node across all users.
// If entities are user-specific, don't add this constraint. If global, add it.
// Current Neo4jService MERGE implies global entities based on name/type.

// --- Indexes (Improve Query Performance) ---

// Index for fast User lookups by user_id (covered by constraint, but explicit index is good practice)
CREATE INDEX index_user_user_id IF NOT EXISTS
FOR (u:User) ON (u.user_id);

// Index for fast Memory lookups by memory_id (covered by constraint)
CREATE INDEX index_memory_memory_id IF NOT EXISTS
FOR (m:Memory) ON (m.memory_id);

// Index for fast Session lookups by run_id (covered by constraint)
CREATE INDEX index_session_run_id IF NOT EXISTS
FOR (s:Session) ON (s.run_id);

// Index Memory timestamps for sorting/filtering
CREATE INDEX index_memory_created_at IF NOT EXISTS
FOR (m:Memory) ON (m.created_at);
CREATE INDEX index_memory_updated_at IF NOT EXISTS
FOR (m:Memory) ON (m.updated_at);

// Index Memory language for filtering
CREATE INDEX index_memory_language IF NOT EXISTS
FOR (m:Memory) ON (m.language);

// Index Entity properties for lookups and filtering
CREATE INDEX index_entity_name IF NOT EXISTS
FOR (e:Entity) ON (e.name);
CREATE INDEX index_entity_type IF NOT EXISTS
FOR (e:Entity) ON (e.type);
CREATE INDEX index_entity_language IF NOT EXISTS
FOR (e:Entity) ON (e.language);

// Optional: Index relationship properties if frequently queried/sorted on
// Example: Indexing the 'updated_at' property on HAS_PREFERENCE relationships
// CREATE INDEX index_rel_has_preference_updated_at IF NOT EXISTS
// FOR ()-[r:HAS_PREFERENCE]-() ON (r.updated_at);
// Example: Indexing the 'updated_at' property on MENTIONED relationships
// CREATE INDEX index_rel_mentioned_last_mentioned IF NOT EXISTS
// FOR ()-[r:MENTIONED]-() ON (r.last_mentioned);


// --- Fulltext Indexes (Optional - If doing complex text search within Neo4j) ---
// Note: The current implementation uses Supabase for FTS. This is here for reference if you shift that logic.
/*
// Example: Create a fulltext index on Memory content and summary
CREATE FULLTEXT INDEX index_memory_content_summary IF NOT EXISTS
FOR (m:Memory) ON EACH [m.content, m.summary]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'standard', // Or 'whitespace', 'english', etc.
    `fulltext.eventually_consistent`: true
  }
};
