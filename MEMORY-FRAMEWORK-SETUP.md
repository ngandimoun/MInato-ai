# Memory Framework Debugging and Setup Guide

## Issues Fixed in This Session

1. **Schema Error in Workflow Engine**
   - Fixed the `extracted_params` schema by adding an empty `required` array to satisfy OpenAI schema validation

2. **Memory Framework Initialization**
   - Added early initialization in middleware to ensure memory framework is available to all API endpoints
   - Added detailed logging to trace initialization process

3. **API Endpoints**
   - Updated notifications API to better handle memory framework errors
   - Added proper error handling in memory-related API endpoints

## Testing the Memory Framework

### Test Script (testing-memory.js)

Run this script to test basic memory operations:

```bash
node testing-memory.js
```

The script tests:
- Framework initialization
- Adding a memory
- Searching for memories

### API Testing

Use these API endpoints to test your memory framework:

1. **Notifications API**:
   ```
   GET /api/notifications/subscribe
   ```
   This will trigger memory framework initialization and attempt to fetch reminders.

2. **Memory Search API**:
   ```
   POST /api/memory/search
   ```
   Request body:
   ```json
   {
     "query": "test memory",
     "limit": 10
   }
   ```

3. **Memory Delete API**:
   ```
   DELETE /api/memory/delete
   ```
   Request body:
   ```json
   {
     "memoryId": "[id from search results]"
   }
   ```

## Debugging Tips

### Check Supabase Tables

Memories should be stored in:
- `memories` table - For vector data
- Neo4j - For graph relationships

### Check Logs for These Messages

Successful initialization:
```
[Global Memory] Successfully initialized CompanionCoreMemory instance
[Middleware] Global memory framework initialized successfully
```

Successful memory operations:
```
ADD_MEMORY (User: [userId]) Finished. Vector Store Success: true, Graph Store Success: true
Successfully inserted 1 memory units into 'memories'
```

### Common Error Messages

If you see these errors, the memory framework initialization might be failing:
```
[API Notifications GET] Memory framework not initialized yet
Memory Framework initialization failed
```

## Fixing OpenAI API Errors

The workflow engine errors like "Invalid schema for response_format" are fixed by updating the schema in:
```
lib/core/workflow-engine.ts
```

Audio processing errors like "There was an issue with your request" are likely due to incompatible OpenAI model parameters or rate limiting.

## System Architecture

The memory framework follows this initialization flow:
1. Middleware initializes global instance at server startup
2. The global instance is accessed via `getGlobalMemoryFramework()`
3. API endpoints use this global instance for memory operations

This ensures a single instance is shared across all API endpoints. 