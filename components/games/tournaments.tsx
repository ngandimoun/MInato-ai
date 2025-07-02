"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from "@/context/auth-provider";
import { Trophy, Users, Calendar, DollarSign } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  prize_pool: number;
  max_participants: number;
  status: 'upcoming' | 'active' | 'completed';
  created_at: string;
}

interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  score: number;
  rank: number;
  joined_at: string;
}

export function TournamentsList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .order('start_date', { ascending: true });

        if (tournamentsError) throw tournamentsError;

        const { data: participantsData, error: participantsError } = await supabase
          .from('tournament_participants')
          .select('*')
          .order('rank', { ascending: true });

        if (participantsError) throw participantsError;

        setTournaments(tournamentsData || []);
        setParticipants(participantsData || []);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, [supabase]);

  const joinTournament = async (tournamentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          score: 0,
          rank: 0,
        });

      if (error) throw error;

      // Refresh participants data
      const { data: participantsData } = await supabase
        .from('tournament_participants')
        .select('*')
        .order('rank', { ascending: true });

      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Error joining tournament:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'upcoming': return 'secondary';
      case 'active': return 'default';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading tournaments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h2 className="text-2xl font-bold">Tournaments</h2>
        </div>
        <p className="text-muted-foreground">
          Compete with other players for prizes and glory
        </p>
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No tournaments available</h3>
                <p className="text-muted-foreground">
                  Check back soon for upcoming competitions!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tournaments.map((tournament) => {
            const tournamentParticipants = participants.filter(
              p => p.tournament_id === tournament.id
            );
            const userParticipant = tournamentParticipants.find(
              p => p.user_id === user?.id
            );

            return (
              <Card key={tournament.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {tournament.name}
                        <Badge variant={getStatusBadgeVariant(tournament.status)}>
                          {tournament.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {tournament.description}
                      </CardDescription>
                    </div>
                    {userParticipant && (
                      <Badge variant="default" className="bg-green-600">
                        Joined
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>Prize: ${tournament.prize_pool}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>
                        {tournamentParticipants.length}/{tournament.max_participants} players
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>
                        {new Date(tournament.start_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <span>
                        {userParticipant ? `Rank #${userParticipant.rank || 'TBD'}` : 'Not joined'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!userParticipant && tournament.status === 'upcoming' && user && (
                      <Button 
                        onClick={() => joinTournament(tournament.id)}
                        className="flex-1"
                      >
                        Join Tournament
                      </Button>
                    )}
                    {tournament.status === 'active' && (
                      <Button variant="outline" className="flex-1">
                        View Bracket
                      </Button>
                    )}
                    {tournament.status === 'completed' && (
                      <Button variant="outline" className="flex-1">
                        View Results
                      </Button>
                    )}
                  </div>

                  {userParticipant && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <span>Your Score: {userParticipant.score}</span>
                        <span>
                          Joined: {new Date(userParticipant.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Tournaments() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Sign in required</h3>
                <p className="text-muted-foreground">
                  Please sign in to view and join tournaments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <TournamentsList />
    </div>
  );
} 