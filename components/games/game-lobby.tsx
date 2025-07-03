"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Clock, 
  Copy, 
  Check,
  Send,
  Crown,
  Play,
  UserCheck,
  UserX,
  Loader2,
  Share2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  username: string;
  avatar_url?: string;
  status: 'joined' | 'invited' | 'declined';
  joined_at?: string;
}

interface GameLobbyProps {
  roomId: string;
  roomCode: string;
  gameType: string;
  gameIcon: string;
  hostId: string;
  maxPlayers: number;
  players: Player[];
  invitedUsers: Array<{
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    status: 'pending' | 'accepted' | 'declined';
  }>;
  onStartGame: () => void;
  onInviteMore: () => void;
  onKickPlayer?: (playerId: string) => void;
  isHost: boolean;
  className?: string;
}

export function GameLobby({
  roomId,
  roomCode,
  gameType,
  gameIcon,
  hostId,
  maxPlayers,
  players,
  invitedUsers,
  onStartGame,
  onInviteMore,
  onKickPlayer,
  isHost,
  className
}: GameLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  const joinedPlayers = players.filter(p => p.status === 'joined');
  const canStart = joinedPlayers.length >= 2; // Minimum 2 players to start

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast({
        title: "Room Code Copied!",
        description: "Share this code with friends to invite them.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy room code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareRoom = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my ${gameType} game!`,
          text: `I'm hosting a ${gameType} game on Minato. Join with code: ${roomCode}`,
          url: `${window.location.origin}/games/join/${roomCode}`,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyRoomCode();
    }
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      await onStartGame();
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Start Game Failed",
        description: "Could not start the game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'joined': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300';
      case 'invited': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'pending': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
      case 'declined': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="glass-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="text-4xl">{gameIcon}</div>
            <div>
              <CardTitle className="text-2xl">{gameType} Lobby</CardTitle>
              <CardDescription>
                Waiting for players to join...
              </CardDescription>
            </div>
          </div>
          
          {/* Room Code */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-muted-foreground mb-1">Room Code</div>
              <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                {roomCode}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomCode}
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareRoom}
                className="h-8 w-8 p-0"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Players Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <CardTitle className="text-lg">
                Players ({joinedPlayers.length}/{maxPlayers})
              </CardTitle>
            </div>
            {isHost && (
              <Button
                variant="outline"
                size="sm"
                onClick={onInviteMore}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Invite More
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Joined Players */}
            {joinedPlayers.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={player.avatar_url} alt={player.username} />
                  <AvatarFallback>
                    {getUserInitials(player.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{player.username}</p>
                    {player.id === hostId && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {player.joined_at ? `Joined ${new Date(player.joined_at).toLocaleTimeString()}` : 'Online'}
                  </p>
                </div>
                <Badge className={getStatusColor('joined')}>
                  <UserCheck className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
                {isHost && player.id !== hostId && onKickPlayer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onKickPlayer(player.id)}
                    className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <UserX className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            ))}

            {/* Invited Users */}
            {invitedUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback>
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge className={getStatusColor(user.status)}>
                  {user.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {user.status === 'accepted' && <UserCheck className="w-3 h-3 mr-1" />}
                  {user.status === 'declined' && <UserX className="w-3 h-3 mr-1" />}
                  {user.status === 'pending' ? 'Invited' : user.status}
                </Badge>
              </motion.div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: maxPlayers - joinedPlayers.length - invitedUsers.length }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400">Waiting for player...</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isHost && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {canStart 
                    ? "Ready to start the game!" 
                    : `Need at least 2 players to start (${joinedPlayers.length}/2)`
                  }
                </p>
                <Button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  size="lg"
                  className="gap-2"
                >
                  {isStarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isStarting ? 'Starting Game...' : 'Start Game'}
                </Button>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Share the room code or invite more friends
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRoomCode}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onInviteMore}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Invite Friends
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-host waiting message */}
      {!isHost && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <div className="text-6xl">⏳</div>
              <div>
                <h3 className="text-lg font-medium mb-2">Waiting for Host</h3>
                <p className="text-sm text-muted-foreground">
                  The game will start when the host is ready
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 