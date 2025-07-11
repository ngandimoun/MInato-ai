'use client';

import React, { useState, useEffect } from 'react';
import { useUserActiveGames, useSupabaseGameMutations } from '@/hooks/useSupabaseGames';
import { useAuth } from '@/context/auth-provider';
import type { ActiveGameItem } from '@/lib/types/games';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Trash2, 
  Users, 
  Clock, 
  Target, 
  Gamepad2,
  AlertCircle,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GameActionButtonsProps {
  game: ActiveGameItem;
  currentUserId: string;
  onGameAction: (action: 'start' | 'resume' | 'delete', gameId: string) => void;
  isLoading: boolean;
}

const GameActionButtons: React.FC<GameActionButtonsProps> = ({ 
  game, 
  currentUserId, 
  onGameAction, 
  isLoading 
}) => {
  const isHost = game.host_user_id === currentUserId;
  const isFinished = game.status === 'finished' || game.status === 'cancelled';
  
  // Determine the correct game state
  const getGameState = () => {
    if (isFinished) return 'finished';
    if (game.status === 'in_progress') return 'in_progress';
    return 'lobby';
  };

  const gameState = getGameState();

  const renderPrimaryButton = () => {
    const buttonProps = {
      disabled: isLoading,
      className: "flex items-center space-x-2"
    };

    switch (gameState) {
      case 'lobby':
        if (!isHost) {
          return (
            <Button {...buttonProps} variant="outline" disabled>
              <Users className="w-4 h-4" />
              <span>Waiting for Host</span>
            </Button>
          );
        }
        return (
          <Button 
            {...buttonProps} 
            onClick={() => onGameAction('start', game.id)}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Start Game</span>
          </Button>
        );

      case 'in_progress':
        return (
          <Button 
            {...buttonProps} 
            onClick={() => onGameAction('resume', game.id)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            <span>Resume Game</span>
          </Button>
        );

      case 'finished':
        return (
          <Button {...buttonProps} variant="outline" disabled>
            <Target className="w-4 h-4" />
            <span>Game Finished</span>
          </Button>
        );

      default:
        return null;
    }
  };

  const renderDeleteButton = () => {
    if (!isHost) return null;

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Delete Game</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this game room? This action cannot be undone.
              {gameState === 'in_progress' && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  ⚠️ This game is currently in progress. All progress will be lost.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onGameAction('delete', game.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Game'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <div className="flex items-center space-x-2">
      {renderPrimaryButton()}
      {renderDeleteButton()}
    </div>
  );
};

const ActiveGames: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { activeGames, isLoading } = useUserActiveGames();
  const { startGame, deleteGame } = useSupabaseGameMutations();

  const currentUserId = user?.id || null;

  const handleGameAction = async (action: 'start' | 'resume' | 'delete', gameId: string) => {
    if (!currentUserId) {
      toast({
        title: "❌ Authentication Required",
        description: "Please log in to perform this action.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(gameId);

    try {
      switch (action) {
        case 'start':
          console.log("🚀 Starting game:", gameId);
          const startResult = await startGame(gameId);
          
          if (startResult.success) {
            toast({
              title: "🚀 Game Started!",
              description: "The game has begun. Good luck!",
            });
            // Navigate to the game
            router.push(`/games/play/${gameId}`);
          } else {
            throw new Error(startResult.error || 'Failed to start game');
          }
          break;

        case 'resume':
          console.log("▶️ Resuming game:", gameId);
          toast({
            title: "▶️ Resuming Game",
            description: "Taking you back to your game...",
          });
          router.push(`/games/play/${gameId}`);
          break;

        case 'delete':
          console.log("🗑️ Deleting game:", gameId);
          const deleteResult = await deleteGame(gameId);
          
          if (deleteResult.success) {
            toast({
              title: "🗑️ Game Deleted",
              description: "The game has been successfully deleted.",
            });
          } else {
            throw new Error(deleteResult.error || 'Failed to delete game');
          }
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} game:`, error);
      toast({
        title: `❌ Failed to ${action === 'start' ? 'Start' : action === 'resume' ? 'Resume' : 'Delete'} Game`,
        description: error instanceof Error ? error.message : `An error occurred while trying to ${action} the game.`,
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (game: ActiveGameItem) => {
    if (game.status === 'finished' || game.status === 'cancelled') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Finished</Badge>;
    }
    if (game.status === 'in_progress') {
      return <Badge variant="default" className="bg-blue-100 text-blue-700">In Progress</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-700">Lobby</Badge>;
  };

  const formatGameTime = (game: ActiveGameItem) => {
    const createdAt = new Date(game.created_at);
    return `Created ${createdAt.toLocaleTimeString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your games...</span>
        </div>
      </div>
    );
  }

  const games = activeGames || [];

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-700">No Active Games</h3>
          <p className="text-sm text-gray-500">Create a new game to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Active Games</h2>
        <Badge variant="outline">{games.length} game{games.length !== 1 ? 's' : ''}</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card key={game.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{game.room_code || game.display_name}</CardTitle>
                {getStatusBadge(game)}
              </div>
              <p className="text-sm text-gray-600 capitalize">
                {game.display_name}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>Max {game.max_players} players</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span>{game.total_rounds} rounds</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="capitalize">{game.game_type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Gamepad2 className="w-4 h-4 text-gray-500" />
                  <span className="capitalize">{game.mode}</span>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 mb-3">
                  {formatGameTime(game)}
                </p>
                
                {currentUserId && (
                  <GameActionButtons
                    game={game}
                    currentUserId={currentUserId}
                    onGameAction={handleGameAction}
                    isLoading={actionLoading === game.id}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActiveGames; 