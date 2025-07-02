import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Type definitions for better type safety
type PlayerType = {
  user_id: string;
  username: string;
  avatar_url?: string;
  score: number;
  joined_at: number;
  is_ready: boolean;
};

type QuestionType = {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  category?: string;
};

type CurrentQuestionType = {
  question: string;
  options: string[];
  time_limit: number;
  started_at: number;
};

// ============================================================================
// GAME MUTATIONS - Real-time game state management
// ============================================================================

export const createGame = mutation({
  args: {
    supabase_session_id: v.string(),
    game_type: v.string(),
    host_user_id: v.string(),
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
    settings: v.optional(v.object({
      auto_advance: v.boolean(),
      show_explanations: v.boolean(),
      time_per_question: v.number(),
      category: v.optional(v.string()),
      language: v.optional(v.string()),
      ai_personality: v.optional(v.string()),
      topic_focus: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const gameId = await ctx.db.insert("live_games", {
      supabase_session_id: args.supabase_session_id,
      game_type: args.game_type,
      host_user_id: args.host_user_id,
      difficulty: args.difficulty,
      max_players: args.max_players,
      rounds: args.rounds,
      mode: args.mode,
      status: "lobby",
      current_round: 0,
      players: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      settings: args.settings || {
        auto_advance: true,
        show_explanations: true,
        time_per_question: 30,
        language: "en",
        ai_personality: "friendly",
        topic_focus: "general",
      },
    });
    
    return gameId;
  },
});

export const joinGame = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
    username: v.string(),
    avatar_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) throw new Error("Game not found");
    
    if (game.status !== "lobby") {
      throw new Error("Cannot join game in progress");
    }
    
    if (game.players.length >= game.max_players) {
      throw new Error("Game is full");
    }
    
    // Check if player already in game
    const existingPlayer = game.players.find((p: PlayerType) => p.user_id === args.user_id);
    if (existingPlayer) {
      return args.game_id; // Already in game
    }
    
    const updatedPlayers = [...game.players, {
      user_id: args.user_id,
      username: args.username,
      avatar_url: args.avatar_url,
      score: 0,
      joined_at: Date.now(),
      is_ready: false,
    }];
    
    await ctx.db.patch(args.game_id, {
      players: updatedPlayers,
      updated_at: Date.now(),
    });
    
    return args.game_id;
  },
});

export const leaveGame = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) throw new Error("Game not found");
    
    const updatedPlayers = game.players.filter((p: PlayerType) => p.user_id !== args.user_id);
    
    // If host leaves, cancel game or transfer to another player
    if (game.host_user_id === args.user_id) {
      if (updatedPlayers.length > 0) {
        // Transfer host to first remaining player
        await ctx.db.patch(args.game_id, {
          host_user_id: updatedPlayers[0].user_id,
          players: updatedPlayers,
          updated_at: Date.now(),
        });
      } else {
        // Cancel game if no players left
        await ctx.db.patch(args.game_id, {
          status: "cancelled",
          updated_at: Date.now(),
        });
      }
    } else {
      await ctx.db.patch(args.game_id, {
        players: updatedPlayers,
        updated_at: Date.now(),
      });
    }
    
    return args.game_id;
  },
});

export const setPlayerReady = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
    is_ready: v.boolean(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) throw new Error("Game not found");
    
    const updatedPlayers = game.players.map((player: PlayerType) =>
      player.user_id === args.user_id
        ? { ...player, is_ready: args.is_ready }
        : player
    );
    
    await ctx.db.patch(args.game_id, {
      players: updatedPlayers,
      updated_at: Date.now(),
    });
    
    return args.game_id;
  },
});

