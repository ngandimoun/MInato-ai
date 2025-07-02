import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

// ============================================================================
// TOURNAMENT STATE MACHINE - Phase 4
// ============================================================================

// Tournament state types
export type TournamentState = {
  tournament_id: string;
  status: "registration" | "bracket_generated" | "in_progress" | "completed" | "cancelled";
  current_round: number;
  total_rounds: number;
  participants: TournamentParticipant[];
  bracket: TournamentMatch[];
  started_at?: number;
  current_round_started_at?: number;
  settings: {
    max_participants: number;
    entry_fee: number;
    prize_pool: number;
    game_type: string;
    difficulty: string;
    rounds_per_match: number;
    time_per_round: number;
    auto_advance: boolean;
  };
};

export type TournamentParticipant = {
  user_id: string;
  username: string;
  avatar_url?: string;
  seed: number;
  status: "registered" | "active" | "eliminated" | "winner";
  current_match_id?: string;
  total_score: number;
  matches_won: number;
  matches_lost: number;
};

export type TournamentMatch = {
  match_id: string;
  round: number;
  player1_id: string;
  player2_id?: string; // null for byes
  winner_id?: string;
  game_session_id?: string;
  status: "pending" | "in_progress" | "completed" | "bye";
  scheduled_at: number;
  started_at?: number;
  completed_at?: number;
  scores: {
    player1_score: number;
    player2_score: number;
  };
};

// ============================================================================
// TOURNAMENT MUTATIONS
// ============================================================================

export const createTournament = mutation({
  args: {
    tournament_id: v.string(),
    max_participants: v.number(),
    entry_fee: v.number(),
    game_type: v.string(),
    difficulty: v.string(),
    scheduled_start: v.number(),
    auto_advance: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tournamentState: TournamentState = {
      tournament_id: args.tournament_id,
      status: "registration",
      current_round: 0,
      total_rounds: Math.ceil(Math.log2(args.max_participants)),
      participants: [],
      bracket: [],
      settings: {
        max_participants: args.max_participants,
        entry_fee: args.entry_fee,
        prize_pool: 0,
        game_type: args.game_type,
        difficulty: args.difficulty,
        rounds_per_match: 10,
        time_per_round: 30,
        auto_advance: args.auto_advance || true,
      },
    };

    const tournamentDocId = await ctx.db.insert("tournaments", tournamentState);

    // Schedule tournament start
    await ctx.scheduler.runAt(
      args.scheduled_start,
      internal.tournaments.startTournament,
      { tournament_doc_id: tournamentDocId }
    );

    return tournamentDocId;
  },
});

export const registerParticipant = mutation({
  args: {
    tournament_doc_id: v.id("tournaments"),
    user_id: v.string(),
    username: v.string(),
    avatar_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    if (tournament.status !== "registration") {
      throw new Error("Tournament registration is closed");
    }

    if (tournament.participants.length >= tournament.settings.max_participants) {
      throw new Error("Tournament is full");
    }

    // Check if already registered
    const existingParticipant = tournament.participants.find((p: TournamentParticipant) => p.user_id === args.user_id);
    if (existingParticipant) {
      throw new Error("Already registered for this tournament");
    }

    const newParticipant: TournamentParticipant = {
      user_id: args.user_id,
      username: args.username,
      avatar_url: args.avatar_url,
      seed: tournament.participants.length + 1,
      status: "registered",
      total_score: 0,
      matches_won: 0,
      matches_lost: 0,
    };

    const updatedParticipants = [...tournament.participants, newParticipant];
    const updatedPrizePool = tournament.settings.prize_pool + tournament.settings.entry_fee;

    await ctx.db.patch(args.tournament_doc_id, {
      participants: updatedParticipants,
      settings: {
        ...tournament.settings,
        prize_pool: updatedPrizePool,
      },
    });

    return { registered: true, participant_count: updatedParticipants.length };
  },
});

// ============================================================================
// TOURNAMENT STATE MACHINE ACTIONS
// ============================================================================

