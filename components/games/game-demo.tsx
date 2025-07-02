"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Users, 
  Trophy, 
  Brain, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Star,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  category: string;
}

const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    question: "Which anime features a protagonist who can defeat any enemy with a single punch?",
    options: ["Dragon Ball Z", "One Punch Man", "Attack on Titan", "Naruto"],
    correct_answer: 1,
    explanation: "One Punch Man (Saitama) is known for his ability to defeat any enemy with just one punch, making him an overpowered but often bored hero.",
    difficulty: "easy",
    category: "anime"
  },
  {
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correct_answer: 2,
    explanation: "Au comes from the Latin word 'aurum' meaning gold. Ag is silver, Go and Gd are not valid chemical symbols.",
    difficulty: "medium",
    category: "chemistry"
  },
  {
    question: "In which year did the Berlin Wall fall?",
    options: ["1987", "1989", "1991", "1993"],
    correct_answer: 1,
    explanation: "The Berlin Wall fell on November 9, 1989, marking a pivotal moment in the end of the Cold War and German reunification.",
    difficulty: "medium",
    category: "history"
  },
  {
    question: "Which K-Pop group performed the hit song 'Dynamite'?",
    options: ["BLACKPINK", "TWICE", "BTS", "Red Velvet"],
    correct_answer: 2,
    explanation: "BTS released 'Dynamite' in 2020, which became their first song entirely in English and topped the Billboard Hot 100.",
    difficulty: "easy",
    category: "kpop"
  },
  {
    question: "What is the largest planet in our solar system?",
    options: ["Saturn", "Jupiter", "Neptune", "Uranus"],
    correct_answer: 1,
    explanation: "Jupiter is the largest planet in our solar system, with a mass greater than all other planets combined.",
    difficulty: "easy",
    category: "astronomy"
  }
];

interface GameDemoProps {
  gameType: string;
  onClose: () => void;
}

export default function GameDemo({ gameType, onClose }: GameDemoProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(new Array(DEMO_QUESTIONS.length).fill(false));

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && !showExplanation && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !showExplanation) {
      // Auto-submit when time runs out
      handleAnswerSubmit();
    }
  }, [timeRemaining, showExplanation, gameState]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer === null && !showExplanation) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleAnswerSubmit = () => {
    if (selectedAnswer !== null || timeRemaining === 0) {
      const currentQ = DEMO_QUESTIONS[currentQuestion];
      const isCorrect = selectedAnswer === currentQ.correct_answer;
      
      if (isCorrect) {
        // Calculate score with time bonus
        const timeBonus = Math.max(0, timeRemaining * 2);
        setScore(score + 100 + timeBonus);
      }

      const newAnswered = [...answeredQuestions];
      newAnswered[currentQuestion] = true;
      setAnsweredQuestions(newAnswered);
      
      setShowExplanation(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < DEMO_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeRemaining(30);
    } else {
      setGameState('finished');
    }
  };

  const resetGame = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setTimeRemaining(30);
    setGameState('playing');
    setAnsweredQuestions(new Array(DEMO_QUESTIONS.length).fill(false));
  };

  const progress = ((currentQuestion + (showExplanation ? 1 : 0)) / DEMO_QUESTIONS.length) * 100;
  const currentQ = DEMO_QUESTIONS[currentQuestion];

  if (gameState === 'finished') {
    const accuracy = Math.round((score / (DEMO_QUESTIONS.length * 160)) * 100); // Max possible: 100 + 60 time bonus per question
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🎉 Game Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You've finished the {gameType} demo
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {score}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Final Score
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {accuracy}%
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Accuracy
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetGame} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Play Again
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close Demo
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">🤖 AI {gameType} Demo</h2>
              <p className="text-blue-100">
                Question {currentQuestion + 1} of {DEMO_QUESTIONS.length}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-sm text-blue-100">Score</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-blue-500" />
          </div>
        </div>

        {/* Game Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Question Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Timer and Category */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="px-3 py-1">
                  <Brain className="h-3 w-3 mr-1" />
                  {currentQ.category}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className={cn(
                    "font-mono font-bold",
                    timeRemaining <= 5 ? "text-red-500" : timeRemaining <= 10 ? "text-orange-500" : "text-green-500"
                  )}>
                    {timeRemaining}s
                  </span>
                </div>
              </div>

              {/* Question */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg leading-relaxed">
                    {currentQ.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentQ.options.map((option, index) => {
                    let buttonVariant: "default" | "outline" | "secondary" = "outline";
                    let className = "w-full justify-start text-left h-auto p-4 transition-all";
                    
                    if (showExplanation) {
                      if (index === currentQ.correct_answer) {
                        buttonVariant = "default";
                        className += " bg-green-100 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300";
                      } else if (index === selectedAnswer && selectedAnswer !== currentQ.correct_answer) {
                        buttonVariant = "secondary";
                        className += " bg-red-100 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300";
                      }
                    } else if (selectedAnswer === index) {
                      buttonVariant = "default";
                      className += " bg-blue-100 dark:bg-blue-900/20 border-blue-500";
                    }

                    return (
                      <Button
                        key={index}
                        variant={buttonVariant}
                        className={className}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showExplanation}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="flex-1">{option}</span>
                          {showExplanation && index === currentQ.correct_answer && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {showExplanation && index === selectedAnswer && selectedAnswer !== currentQ.correct_answer && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Explanation */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          AI Explanation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 dark:text-gray-300">
                          {currentQ.explanation}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!showExplanation ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Exit Demo
                    </Button>
                    <Button
                      onClick={handleAnswerSubmit}
                      disabled={selectedAnswer === null}
                      className="flex-1"
                    >
                      Submit Answer
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Exit Demo
                    </Button>
                    <Button
                      onClick={handleNextQuestion}
                      className="flex-1"
                    >
                      {currentQuestion < DEMO_QUESTIONS.length - 1 ? (
                        <>
                          Next Question
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Finish Game
                          <Trophy className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Game Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Game Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>Solo Demo Mode</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-gray-500" />
                    <span>Mixed Difficulty</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>30s per question</span>
                  </div>
                </CardContent>
              </Card>

              {/* Question Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {DEMO_QUESTIONS.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          index < currentQuestion || (index === currentQuestion && showExplanation)
                            ? "bg-green-500 text-white"
                            : index === currentQuestion
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                        )}
                      >
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Features */}
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <CardHeader>
                  <CardTitle className="text-base">🤖 AI Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Dynamic question generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Intelligent explanations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Adaptive difficulty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Real-time scoring</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 