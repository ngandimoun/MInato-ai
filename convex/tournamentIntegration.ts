import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Called when a tournament game finishes to update the tournament state
export const handleTournamentGameComplete = action({
  args: {
    game_id: v.id("live_games"),
    tournament_match_id: v.string(),
    winner_user_id: v.string(),
    player1_score: v.number(),
    player2_score: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`[Tournament] Game ${args.game_id} completed for match ${args.tournament_match_id}`);

    try {
      // Find the tournament that contains this match
      const tournaments = await ctx.runQuery(api.tournaments.getActiveTournaments);
      const tournament = tournaments.find(t => 
        t.bracket.some(match => match.match_id === args.tournament_match_id)
      );

      if (!tournament) {
        console.error(`[Tournament] No tournament found for match ${args.tournament_match_id}`);
        return { success: false, error: 'Tournament not found' };
      }

      // Record the match result
      await ctx.runMutation(api.tournaments.recordMatchResult, {
        tournament_doc_id: tournament._id,
        match_id: args.tournament_match_id,
        winner_id: args.winner_user_id,
        player1_score: args.player1_score,
        player2_score: args.player2_score,
      });

      // Check if round is complete
      await ctx.runAction(api.tournaments.checkRoundCompletion, {
        tournament_doc_id: tournament._id,
        round_number: tournament.current_round,
      });

      console.log(`[Tournament] Successfully updated tournament ${tournament.tournament_id}`);
      return { success: true };

    } catch (error) {
      console.error(`[Tournament] Error handling game completion:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
}); 