export const startGame = mutation({
  args: {
    game_id: v.id("live_games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) throw new Error("Game not found");
    
    if (game.status !== "lobby") {
      throw new Error("Game already started");
    }
    
    // For solo games, start immediately
    // For multiplayer games, check if there's at least one player
    if (game.mode === "multiplayer" && game.players.length === 0) {
      throw new Error("Need at least one player to start");
    }
    
    await ctx.db.patch(args.game_id, {
      status: "in_progress",
      current_round: 1,
      current_question_index: 0,
      started_at: Date.now(),
      updated_at: Date.now(),
    });
    
    return args.game_id;
  },
});

export const submitAnswer = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
    answer_index: v.number(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) throw new Error("Game not found");
    
    if (game.status !== "in_progress") {
      throw new Error("Game not in progress");
    }
    
    if (!game.current_question) {
      throw new Error("No active question");
    }
    
    const currentAnswers = game.current_answers || [];
    
    // Check if user already answered
    const existingAnswer = currentAnswers.find((a: any) => a.user_id === args.user_id);
    if (existingAnswer) {
      throw new Error("Already answered this question");
    }
    
    const answerTime = Date.now();
    const timeTaken = answerTime - game.current_question.started_at;
    
    const newAnswer = {
      user_id: args.user_id,
      answer_index: args.answer_index,
      answered_at: answerTime,
      time_taken: timeTaken,
    };
    
    const updatedAnswers = [...currentAnswers, newAnswer];
    
    await ctx.db.patch(args.game_id, {
      current_answers: updatedAnswers,
      updated_at: Date.now(),
    });
    
    return args.game_id;
  },
});

export const nextQuestion = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) throw new Error("Game not found");
    
    if (game.host_user_id !== args.user_id) {
      throw new Error("Only host can advance questions");
    }
    
    if (!game.questions || game.current_question_index === undefined) {
      throw new Error("Game not properly initialized");
    }
    
    const nextIndex = (game.current_question_index || 0) + 1;
    
    if (nextIndex >= game.questions.length) {
      // End of round/game
      await ctx.db.patch(args.game_id, {
        status: "finished",
        finished_at: Date.now(),
        updated_at: Date.now(),
      });
      return args.game_id;
    }
    
    const nextQuestion = game.questions[nextIndex];
    
    await ctx.db.patch(args.game_id, {
      current_question_index: nextIndex,
      current_question: {
        question: nextQuestion.question,
        options: nextQuestion.options,
        time_limit: game.settings?.time_per_question || 30,
        started_at: Date.now(),
      },
      current_answers: [], // Reset answers for new question
      updated_at: Date.now(),
    });
    
    return args.game_id;
  },
});

// New mutations needed by the orchestrator
export const updateGameQuestions = mutation({
  args: {
    game_id: v.id("live_games"),
    questions: v.array(v.object({
      question: v.string(),
      options: v.array(v.string()),
      correct_answer: v.number(),
      explanation: v.string(),
      difficulty: v.string(),
      category: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.game_id, {
      questions: args.questions,
      updated_at: Date.now(),
    });
    return args.game_id;
  },
});

export const setCurrentQuestion = mutation({
  args: {
    game_id: v.id("live_games"),
    question: v.object({
      question: v.string(),
      options: v.array(v.string()),
      time_limit: v.number(),
      started_at: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.game_id, {
      current_question: args.question,
      current_answers: [], // Reset answers for new question
      updated_at: Date.now(),
    });
    return args.game_id;
  },
});

export const updatePlayerScores = mutation({
  args: {
    game_id: v.id("live_games"),
    players: v.array(v.object({
      user_id: v.string(),
      username: v.string(),
      avatar_url: v.optional(v.string()),
      score: v.number(),
      joined_at: v.number(),
      is_ready: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.game_id, {
      players: args.players,
      updated_at: Date.now(),
    });
    return args.game_id;
  },
});

// ============================================================================
// GAME QUERIES - Real-time subscriptions
// ============================================================================

export const getGame = query({
  args: { game_id: v.id("live_games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.game_id);
  },
});

export const getActiveGames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("live_games")
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "lobby"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .order("desc")
      .take(50); // Limit to 50 most recent active games
  },
});

export const getUserActiveGames = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    const games = await ctx.db
      .query("live_games")
      .filter((q) => 
        q.or(
          q.eq(q.field("host_user_id"), args.user_id),
          q.and(
            q.neq(q.field("status"), "finished"),
            q.neq(q.field("status"), "cancelled")
          )
        )
      )
      .collect();
    
    // Filter games where user is a player (since we can't easily query arrays)
    return games.filter(game => 
      game.host_user_id === args.user_id || 
      game.players.some((p: PlayerType) => p.user_id === args.user_id)
    );
  },
});