export const startTournament = action({
  args: { tournament_doc_id: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    console.log(`[Tournament] Starting tournament ${tournament.tournament_id} with ${tournament.participants.length} participants`);

    // Generate bracket
    const bracket = generateTournamentBracket(tournament.participants);
    
    await ctx.db.patch(args.tournament_doc_id, {
      status: "bracket_generated",
      bracket: bracket,
      started_at: Date.now(),
    });

    // Start first round immediately
    await ctx.runAction(internal.tournaments.startRound, {
      tournament_doc_id: args.tournament_doc_id,
      round_number: 1,
    });

    return { bracket_generated: true, total_matches: bracket.length };
  },
});

export const startRound = action({
  args: {
    tournament_doc_id: v.id("tournaments"),
    round_number: v.number(),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    console.log(`[Tournament] Starting round ${args.round_number} for tournament ${tournament.tournament_id}`);

    // Get matches for this round
    const roundMatches = tournament.bracket.filter(match => match.round === args.round_number);
    
    // Create game sessions for each match
    const matchPromises = roundMatches.map(async (match: TournamentMatch) => {
      if (match.status === "bye") {
        // Handle bye - automatically advance player
        return ctx.runMutation(internal.tournaments.advancePlayerFromBye, {
          tournament_doc_id: args.tournament_doc_id,
          match_id: match.match_id,
          player_id: match.player1_id,
        });
      }

      // Create real-time game session for the match
      const gameId = await ctx.runMutation(internal.games.createGame, {
        game_type: tournament.settings.game_type,
        host_user_id: match.player1_id,
        difficulty: tournament.settings.difficulty,
        max_players: 2,
        rounds: tournament.settings.rounds_per_match,
        mode: "tournament",
        settings: {
          tournament_match_id: match.match_id,
          time_per_question: tournament.settings.time_per_round,
        },
      });

      // Auto-join both players
              await ctx.runMutation(api.games.joinGame, {
          game_id: gameId,
          user_id: match.player2_id!,
          username: tournament.participants.find((p: TournamentParticipant) => p.user_id === match.player2_id)?.username || "Player",
        });

      // Update match with game session
      return ctx.runMutation(internal.tournaments.updateMatchGameSession, {
        tournament_doc_id: args.tournament_doc_id,
        match_id: match.match_id,
        game_session_id: gameId,
      });
    });

    await Promise.all(matchPromises);

    // Update tournament state
    await ctx.db.patch(args.tournament_doc_id, {
      status: "in_progress",
      current_round: args.round_number,
      current_round_started_at: Date.now(),
    });

    // Schedule round completion check
    if (tournament.settings.auto_advance) {
      const maxRoundDuration = tournament.settings.rounds_per_match * tournament.settings.time_per_round + 300; // 5 min buffer
      await ctx.scheduler.runAfter(
        maxRoundDuration * 1000,
        internal.tournaments.checkRoundCompletion,
        {
          tournament_doc_id: args.tournament_doc_id,
          round_number: args.round_number,
        }
      );
    }

    return { round_started: true, matches_created: roundMatches.length };
  },
});

export const checkRoundCompletion = action({
  args: {
    tournament_doc_id: v.id("tournaments"),
    round_number: v.number(),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) return;

    console.log(`[Tournament] Checking round ${args.round_number} completion for tournament ${tournament.tournament_id}`);

    const roundMatches = tournament.bracket.filter(match => match.round === args.round_number);
    const completedMatches = roundMatches.filter(match => match.status === "completed" || match.status === "bye");

    if (completedMatches.length === roundMatches.length) {
      // Round is complete, advance to next round
      const nextRound = args.round_number + 1;
      
      if (nextRound > tournament.total_rounds) {
        // Tournament is complete
        await ctx.runAction(internal.tournaments.completeTournament, {
          tournament_doc_id: args.tournament_doc_id,
        });
      } else {
        // Start next round
        await ctx.runAction(internal.tournaments.startRound, {
          tournament_doc_id: args.tournament_doc_id,
          round_number: nextRound,
        });
      }
    } else {
      // Still waiting for matches to complete
      console.log(`[Tournament] Round ${args.round_number} still in progress: ${completedMatches.length}/${roundMatches.length} matches completed`);
    }

    return { round_complete: completedMatches.length === roundMatches.length };
  },
});

