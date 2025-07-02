"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from '@/context/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Clock, Coins, Crown, Zap, Target, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TournamentState {
  _id: Id<"tournaments">;
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
}

interface TournamentParticipant {
  user_id: string;
  username: string;
  avatar_url?: string;
  seed: number;
  status: "registered" | "active" | "eliminated" | "winner";
  current_match_id?: string;
  total_score: number;
  matches_won: number;
  matches_lost: number;
}

interface TournamentMatch {
  match_id: string;
  round: number;
  player1_id: string;
  player2_id?: string;
  winner_id?: string;
  game_session_id?: Id<"live_games">;
  status: "pending" | "in_progress" | "completed" | "bye";
  scheduled_at: number;
  started_at?: number;
  completed_at?: number;
  scores: {
    player1_score: number;
    player2_score: number;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'registration': return 'bg-blue-500';
    case 'bracket_generated': return 'bg-yellow-500';
    case 'in_progress': return 'bg-green-500';
    case 'completed': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return 'text-green-400';
    case 'easy': return 'text-blue-400';
    case 'medium': return 'text-yellow-400';
    case 'hard': return 'text-orange-400';
    case 'expert': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export default function Tournaments() {
  const { user } = useAuth();
  const [selectedTournament, setSelectedTournament] = useState<TournamentState | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  // Queries
  const activeTournaments = useQuery(api.tournaments.getActiveTournaments);
  const userTournaments = useQuery(api.tournaments.getUserTournaments, 
    user ? { user_id: user.id } : "skip"
  );

  // Mutations
  const registerForTournament = useMutation(api.tournaments.registerParticipant);

  const handleRegister = async (tournamentDocId: Id<"tournaments">) => {
    if (!user) return;
    
    try {
      await registerForTournament({
        tournament_doc_id: tournamentDocId,
        user_id: user.id,
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player',
        avatar_url: user.user_metadata?.avatar_url,
      });
    } catch (error) {
      console.error('Failed to register for tournament:', error);
    }
  };



  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to view tournaments
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          <Trophy className="inline-block w-8 h-8 mr-2 text-yellow-500" />
          Tournaments
        </h1>
        <p className="text-muted-foreground">
          Compete in high-stakes tournaments and climb the leaderboards
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Tournaments</TabsTrigger>
          <TabsTrigger value="my-tournaments">My Tournaments</TabsTrigger>
          <TabsTrigger value="bracket" disabled={!selectedTournament}>
            Tournament Bracket
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <AnimatePresence>
            {activeTournaments?.map((tournament, index) => (
              <motion.div
                key={tournament._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <TournamentCard
                  tournament={tournament}
                  onRegister={() => handleRegister(tournament._id)}
                  onViewBracket={() => {
                    setSelectedTournament(tournament);
                    setActiveTab("bracket");
                  }}
                  isRegistered={tournament.participants.some(p => p.user_id === user.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {activeTournaments?.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No active tournaments at the moment</p>
                  <p className="text-sm text-muted-foreground">Check back soon for upcoming competitions!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-tournaments" className="space-y-4">
          <AnimatePresence>
            {userTournaments?.map((tournament, index) => (
              <motion.div
                key={tournament._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <TournamentCard
                  tournament={tournament}
                  onViewBracket={() => {
                    setSelectedTournament(tournament);
                    setActiveTab("bracket");
                  }}
                  isRegistered={true}
                  showUserStats={true}
                  userStats={tournament.participants.find(p => p.user_id === user.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {userTournaments?.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">You haven't joined any tournaments yet</p>
                  <p className="text-sm text-muted-foreground">Register for a tournament to get started!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bracket" className="space-y-4">
          {selectedTournament ? (
            <TournamentBracket tournament={selectedTournament} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Select a tournament to view its bracket</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TournamentCard({ 
  tournament, 
  onRegister, 
  onViewBracket, 
  isRegistered, 
  showUserStats, 
  userStats 
}: {
  tournament: TournamentState;
  onRegister?: () => void;
  onViewBracket?: () => void;
  isRegistered?: boolean;
  showUserStats?: boolean;
  userStats?: TournamentParticipant;
}) {
  const canRegister = tournament.status === 'registration' && 
                     tournament.participants.length < tournament.settings.max_participants &&
                     !isRegistered;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {tournament.settings.game_type.replace('_', ' ').toUpperCase()} Tournament
              <Badge className={cn("text-white", getStatusColor(tournament.status))}>
                {tournament.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Round {tournament.current_round} of {tournament.total_rounds}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Coins className="w-4 h-4 text-yellow-500" />
              {tournament.settings.prize_pool}
            </div>
            <p className="text-xs text-muted-foreground">Prize Pool</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">
                {tournament.participants.length}/{tournament.settings.max_participants}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Participants</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Zap className={cn("w-4 h-4", getDifficultyColor(tournament.settings.difficulty))} />
              <span className="text-sm font-medium capitalize">
                {tournament.settings.difficulty}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Difficulty</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">
                {tournament.settings.time_per_round}s
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Per Question</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">
                {tournament.settings.entry_fee}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Entry Fee</p>
          </div>
        </div>

        {showUserStats && userStats && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-400" />
              Your Performance
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">{userStats.total_score}</span>
                <p className="text-xs text-muted-foreground">Total Score</p>
              </div>
              <div>
                <span className="font-medium">{userStats.matches_won}</span>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
              <div>
                <span className="font-medium">{userStats.matches_lost}</span>
                <p className="text-xs text-muted-foreground">Losses</p>
              </div>
            </div>
            <Badge 
              variant={userStats.status === 'winner' ? 'default' : 'secondary'}
              className={cn(
                userStats.status === 'winner' && 'bg-yellow-500 text-black',
                userStats.status === 'eliminated' && 'bg-red-500/20 text-red-400'
              )}
            >
              {userStats.status.toUpperCase()}
            </Badge>
          </div>
        )}

        <div className="flex gap-2">
          {canRegister && onRegister && (
            <Button onClick={onRegister} className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              Register ({tournament.settings.entry_fee} coins)
            </Button>
          )}
          
          {onViewBracket && (
            <Button 
              variant="outline" 
              onClick={onViewBracket}
              className={cn(!canRegister && "flex-1")}
            >
              <Target className="w-4 h-4 mr-2" />
              View Bracket
            </Button>
          )}

          {isRegistered && tournament.status === 'registration' && (
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
              <Crown className="w-3 h-3" />
              Registered
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TournamentBracket({ tournament }: { tournament: TournamentState }) {
  const rounds = Array.from({ length: tournament.total_rounds }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Tournament Bracket
          </CardTitle>
          <CardDescription>
            {tournament.settings.game_type.replace('_', ' ').toUpperCase()} Tournament - Round {tournament.current_round} of {tournament.total_rounds}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-fit">
          {rounds.map(round => (
            <div key={round} className="space-y-4 min-w-[250px]">
              <h3 className="text-lg font-semibold text-center">
                {round === tournament.total_rounds ? 'Final' : 
                 round === tournament.total_rounds - 1 ? 'Semi-Final' :
                 `Round ${round}`}
              </h3>
              
              <div className="space-y-3">
                {tournament.bracket
                  .filter(match => match.round === round)
                  .map(match => (
                    <MatchCard key={match.match_id} match={match} tournament={tournament} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, tournament }: { match: TournamentMatch; tournament: TournamentState }) {
  const player1 = tournament.participants.find(p => p.user_id === match.player1_id);
  const player2 = match.player2_id ? tournament.participants.find(p => p.user_id === match.player2_id) : null;

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-gray-300';
      case 'in_progress': return 'border-blue-500 shadow-blue-500/20';
      case 'completed': return 'border-green-500';
      case 'bye': return 'border-yellow-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <Card className={cn("transition-all duration-200", getMatchStatusColor(match.status))}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {match.status === 'bye' ? 'BYE' : match.status.toUpperCase()}
          </Badge>
          {match.status === 'completed' && match.winner_id && (
            <Crown className="w-4 h-4 text-yellow-500" />
          )}
        </div>

        <div className="space-y-2">
          {/* Player 1 */}
          <div className={cn(
            "flex items-center justify-between p-2 rounded",
            match.winner_id === match.player1_id ? "bg-green-500/20" : "bg-muted/50"
          )}>
            <span className="font-medium text-sm">
              {player1?.username || 'TBD'}
            </span>
            {match.status === 'completed' && (
              <span className="text-sm font-mono">
                {match.scores.player1_score}
              </span>
            )}
          </div>

          {/* VS Divider */}
          <div className="text-center text-xs text-muted-foreground">
            {match.status === 'bye' ? 'BYE' : 'VS'}
          </div>

          {/* Player 2 */}
          <div className={cn(
            "flex items-center justify-between p-2 rounded",
            match.winner_id === match.player2_id ? "bg-green-500/20" : "bg-muted/50"
          )}>
            <span className="font-medium text-sm">
              {player2?.username || 'TBD'}
            </span>
            {match.status === 'completed' && match.player2_id && (
              <span className="text-sm font-mono">
                {match.scores.player2_score}
              </span>
            )}
          </div>
        </div>

        {match.scheduled_at && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(match.scheduled_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 