export const getGamesByStatus = query({
  args: { 
    status: v.union(
      v.literal("lobby"),
      v.literal("in_progress"),
      v.literal("finished"),
      v.literal("cancelled")
    ) 
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("live_games")
      .filter((q) => q.eq(q.field("status"), args.status))
      .collect();
  },
});

// ============================================================================
// INVITATION SYSTEM
// ============================================================================

export const createInvitation = mutation({
  args: {
    game_id: v.id("live_games"),
    host_user_id: v.string(),
    invited_user_id: v.string(),
    invited_username: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteId = await ctx.db.insert("game_invitations", {
      game_id: args.game_id,
      host_user_id: args.host_user_id,
      invited_user_id: args.invited_user_id,
      invited_username: args.invited_username,
      status: "pending",
      created_at: Date.now(),
      expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    });
    
    return inviteId;
  },
});

export const respondToInvitation = mutation({
  args: {
    invitation_id: v.id("game_invitations"),
    user_id: v.string(),
    response: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitation_id);
    if (!invitation) throw new Error("Invitation not found");
    
    if (invitation.invited_user_id !== args.user_id) {
      throw new Error("Not authorized to respond to this invitation");
    }
    
    if (invitation.status !== "pending") {
      throw new Error("Invitation already responded to");
    }
    
    await ctx.db.patch(args.invitation_id, {
      status: args.response,
      responded_at: Date.now(),
    });
    
    // If accepted, join the game
    if (args.response === "accepted") {
      const game = await ctx.db.get(invitation.game_id);
      if (game && game.status === "lobby") {
        await ctx.runMutation(api.games.joinGame, {
          game_id: invitation.game_id,
          user_id: args.user_id,
          username: invitation.invited_username,
        });
      }
    }
    
    return args.invitation_id;
  },
});

export const getUserInvitations = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("game_invitations")
      .filter((q) => 
        q.and(
          q.eq(q.field("invited_user_id"), args.user_id),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();
  },
});

// ============================================================================
// PHASE 2: CREATIVE GAMES & AI JUDGE MUTATIONS
// ============================================================================

export const updateJudgingResults = mutation({
  args: {
    game_id: v.id("live_games"),
    round_number: v.number(),
    judging_results: v.object({
      individual_scores: v.array(v.object({
        user_id: v.string(),
        username: v.string(),
        score: v.number(),
        explanation: v.string(),
      })),
      ranking: v.array(v.string()),
      overall_feedback: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new Error("Game not found");
    }

    // Update player scores based on AI judge results
    const updatedPlayers = game.players.map(player => {
      const scoreData = args.judging_results.individual_scores.find(s => s.user_id === player.user_id);
      if (scoreData) {
        const rankBonus = args.judging_results.ranking.indexOf(player.user_id) === 0 ? 50 : 
                         args.judging_results.ranking.indexOf(player.user_id) === 1 ? 30 : 
                         args.judging_results.ranking.indexOf(player.user_id) === 2 ? 10 : 0;
        
        return {
          ...player,
          score: player.score + (scoreData.score * 10) + rankBonus, // Score * 10 + rank bonus
        };
      }
      return player;
    });

    // Store judging results in game metadata
    const currentJudging = game.settings?.judging_history || [];
    currentJudging.push({
      round_number: args.round_number,
      results: args.judging_results,
      judged_at: Date.now(),
    });

    await ctx.db.patch(args.game_id, {
      players: updatedPlayers,
      updated_at: Date.now(),
      settings: {
        ...game.settings,
        judging_history: currentJudging,
      },
    });
  },
});

export const endRoundAutomatically = mutation({
  args: {
    game_id: v.id("live_games"),
    round_number: v.number(),
    auto_judge: v.boolean(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== "in_progress") {
      return; // Game already ended or not in progress
    }

    if (args.auto_judge) {
      // For creative games, trigger AI judging if submissions exist
      const submissions = game.settings?.current_submissions || [];
      if (submissions.length > 0) {
        // This would trigger the AI judge action
        console.log(`[Auto Judge] Round ${args.round_number} ended, ${submissions.length} submissions to judge`);
      }
    }

    // Advance to next round or end game
    const nextRound = game.current_round + 1;
    if (nextRound >= game.rounds) {
      // Game finished
      await ctx.db.patch(args.game_id, {
        status: "finished",
        finished_at: Date.now(),
        updated_at: Date.now(),
      });
    } else {
      // Next round
      await ctx.db.patch(args.game_id, {
        current_round: nextRound,
        current_question_index: 0,
        current_answers: [],
        updated_at: Date.now(),
        settings: {
          ...game.settings,
          current_submissions: [], // Clear submissions for new round
        },
      });
    }
  },
});

export const flagContent = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
    content: v.string(),
    moderation_categories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new Error("Game not found");
    }

    // Store moderation flags in game settings
    const currentFlags = game.settings?.moderation_flags || [];
    currentFlags.push({
      user_id: args.user_id,
      content: args.content,
      categories: args.moderation_categories,
      flagged_at: Date.now(),
    });

    await ctx.db.patch(args.game_id, {
      settings: {
        ...game.settings,
        moderation_flags: currentFlags,
      },
      updated_at: Date.now(),
    });
  },
});

