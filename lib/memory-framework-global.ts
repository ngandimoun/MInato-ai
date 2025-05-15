import { CompanionCoreMemory } from "@/memory-framework/core/CompanionCoreMemory";
import { logger } from "@/memory-framework/config";

let globalMemoryFrameworkInstance: CompanionCoreMemory | null = null;

export function getGlobalMemoryFramework(): CompanionCoreMemory {
  if (!globalMemoryFrameworkInstance) {
    logger.info("[Global Memory] Initializing CompanionCoreMemory instance...");
    try {
      // Log the initialization steps for debugging
      logger.debug("[Global Memory] Creating new CompanionCoreMemory...");
      globalMemoryFrameworkInstance = new CompanionCoreMemory();
      
      // Set global instance for legacy code
      logger.debug("[Global Memory] Setting global.memoryFrameworkInstance for legacy code...");
      (global as any).memoryFrameworkInstance = globalMemoryFrameworkInstance;
      
      logger.info("[Global Memory] Successfully initialized CompanionCoreMemory instance");
    } catch (memError: any) {
      logger.error("[Global Memory] FATAL - Failed to initialize CompanionCoreMemory:", memError.message, memError.stack);
      throw new Error(`Memory Framework initialization failed: ${memError.message}`);
    }
  } else {
    logger.debug("[Global Memory] Reusing existing CompanionCoreMemory instance");
  }
  return globalMemoryFrameworkInstance;
} 