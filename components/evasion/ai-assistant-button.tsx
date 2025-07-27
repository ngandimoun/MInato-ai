'use client'
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, Lightbulb, Clock, Globe, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantButtonProps {
  onAskQuestion: (question: string) => void;
  isProcessing?: boolean;
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  {
    icon: <Lightbulb className="w-4 h-4" />,
    text: "Explain what's happening right now",
    category: "Context"
  },
  {
    icon: <Clock className="w-4 h-4" />,
    text: "What are the key timestamps?",
    category: "Navigation"
  },
  {
    icon: <Globe className="w-4 h-4" />,
    text: "Summarize this video",
    category: "Overview"
  },
  {
    icon: <Zap className="w-4 h-4" />,
    text: "What are the main topics?",
    category: "Analysis"
  }
];

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  onAskQuestion,
  isProcessing = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");

  const handleQuestionClick = (question: string) => {
    onAskQuestion(question);
    setIsOpen(false);
    setCustomQuestion("");
  };

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      onAskQuestion(customQuestion.trim());
      setIsOpen(false);
      setCustomQuestion("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-800 transition-all duration-200 ${className}`}
          disabled={isProcessing}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          Ask Minato
          {isProcessing && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="ml-2"
            >
              <div className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full" />
            </motion.div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            <span>Ask Minato about this video</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Suggested Questions */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Questions</h3>
            <div className="grid grid-cols-1 gap-2">
              <AnimatePresence>
                {SUGGESTED_QUESTIONS.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-3 hover:bg-purple-50"
                      onClick={() => handleQuestionClick(item.text)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-purple-600">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.text}</div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {item.category}
                          </Badge>
                        </div>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Custom Question */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Ask your own question</h3>
            <div className="flex gap-2">
              <Input
                placeholder="What would you like to know?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCustomQuestion();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleCustomQuestion}
                disabled={!customQuestion.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                Ask
              </Button>
            </div>
          </div>

          {/* Tips */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="text-xs text-blue-700">
                <strong>💡 Tips:</strong> Try asking in different languages or ask about specific timestamps!
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 