export const completeTournament = action({
  args: { tournament_doc_id: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    console.log(`[Tournament] Completing tournament ${tournament.tournament_id}`);

    // Find the winner (participant with winner status)
    const winner = tournament.participants.find(p => p.status === "winner");
    
    if (winner) {
      // Distribute prizes via Next.js API
      const prizeData = {
        tournament_id: tournament.tournament_id,
        winner_user_id: winner.user_id,
        prize_pool: tournament.settings.prize_pool,
        participants: tournament.participants.length,
      };

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tournaments/distribute-prizes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(prizeData),
        });

        if (response.ok) {
          console.log(`[Tournament] Prizes distributed for tournament ${tournament.tournament_id}`);
        }
      } catch (error) {
        console.error(`[Tournament] Error distributing prizes:`, error);
      }
    }

    // Update tournament status
    await ctx.db.patch(args.tournament_doc_id, {
      status: "completed",
    });

    // Persist tournament results to Supabase
    await ctx.runAction(internal.tournaments.persistTournamentResults, {
      tournament_doc_id: args.tournament_doc_id,
    });

    return { tournament_completed: true, winner_id: winner?.user_id };
  },
});

// ============================================================================
// HELPER MUTATIONS
// ============================================================================

export const updateMatchGameSession = mutation({
  args: {
    tournament_doc_id: v.id("tournaments"),
    match_id: v.string(),
    game_session_id: v.id("live_games"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    const updatedBracket = tournament.bracket.map(match => {
      if (match.match_id === args.match_id) {
        return {
          ...match,
          game_session_id: args.game_session_id,
          status: "in_progress" as const,
          started_at: Date.now(),
        };
      }
      return match;
    });

    await ctx.db.patch(args.tournament_doc_id, {
      bracket: updatedBracket,
    });
  },
});

export const advancePlayerFromBye = mutation({
  args: {
    tournament_doc_id: v.id("tournaments"),
    match_id: v.string(),
    player_id: v.string(),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    // Mark match as completed with bye
    const updatedBracket = tournament.bracket.map(match => {
      if (match.match_id === args.match_id) {
        return {
          ...match,
          status: "bye" as const,
          winner_id: args.player_id,
          completed_at: Date.now(),
        };
      }
      return match;
    });

    await ctx.db.patch(args.tournament_doc_id, {
      bracket: updatedBracket,
    });
  },
});

// Called when a game finishes to record tournament match result
export const recordMatchResult = mutation({
  args: {
    tournament_doc_id: v.id("tournaments"),
    match_id: v.string(),
    winner_id: v.string(),
    player1_score: v.number(),
    player2_score: v.number(),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    // Update bracket with match result
    const updatedBracket = tournament.bracket.map(match => {
      if (match.match_id === args.match_id) {
        return {
          ...match,
          status: "completed" as const,
          winner_id: args.winner_id,
          completed_at: Date.now(),
          scores: {
            player1_score: args.player1_score,
            player2_score: args.player2_score,
          },
        };
      }
      return match;
    });

    // Update participant records
    const updatedParticipants = tournament.participants.map(participant => {
      const match = tournament.bracket.find(m => m.match_id === args.match_id);
      if (!match) return participant;

      if (participant.user_id === args.winner_id) {
        return {
          ...participant,
          matches_won: participant.matches_won + 1,
          total_score: participant.total_score + (participant.user_id === match.player1_id ? args.player1_score : args.player2_score),
        };
      } else if (participant.user_id === match.player1_id || participant.user_id === match.player2_id) {
        return {
          ...participant,
          matches_lost: participant.matches_lost + 1,
          total_score: participant.total_score + (participant.user_id === match.player1_id ? args.player1_score : args.player2_score),
          status: "eliminated" as const,
        };
      }
      return participant;
    });

    // Check if this is the final match
    const finalRound = Math.max(...updatedBracket.map(m => m.round));
    const finalMatch = updatedBracket.find(m => m.round === finalRound && m.match_id === args.match_id);
    
    if (finalMatch) {
      // Mark winner
      const finalParticipants = updatedParticipants.map(p => 
        p.user_id === args.winner_id ? { ...p, status: "winner" as const } : p
      );
      
      await ctx.db.patch(args.tournament_doc_id, {
        bracket: updatedBracket,
        participants: finalParticipants,
      });
    } else {
      await ctx.db.patch(args.tournament_doc_id, {
        bracket: updatedBracket,
        participants: updatedParticipants,
      });
    }

    return { match_recorded: true, is_final_match: !!finalMatch };
  },
});

// ============================================================================
// TOURNAMENT QUERIES
// ============================================================================

export const getTournament = query({
  args: { tournament_doc_id: v.id("tournaments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tournament_doc_id);
  },
});

export const getActiveTournaments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tournaments")
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "registration"),
          q.eq(q.field("status"), "bracket_generated"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .collect();
  },
});