// Submit creative content (haiku, story, etc.)
export const submitCreativeContent = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
    content: v.string(),
    round_number: v.number(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== "in_progress") {
      throw new Error("Game not in progress");
    }

    // Find the player
    const player = game.players.find(p => p.user_id === args.user_id);
    if (!player) {
      throw new Error("Player not found in game");
    }

    // Add submission to current submissions
    const currentSubmissions = game.settings?.current_submissions || [];
    const existingSubmissionIndex = currentSubmissions.findIndex(s => s.user_id === args.user_id);
    
    const submission = {
      user_id: args.user_id,
      username: player.username,
      content: args.content,
      submitted_at: Date.now(),
      round_number: args.round_number,
    };

    if (existingSubmissionIndex >= 0) {
      // Update existing submission
      currentSubmissions[existingSubmissionIndex] = submission;
    } else {
      // Add new submission
      currentSubmissions.push(submission);
    }

    await ctx.db.patch(args.game_id, {
      settings: {
        ...game.settings,
        current_submissions: currentSubmissions,
      },
      updated_at: Date.now(),
    });

    return { submitted: true, submission_count: currentSubmissions.length };
  },
});

// Team Mode: Update team assignments
export const updateTeamAssignments = mutation({
  args: {
    game_id: v.id("live_games"),
    teams: v.array(v.object({
      team_id: v.string(),
      team_name: v.string(),
      members: v.array(v.string()), // user_ids
      color: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.status !== "lobby") {
      throw new Error("Can only modify teams in lobby");
    }

    // Validate that all players are assigned to teams
    const allAssignedPlayers = args.teams.flatMap(team => team.members);
    const gamePlayerIds = game.players.map(p => p.user_id);
    
    if (allAssignedPlayers.length !== gamePlayerIds.length || 
        !gamePlayerIds.every(pid => allAssignedPlayers.includes(pid))) {
      throw new Error("All players must be assigned to teams");
    }

    await ctx.db.patch(args.game_id, {
      settings: {
        ...game.settings,
        teams: args.teams,
        team_mode: true,
      },
      updated_at: Date.now(),
    });

    return { teams_updated: true, team_count: args.teams.length };
  },
});

// ============================================================================
// PHASE 3: PERSISTENCE & REWARDS INTEGRATION
// ============================================================================

export const persistResults = action({
  args: {
    game_id: v.id("live_games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game || game.status !== "finished") {
      throw new Error("Game not found or not finished");
    }

    console.log(`[Persist Results] Processing game ${args.game_id}`);

    try {
      // Don't persist spicy games (as per Phase 2 requirement)
      if (game.settings?.category === 'spicy') {
        console.log(`[Persist Results] Skipping spicy game ${args.game_id}`);
        return { persisted: false, reason: 'spicy_game_not_persisted' };
      }

      // Prepare game session data for Supabase
      const sessionData = {
        convex_game_id: args.game_id,
        game_type: game.game_type,
        host_user_id: game.host_user_id,
        difficulty: game.difficulty,
        max_players: game.max_players,
        rounds: game.rounds,
        mode: game.mode,
        status: 'completed',
        final_scores: game.final_scores || game.players.map(p => ({
          user_id: p.user_id,
          score: p.score,
          rank: game.players
            .sort((a, b) => b.score - a.score)
            .findIndex(sorted => sorted.user_id === p.user_id) + 1
        })),
        winner_user_id: game.players.length > 0 
          ? game.players.reduce((winner, player) => 
              player.score > (winner?.score || 0) ? player : winner
            )?.user_id 
          : null,
        total_duration_seconds: game.finished_at && game.started_at 
          ? Math.floor((game.finished_at - game.started_at) / 1000) 
          : null,
        started_at: game.started_at ? new Date(game.started_at).toISOString() : null,
        finished_at: game.finished_at ? new Date(game.finished_at).toISOString() : null,
        settings: game.settings || {}
      };

      // Call Next.js API to persist to Supabase
      const supabaseResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/games/persist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(sessionData),
      });

      if (!supabaseResponse.ok) {
        throw new Error(`Supabase persistence failed: ${supabaseResponse.status}`);
      }

      const persistResult = await supabaseResponse.json();
      const gameSessionId = persistResult.session_id;

      // Grant rewards to each player
      const rewardPromises = game.players.map(async (player) => {
        const finalScore = game.final_scores?.find(fs => fs.user_id === player.user_id) || {
          score: player.score,
          rank: game.players
            .sort((a, b) => b.score - a.score)
            .findIndex(sorted => sorted.user_id === player.user_id) + 1
        };

        const rewardData = {
          game_session_id: gameSessionId,
          game_type: game.game_type,
          difficulty: game.difficulty,
          score: finalScore.score,
          won: finalScore.rank === 1,
          rank: finalScore.rank,
          total_players: game.players.length
        };

        try {
          const rewardResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/rewards/grant`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': player.user_id, // Custom header for server-side user identification
            },
            body: JSON.stringify(rewardData),
          });

          if (!rewardResponse.ok) {
            console.error(`[Rewards] Failed for player ${player.user_id}: ${rewardResponse.status}`);
            return null;
          }

          const rewardResult = await rewardResponse.json();
          console.log(`[Rewards] Granted to ${player.user_id}: +${rewardResult.xp_earned} XP`);
          
          return {
            user_id: player.user_id,
            xp_earned: rewardResult.xp_earned,
            leveled_up: rewardResult.leveled_up,
            new_achievements: rewardResult.new_achievements,
          };
        } catch (error) {
          console.error(`[Rewards] Error for player ${player.user_id}:`, error);
          return null;
        }
      });

      const rewardResults = await Promise.all(rewardPromises);
      const successfulRewards = rewardResults.filter(r => r !== null);

      // Update the game document with persistence info
      await ctx.db.patch(args.game_id, {
        settings: {
          ...game.settings,
          persisted: true,
          supabase_session_id: gameSessionId,
          rewards_granted: successfulRewards,
          persisted_at: Date.now(),
        },
      });

      console.log(`[Persist Results] Successfully persisted game ${args.game_id} with ${successfulRewards.length} reward grants`);

      // Trigger AI Coach analysis for each player
      const coachPromises = game.players.map(async (player: PlayerType) => {
        try {
          const coachResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai-coach/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: player.user_id,
              game_session_id: gameSessionId,
            }),
          });

          if (coachResponse.ok) {
            console.log(`[AI Coach] Generated insights for player ${player.user_id}`);
          }
        } catch (error) {
          console.error(`[AI Coach] Error for player ${player.user_id}:`, error);
        }
      });

      // Don't wait for AI Coach to complete - fire and forget
      Promise.all(coachPromises).catch(error => {
        console.error('[AI Coach] Error in batch analysis:', error);
      });

      return {
        persisted: true,
        session_id: gameSessionId,
        rewards_granted: successfulRewards.length,
        total_players: game.players.length,
      };

    } catch (error) {
      console.error(`[Persist Results] Error persisting game ${args.game_id}:`, error);
      
      // Mark as failed but don't throw - this should not break the game flow
      await ctx.db.patch(args.game_id, {
        settings: {
          ...game.settings,
          persistence_failed: true,
          persistence_error: error instanceof Error ? error.message : 'Unknown error',
          persistence_attempted_at: Date.now(),
        },
      });

      return {
        persisted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Near-miss detection for Phase 3 resilience
export const checkNearMiss = action({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
    submitted_answer: v.string(),
    correct_answer: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Near Miss] Checking answer "${args.submitted_answer}" vs "${args.correct_answer}"`);

    try {
      // Use OpenAI to check for typos, alternative spellings, etc.
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a lenient quiz judge. Determine if the submitted answer should be accepted despite being technically wrong. Consider:
              - Typos and spelling mistakes
              - Alternative spellings or names
              - Synonyms or equivalent terms
              - Cultural variations
              - Partial answers that show understanding
              
              Respond with ONLY "ACCEPT" or "REJECT" followed by a brief reason.`
            },
            {
              role: "user",
              content: `Question: ${args.question}
Correct Answer: ${args.correct_answer}
Submitted Answer: ${args.submitted_answer}

Should this be accepted?`
            }
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        console.warn("[Near Miss] OpenAI API unavailable, rejecting answer");
        return { should_accept: false, reason: "AI check unavailable" };
      }

      const result = await response.json();
      const aiResponse = result.choices[0].message.content.trim();
      
      const shouldAccept = aiResponse.startsWith("ACCEPT");
      const reason = aiResponse.split(" ").slice(1).join(" ");

      if (shouldAccept) {
        console.log(`[Near Miss] Accepting "${args.submitted_answer}": ${reason}`);
        
        // Update the player's score
        await ctx.runMutation(internal.games.correctNearMiss, {
          game_id: args.game_id,
          user_id: args.user_id,
          reason: reason || "Alternative answer accepted",
        });
      }

      return {
        should_accept: shouldAccept,
        reason: reason || "AI evaluation completed",
      };

    } catch (error) {
      console.error("[Near Miss] Error:", error);
      return { should_accept: false, reason: "Error checking answer" };
    }
  },
});

export const correctNearMiss = mutation({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new Error("Game not found");
    }

    // Find and update the player's score
    const updatedPlayers = game.players.map(player => {
      if (player.user_id === args.user_id) {
        return {
          ...player,
          score: player.score + 100, // Give points for near miss
        };
      }
      return player;
    });

    // Log the correction
    const corrections = game.settings?.near_miss_corrections || [];
    corrections.push({
      user_id: args.user_id,
      reason: args.reason,
      points_awarded: 100,
      corrected_at: Date.now(),
    });

    await ctx.db.patch(args.game_id, {
      players: updatedPlayers,
      settings: {
        ...game.settings,
        near_miss_corrections: corrections,
      },
      updated_at: Date.now(),
    });
  },
});

// Reconnection helper for Phase 3 resilience
export const handleReconnection = query({
  args: {
    game_id: v.id("live_games"),
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      return { success: false, error: "Game not found" };
    }

    // Check if user is part of this game
    const playerExists = game.players.some(p => p.user_id === args.user_id);
    if (!playerExists) {
      return { success: false, error: "User not in game" };
    }

    // Return current game state for reconnection
    return {
      success: true,
      game_state: {
        status: game.status,
        current_round: game.current_round,
        current_question: game.current_question,
        players: game.players,
        time_remaining: game.current_question?.started_at 
          ? Math.max(0, (game.current_question.started_at + (game.current_question.time_limit * 1000)) - Date.now())
          : 0,
        settings: game.settings,
      },
      reconnected_at: Date.now(),
    };
  },
}); 