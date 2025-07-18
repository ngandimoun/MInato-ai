import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-provider'
import { useTrialProtectedApiCall } from './useTrialExpirationHandler'

interface UserStats {
  total_games_played: number
  total_wins: number
  total_score: number
  xp_points: number
  level: number
  current_streak: number
  best_streak: number
  favorite_game_types: string[]
  achievements: any[]
  game_type_stats: any
  xp_to_next_level: number
  win_rate: number
  daily_games_played: number
  daily_wins: number
  team_wins: number
}

interface GameHistoryItem {
  id: string
  game_type: string
  game_type_display_name: string
  game_type_icon: string
  game_type_color: string
  difficulty: string
  mode: string
  status: string
  max_players: number
  rounds: number
  duration_seconds: number
  created_at: string
  started_at: string
  finished_at: string
  was_host: boolean
  won: boolean
  score: number
  rank: number
  accuracy: number
  total_players: number
}

interface GameHistoryResponse {
  success: boolean
  games: GameHistoryItem[]
  summary: {
    total_games: number
    total_wins: number
    total_score: number
    average_score: number
    win_rate: number
  }
  game_type_breakdown: any[]
  pagination: {
    limit: number
    offset: number
    has_more: boolean
  }
}

export function useGameStats() {
  const { user } = useAuth()
  const { callTrialProtectedApi } = useTrialProtectedApiCall()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    await callTrialProtectedApi(
      async () => {
        const response = await fetch('/api/games/user-stats')
        
        if (!response.ok) {
          throw new Error('Failed to fetch user stats')
        }
        
        const data = await response.json()
        
        if (data.success) {
          return data.stats
        } else {
          throw new Error(data.error || 'Failed to fetch user stats')
        }
      },
      (data) => {
        setStats(data)
        setIsLoading(false)
      },
      (err) => {
        console.error('Error fetching user stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch user stats')
        setIsLoading(false)
      }
    )
  }

  useEffect(() => {
    fetchStats()
  }, [user])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  }
}

export function useGameHistory(limit = 20, offset = 0, gameType?: string) {
  const { user } = useAuth()
  const [history, setHistory] = useState<GameHistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      
      if (gameType) {
        params.append('game_type', gameType)
      }
      
      const response = await fetch(`/api/games/history?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch game history')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setHistory(data)
      } else {
        throw new Error(data.error || 'Failed to fetch game history')
      }
    } catch (err) {
      console.error('Error fetching game history:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch game history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [user, limit, offset, gameType])

  return {
    history,
    isLoading,
    error,
    refetch: fetchHistory
  }
} 