export const getUserTournaments = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    const tournaments = await ctx.db.query("tournaments").collect();
    
    return tournaments.filter(tournament => 
      tournament.participants.some(p => p.user_id === args.user_id)
    );
  },
});

// ============================================================================
// PERSISTENCE ACTION
// ============================================================================

export const persistTournamentResults = action({
  args: { tournament_doc_id: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournament_doc_id);
    if (!tournament) throw new Error("Tournament not found");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tournaments/persist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          convex_tournament_id: args.tournament_doc_id,
          tournament_data: tournament,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to persist tournament: ${response.status}`);
      }

      console.log(`[Tournament] Successfully persisted tournament ${tournament.tournament_id}`);
      return { persisted: true };

    } catch (error) {
      console.error(`[Tournament] Error persisting tournament:`, error);
      return { persisted: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// ============================================================================
// BRACKET GENERATION HELPER
// ============================================================================

function generateTournamentBracket(participants: TournamentParticipant[]): TournamentMatch[] {
  const bracket: TournamentMatch[] = [];
  const numParticipants = participants.length;
  const totalRounds = Math.ceil(Math.log2(numParticipants));
  
  // Shuffle participants for random seeding
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  
  // Generate first round matches
  let matchCounter = 1;
  for (let i = 0; i < shuffledParticipants.length; i += 2) {
    const player1 = shuffledParticipants[i];
    const player2 = shuffledParticipants[i + 1];
    
    const match: TournamentMatch = {
      match_id: `match_${matchCounter}`,
      round: 1,
      player1_id: player1.user_id,
      player2_id: player2?.user_id,
      status: player2 ? "pending" : "bye",
      scheduled_at: Date.now(),
      scores: {
        player1_score: 0,
        player2_score: 0,
      },
    };
    
    if (!player2) {
      // Bye match - player1 automatically advances
      match.winner_id = player1.user_id;
      match.status = "bye";
      match.completed_at = Date.now();
    }
    
    bracket.push(match);
    matchCounter++;
  }
  
  // Generate subsequent rounds (placeholders)
  for (let round = 2; round <= totalRounds; round++) {
    const prevRoundMatches = bracket.filter(m => m.round === round - 1);
    const numMatchesThisRound = Math.ceil(prevRoundMatches.length / 2);
    
    for (let i = 0; i < numMatchesThisRound; i++) {
      const match: TournamentMatch = {
        match_id: `match_${matchCounter}`,
        round: round,
        player1_id: "", // Will be filled when previous round completes
        player2_id: "", // Will be filled when previous round completes
        status: "pending",
        scheduled_at: Date.now() + (round - 1) * 3600000, // 1 hour between rounds
        scores: {
          player1_score: 0,
          player2_score: 0,
        },
      };
      
      bracket.push(match);
      matchCounter++;
    }
  }
  
  return bracket;
}