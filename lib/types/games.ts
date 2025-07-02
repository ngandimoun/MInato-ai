// ============================================================================
// GAME TYPES - Type definitions for Minato AI Games
// ============================================================================

export interface GameType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  min_players: number;
  max_players: number;
  default_rounds: number;
  difficulty_levels: string[];
  estimated_duration_minutes?: number;
  icon_name?: string;
  color_theme?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  convex_game_id?: string;
  game_type_id: string;
  host_user_id: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  max_players: number;
  rounds: number;
  mode: 'solo' | 'multiplayer';
  status: 'lobby' | 'in_progress' | 'completed' | 'cancelled';
  final_scores?: any;
  winner_user_id?: string;
  total_duration_seconds?: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  updated_at: string;
  settings: any;
}

export interface GameParticipant {
  id: string;
  game_session_id: string;
  user_id: string;
  score: number;
  correct_answers: number;
  total_answers: number;
  rank?: number;
  joined_at: string;
  left_at?: string;
  created_at: string;
}

export interface UserGameStats {
  id: string;
  user_id: string;
  total_games_played: number;
  total_wins: number;
  total_score: number;
  xp_points: number;
  level: number;
  game_type_stats: any;
  achievements: any[];
  favorite_game_types: string[];
  preferred_difficulty: string;
  created_at: string;
  updated_at: string;
}

export interface GameInvitation {
  id: string;
  game_session_id: string;
  host_user_id: string;
  invited_user_id: string;
  invited_username: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  responded_at?: string;
  expires_at: string;
}

// Convex types for real-time games
export interface LiveGame {
  _id: string;
  supabase_session_id: string;
  game_type: string;
  host_user_id: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  max_players: number;
  rounds: number;
  mode: 'solo' | 'multiplayer';
  status: 'lobby' | 'in_progress' | 'finished' | 'cancelled';
  current_round: number;
  current_question_index?: number;
  players: LiveGamePlayer[];
  questions?: GameQuestion[];
  current_question?: CurrentQuestion;
  current_answers?: PlayerAnswer[];
  final_scores?: FinalScore[];
  created_at: number;
  updated_at: number;
  started_at?: number;
  finished_at?: number;
  settings?: GameSettings;
}

export interface LiveGamePlayer {
  user_id: string;
  username: string;
  avatar_url?: string;
  score: number;
  joined_at: number;
  is_ready: boolean;
}

export interface GameQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  category?: string;
}

export interface CurrentQuestion {
  question: string;
  options: string[];
  time_limit: number;
  started_at: number;
}

export interface PlayerAnswer {
  user_id: string;
  answer_index: number;
  answered_at: number;
  time_taken: number;
}

export interface FinalScore {
  user_id: string;
  score: number;
  correct_answers: number;
  rank: number;
}

export interface GameSettings {
  auto_advance: boolean;
  show_explanations: boolean;
  time_per_question: number;
  category?: string;
  language?: string;
  ai_personality?: string;
  topic_focus?: string;
}

export interface LiveGameInvitation {
  _id: string;
  game_id: string;
  host_user_id: string;
  invited_user_id: string;
  invited_username: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: number;
  responded_at?: number;
  expires_at: number;
}

// UI Component Types
export interface GameLibraryItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  min_players: number;
  max_players: number;
  estimated_duration_minutes: number;
  icon_name: string;
  color_theme: string;
  difficulty_levels: string[];
  is_popular?: boolean;
  is_new?: boolean;
}

export interface ActiveGameItem {
  id: string;
  game_type: string;
  display_name: string;
  status: 'lobby' | 'in_progress';
  players: {
    user_id: string;
    username: string;
    avatar_url?: string;
  }[];
  max_players: number;
  current_round: number;
  total_rounds: number;
  host_user_id: string;
  created_at: number;
  can_join: boolean;
  can_resume: boolean;
}

export interface GameInviteItem {
  id: string;
  game_id: string;
  host_user_id: string;
  host_username: string;
  host_avatar?: string;
  game_type: string;
  display_name: string;
  status: 'pending';
  created_at: number;
  expires_at: number;
}

export interface GameStatsItem {
  game_type: string;
  display_name: string;
  games_played: number;
  wins: number;
  win_rate: number;
  best_score: number;
  avg_score: number;
  icon_name: string;
  color_theme: string;
}

export interface UserGameProgress {
  level: number;
  xp_points: number;
  xp_to_next_level: number;
  total_games: number;
  total_wins: number;
  win_rate: number;
  favorite_categories: string[];
  recent_achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Game Creation and Management
export interface CreateGameRequest {
  game_type: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  max_players: number;
  rounds: number;
  mode: 'solo' | 'multiplayer';
  settings?: Partial<GameSettings>;
  category?: string;
}

export interface JoinGameRequest {
  game_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
}

export interface GameResponse {
  success: boolean;
  game_id?: string;
  error?: string;
  message?: string;
}

// Score and Leaderboard
export interface ScoreResult {
  user_id: string;
  answer_index: number;
  is_correct: boolean;
  points_earned: number;
  time_taken: number;
}

export interface Leaderboard {
  rank: number;
  user_id: string;
  username: string;
  score: number;
  avatar_url?: string;
}

export interface GameResult {
  game_id: string;
  final_scores: FinalScore[];
  leaderboard: Leaderboard[];
  game_duration: number;
  questions_answered: number;
  correct_answers: number;
  accuracy_rate: number;
  xp_earned: number;
  achievements_unlocked: Achievement[];
}

// Constants for game configuration
export const DIFFICULTY_LEVELS = ['beginner', 'easy', 'medium', 'hard', 'expert'] as const;
export const GAME_MODES = ['solo', 'multiplayer'] as const;
export const GAME_STATUSES = ['lobby', 'in_progress', 'finished', 'cancelled'] as const;
export const INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const;

export const GAME_CATEGORIES = [
  'trivia',
  'puzzle',
  'word',
  'strategy',
  'creative',
  'educational',
  'social',
  'logic',
  'memory',
  'speed'
] as const;

export const XP_PER_LEVEL = 1000;
export const BASE_GAME_XP = 50;
export const WIN_BONUS_XP = 100;
export const PERFECT_SCORE_BONUS = 200;

// Game type to icon mapping
export const GAME_ICONS = {
  classic_academia_quiz: 'GraduationCap',
  pop_culture_trivia: 'Tv',
  niche_hobbyist_corner: 'Users',
  guess_the_entity: 'Eye',
  guess_the_title: 'Film',
  twenty_questions: 'HelpCircle',
  hangman_themed: 'Type',
  guess_the_song: 'Music',
  story_chain: 'BookOpen',
  pitch_movie: 'Camera',
  haiku_battle: 'Feather',
  courtroom_drama: 'Scale',
  ai_improv: 'Theater',
  couples_challenge: 'Heart',
  two_sides_story: 'Users2',
  memory_lane: 'Clock',
  dare_or_describe: 'Smile',
  escape_room: 'Key',
  solo_adventure: 'Sword',
  five_levels_challenge: 'Layers',
  code_breaker: 'Lock',
  connect_dots: 'Link',
  math_physics_challenge: 'Calculator',
  chemistry_lab: 'TestTube',
  astronomy_explorer: 'Star',
  medical_mysteries: 'Stethoscope',
  pharmacy_knowledge: 'Pill',
  biology_quest: 'Dna',
  history_detective: 'Search',
  language_master: 'Languages',
  art_appreciation: 'Palette',
  philosophy_cafe: 'Brain',
  psychology_insights: 'Mind',
  economics_game: 'TrendingUp',
  geography_explorer: 'Map'
} as const; 