"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Users, Crown, Shuffle, Plus, Trash2, Edit3, 
  Palette, Save, UserPlus, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = {
  user_id: string;
  username: string;
  avatar_url?: string;
  score: number;
  is_ready: boolean;
};

type Team = {
  team_id: string;
  team_name: string;
  members: string[]; // user_ids
  color: string;
};

interface TeamModeProps {
  gameId: string;
  players: Player[];
  hostUserId: string;
  currentUserId: string;
  teams: Team[];
  onUpdateTeams: (teams: Team[]) => Promise<void>;
  onStartGame: () => void;
  isLoading?: boolean;
}

const TEAM_COLORS = [
  { name: 'Crimson Warriors', color: 'bg-red-500', border: 'border-red-500', text: 'text-red-500' },
  { name: 'Azure Legends', color: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500' },
  { name: 'Emerald Champions', color: 'bg-green-500', border: 'border-green-500', text: 'text-green-500' },
  { name: 'Golden Eagles', color: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-500' },
  { name: 'Purple Storm', color: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-500' },
  { name: 'Orange Flames', color: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500' },
  { name: 'Pink Blossoms', color: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-500' },
  { name: 'Teal Waves', color: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-500' },
];

export function TeamMode({
  gameId,
  players,
  hostUserId,
  currentUserId,
  teams: initialTeams,
  onUpdateTeams,
  onStartGame,
  isLoading = false
}: TeamModeProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isHost = currentUserId === hostUserId;

  // Update unassigned players when teams change
  useEffect(() => {
    const assignedPlayerIds = teams.flatMap(team => team.members);
    const unassigned = players.filter(player => !assignedPlayerIds.includes(player.user_id));
    setUnassignedPlayers(unassigned);
  }, [teams, players]);

  const createNewTeam = () => {
    if (teams.length >= 4) return; // Max 4 teams
    
    const availableColors = TEAM_COLORS.filter(color => 
      !teams.some(team => team.color === color.color)
    );
    
    if (availableColors.length === 0) return;
    
    const newTeam: Team = {
      team_id: crypto.randomUUID(),
      team_name: availableColors[0].name,
      members: [],
      color: availableColors[0].color,
    };
    
    setTeams(prev => [...prev, newTeam]);
  };

  const removeTeam = (teamId: string) => {
    setTeams(prev => prev.filter(team => team.team_id !== teamId));
  };

  const addPlayerToTeam = (playerId: string, teamId: string) => {
    // Remove player from any other team first
    setTeams(prev => prev.map(team => ({
      ...team,
      members: team.team_id === teamId 
        ? [...team.members.filter(id => id !== playerId), playerId]
        : team.members.filter(id => id !== playerId)
    })));
  };

  const removePlayerFromTeam = (playerId: string, teamId: string) => {
    setTeams(prev => prev.map(team => 
      team.team_id === teamId 
        ? { ...team, members: team.members.filter(id => id !== playerId) }
        : team
    ));
  };

  const updateTeamName = (teamId: string, newName: string) => {
    setTeams(prev => prev.map(team => 
      team.team_id === teamId 
        ? { ...team, team_name: newName }
        : team
    ));
    setEditingTeamId(null);
    setEditingName('');
  };

  const autoBalanceTeams = () => {
    const numTeams = Math.max(2, Math.min(teams.length || 2, Math.ceil(players.length / 2)));
    const playersPerTeam = Math.floor(players.length / numTeams);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    const newTeams: Team[] = [];
    
    for (let i = 0; i < numTeams; i++) {
      const start = i * playersPerTeam;
      const end = i === numTeams - 1 ? shuffledPlayers.length : start + playersPerTeam;
      const teamPlayers = shuffledPlayers.slice(start, end);
      
      newTeams.push({
        team_id: teams[i]?.team_id || crypto.randomUUID(),
        team_name: teams[i]?.team_name || TEAM_COLORS[i].name,
        members: teamPlayers.map(p => p.user_id),
        color: teams[i]?.color || TEAM_COLORS[i].color,
      });
    }
    
    setTeams(newTeams);
  };

  const saveTeams = async () => {
    if (!isHost) return;
    
    setIsSaving(true);
    try {
      await onUpdateTeams(teams);
    } catch (error) {
      console.error('Error saving teams:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canStartGame = teams.length >= 2 && 
                      teams.every(team => team.members.length > 0) && 
                      unassignedPlayers.length === 0;

  const handleDragStart = (playerId: string) => {
    setDraggedPlayer(playerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, teamId: string) => {
    e.preventDefault();
    if (draggedPlayer && isHost) {
      addPlayerToTeam(draggedPlayer, teamId);
      setDraggedPlayer(null);
    }
  };

  const getTeamColorClasses = (color: string) => {
    const colorConfig = TEAM_COLORS.find(c => c.color === color);
    return {
      bg: colorConfig?.color || 'bg-gray-500',
      border: colorConfig?.border || 'border-gray-500',
      text: colorConfig?.text || 'text-gray-500',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">⚔️ Team Battle Mode</h2>
                <p className="text-sm text-muted-foreground">
                  {isHost ? 'Organize players into teams' : 'Teams are being organized'}
                </p>
              </div>
            </div>
            
            {isHost && (
              <div className="flex gap-2">
                <Button
                  onClick={autoBalanceTeams}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  Auto Balance
                </Button>
                <Button
                  onClick={createNewTeam}
                  variant="outline"
                  size="sm"
                  disabled={teams.length >= 4}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Team
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unassigned Players */}
      {unassignedPlayers.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Unassigned Players ({unassignedPlayers.length})
            </CardTitle>
            <CardDescription>
              {isHost ? 'Drag players to teams or use auto-balance' : 'Waiting for team assignment'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {unassignedPlayers.map((player) => (
                <motion.div
                  key={player.user_id}
                  draggable={isHost}
                  onDragStart={() => handleDragStart(player.user_id)}
                  className={cn(
                    "flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 transition-all",
                    isHost && "cursor-grab hover:bg-muted/70",
                    draggedPlayer === player.user_id && "opacity-50 scale-95"
                  )}
                  whileHover={isHost ? { scale: 1.02 } : {}}
                  whileTap={isHost ? { scale: 0.98 } : {}}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {player.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{player.username}</span>
                  {player.user_id === hostUserId && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {teams.map((team, index) => {
            const colorClasses = getTeamColorClasses(team.color);
            const teamPlayers = players.filter(p => team.members.includes(p.user_id));
            
            return (
              <motion.div
                key={team.team_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className={cn(
                    "glass-card transition-all duration-200",
                    `${colorClasses.border} border-2`
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, team.team_id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", colorClasses.bg)} />
                        {editingTeamId === team.team_id ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => updateTeamName(team.team_id, editingName)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateTeamName(team.team_id, editingName);
                              }
                            }}
                            className="h-6 text-sm font-semibold"
                            autoFocus
                          />
                        ) : (
                          <h3 
                            className={cn("font-semibold", colorClasses.text)}
                            onClick={() => {
                              if (isHost) {
                                setEditingTeamId(team.team_id);
                                setEditingName(team.team_name);
                              }
                            }}
                          >
                            {team.team_name}
                          </h3>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {teamPlayers.length} players
                        </Badge>
                        {isHost && teams.length > 2 && (
                          <Button
                            onClick={() => removeTeam(team.team_id)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {teamPlayers.length === 0 ? (
                        <div className="flex items-center justify-center h-16 border-2 border-dashed border-muted rounded-lg">
                          <span className="text-sm text-muted-foreground">
                            {isHost ? 'Drop players here' : 'No players assigned'}
                          </span>
                        </div>
                      ) : (
                        teamPlayers.map((player) => (
                          <motion.div
                            key={player.user_id}
                            layout
                            className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={player.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {player.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{player.username}</span>
                              {player.user_id === hostUserId && (
                                <Crown className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                            
                            {isHost && (
                              <Button
                                onClick={() => removePlayerFromTeam(player.user_id, team.team_id)}
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </motion.div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Actions */}
      {isHost && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="text-sm">
                  {canStartGame 
                    ? '✅ Ready to start team battle!' 
                    : '⚠️ Assign all players to teams before starting'
                  }
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={saveTeams}
                  variant="outline"
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Teams'}
                </Button>
                
                <Button
                  onClick={onStartGame}
                  disabled={!canStartGame || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white gap-2"
                >
                  <Users className="w-4 h-4" />
                  {isLoading ? 'Starting...' : 'Start Team Battle'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 