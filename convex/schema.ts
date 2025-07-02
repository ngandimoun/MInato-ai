import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Live game sessions for real-time multiplayer gameplay
  live_games: defineTable({
    // Game identification
    supabase_session_id: v.string(), // Links to Supabase game_sessions_history table
    game_type: v.string(), // e.g., "history_trivia", "word_puzzle", etc.
    host_user_id: v.string(),
    
    // Game configuration
    difficulty: v.union(
      v.literal("beginner"),
      v.literal("easy"), 
      v.literal("medium"),
      v.literal("hard"),
      v.literal("expert")
    ),
    max_players: v.number(),
    rounds: v.number(),
    mode: v.union(v.literal("solo"), v.literal("multiplayer")),
    
    // Game state
    status: v.union(
      v.literal("lobby"),
      v.literal("in_progress"), 
      v.literal("finished"),
      v.literal("cancelled")
    ),
    current_round: v.number(),
    current_question_index: v.optional(v.number()),
    
    // Players
    players: v.array(v.object({
      user_id: v.string(),
      username: v.string(),
      avatar_url: v.optional(v.string()),
      score: v.number(),
      joined_at: v.number(), // timestamp
      is_ready: v.boolean(),
    })),
    
    // Game content (questions, answers, etc.)
    questions: v.optional(v.array(v.object({
      question: v.string(),
      options: v.array(v.string()),
      correct_answer: v.number(), // index of correct option
      explanation: v.optional(v.string()),
      difficulty: v.string(),
      category: v.optional(v.string()),
    }))),
    
    // Current game state
    current_question: v.optional(v.object({
      question: v.string(),
      options: v.array(v.string()),
      time_limit: v.number(), // seconds
      started_at: v.number(), // timestamp
    })),
    
    // Player answers for current question
    current_answers: v.optional(v.array(v.object({
      user_id: v.string(),
      answer_index: v.number(),
      answered_at: v.number(), // timestamp
      time_taken: v.number(), // milliseconds
    }))),
    
    // Game results
    final_scores: v.optional(v.array(v.object({
      user_id: v.string(),
      score: v.number(),
      correct_answers: v.number(),
      rank: v.number(),
    }))),
    
    // Metadata
    created_at: v.number(),
    updated_at: v.number(),
    started_at: v.optional(v.number()),
    finished_at: v.optional(v.number()),
    
    // Game-specific settings
    settings: v.optional(v.object({
      auto_advance: v.boolean(),
      show_explanations: v.boolean(),
      time_per_question: v.number(),
      category: v.optional(v.string()),
      language: v.optional(v.string()),
      ai_personality: v.optional(v.string()),
      topic_focus: v.optional(v.string()),
    })),
  })
    .index("by_host", ["host_user_id"])
    .index("by_status", ["status"])
    .index("by_supabase_session", ["supabase_session_id"])
    .index("by_game_type", ["game_type"]),

  // Game invitations
  game_invitations: defineTable({
    game_id: v.id("live_games"),
    host_user_id: v.string(),
    invited_user_id: v.string(),
    invited_username: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired")
    ),
    created_at: v.number(),
    responded_at: v.optional(v.number()),
    expires_at: v.number(), // Auto-expire invitations after some time
  })
    .index("by_invited_user", ["invited_user_id"])
    .index("by_host", ["host_user_id"])
    .index("by_game", ["game_id"])
    .index("by_status", ["status"]),

  // Tournament state machine - Phase 4
  tournaments: defineTable({
    tournament_id: v.string(),
    status: v.union(
      v.literal("registration"),
      v.literal("bracket_generated"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    current_round: v.number(),
    total_rounds: v.number(),
    
    // Participants array
    participants: v.array(v.object({
      user_id: v.string(),
      username: v.string(),
      avatar_url: v.optional(v.string()),
      seed: v.number(),
      status: v.union(
        v.literal("registered"),
        v.literal("active"),
        v.literal("eliminated"),
        v.literal("winner")
      ),
      current_match_id: v.optional(v.string()),
      total_score: v.number(),
      matches_won: v.number(),
      matches_lost: v.number(),
    })),
    
    // Tournament bracket
    bracket: v.array(v.object({
      match_id: v.string(),
      round: v.number(),
      player1_id: v.string(),
      player2_id: v.optional(v.string()), // null for byes
      winner_id: v.optional(v.string()),
      game_session_id: v.optional(v.id("live_games")),
      status: v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("bye")
      ),
      scheduled_at: v.number(),
      started_at: v.optional(v.number()),
      completed_at: v.optional(v.number()),
      scores: v.object({
        player1_score: v.number(),
        player2_score: v.number(),
      }),
    })),
    
    // Timestamps
    started_at: v.optional(v.number()),
    current_round_started_at: v.optional(v.number()),
    
    // Tournament settings
    settings: v.object({
      max_participants: v.number(),
      entry_fee: v.number(),
      prize_pool: v.number(),
      game_type: v.string(),
      difficulty: v.string(),
      rounds_per_match: v.number(),
      time_per_round: v.number(),
      auto_advance: v.boolean(),
    }),
  })
    .index("by_tournament_id", ["tournament_id"])
    .index("by_status", ["status"]),
}); 