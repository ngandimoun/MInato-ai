import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const crons = cronJobs();

// Daily quest generation - runs at midnight UTC
crons.daily(
  "generate daily quests",
  { hourUTC: 0, minuteUTC: 0 },
  internal.questScheduler.generateDailyQuestsForActiveUsers
);

// Weekly leaderboard refresh - runs every Sunday at 1 AM UTC
crons.weekly(
  "refresh leaderboards",
  { dayOfWeek: "sunday", hourUTC: 1, minuteUTC: 0 },
  internal.questScheduler.refreshLeaderboards
);

// Hourly quest progress check - ensures quest progress is up to date
crons.hourly(
  "sync quest progress",
  { minuteUTC: 30 },
  internal.questScheduler.syncQuestProgress
);

// ============================================================================
// QUEST SCHEDULER ACTIONS
// ============================================================================

export const generateDailyQuestsForActiveUsers = action({
  args: {},
  handler: async (ctx) => {
    console.log("[Quest Scheduler] Starting daily quest generation...");
    
    try {
      // Call Next.js API to generate quests for all active users
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/quests/daily/generate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Quest generation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[Quest Scheduler] Generated quests for ${result.users_processed} users`);
      
      return {
        success: true,
        users_processed: result.users_processed,
        quests_created: result.quests_created,
      };

    } catch (error) {
      console.error("[Quest Scheduler] Error generating daily quests:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

export const refreshLeaderboards = action({
  args: {},
  handler: async (ctx) => {
    console.log("[Quest Scheduler] Refreshing leaderboards...");
    
    try {
      // Call Next.js API to refresh materialized views
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/leaderboards/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Leaderboard refresh failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("[Quest Scheduler] Leaderboards refreshed successfully");
      
      return {
        success: true,
        refreshed_at: new Date().toISOString(),
      };

    } catch (error) {
      console.error("[Quest Scheduler] Error refreshing leaderboards:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

export const syncQuestProgress = action({
  args: {},
  handler: async (ctx) => {
    console.log("[Quest Scheduler] Syncing quest progress...");
    
    try {
      // Call Next.js API to sync quest progress
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/quests/sync-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Quest sync failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[Quest Scheduler] Synced progress for ${result.quests_updated} quests`);
      
      return {
        success: true,
        quests_updated: result.quests_updated,
      };

    } catch (error) {
      console.error("[Quest Scheduler] Error syncing quest progress:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

export default crons; 