"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Flag, Shield, AlertTriangle, X, Send, 
  MessageCircle, Users, Zap, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  reportedUserId: string;
  reportedUsername: string;
  content: string;
  onReportSubmitted: () => void;
}

export function ReportModal({
  isOpen,
  onClose,
  gameId,
  reportedUserId,
  reportedUsername,
  content,
  onReportSubmitted
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const reportCategories = [
    { value: 'inappropriate_content', label: 'Inappropriate Content', icon: '🚫' },
    { value: 'harassment', label: 'Harassment or Bullying', icon: '⚠️' },
    { value: 'spam', label: 'Spam or Flooding', icon: '📢' },
    { value: 'hate_speech', label: 'Hate Speech', icon: '💢' },
    { value: 'other', label: 'Other', icon: '❓' },
  ];

  const commonReasons = [
    'Contains offensive language',
    'Inappropriate for the game context',
    'Spam or repeated content',
    'Harassment of other players',
    'Violates community guidelines',
  ];

  const handleSubmitReport = async () => {
    if (!reason || !category) {
      toast({
        title: "Missing Information",
        description: "Please select a category and provide a reason.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/games/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_id: gameId,
          reported_user_id: reportedUserId,
          content,
          reason,
          category,
          additional_details: additionalDetails,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const result = await response.json();
      
      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community safe. Your report has been submitted for review.",
      });

      onReportSubmitted();
      onClose();
      
      // Reset form
      setReason('');
      setCategory('');
      setAdditionalDetails('');

    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Flag className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold">Report Content</h3>
                <p className="text-sm text-muted-foreground">
                  Report @{reportedUsername}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Content Being Reported */}
          <div>
            <label className="block text-sm font-medium mb-2">Content being reported:</label>
            <div className="bg-muted/50 rounded-lg p-3 text-sm max-h-20 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono">{content}</pre>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {reportCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Reason *</label>
            <div className="space-y-2">
              {commonReasons.map((commonReason) => (
                <motion.button
                  key={commonReason}
                  type="button"
                  onClick={() => setReason(commonReason)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border text-sm transition-all",
                    reason === commonReason
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground"
                  )}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {commonReason}
                </motion.button>
              ))}
              
              <Textarea
                placeholder="Or describe the issue in your own words..."
                value={reason.includes('Contains offensive') ? '' : reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-16"
              />
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Additional details (optional)
            </label>
            <Textarea
              placeholder="Any additional context that might be helpful..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Disclaimer */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Report Guidelines</p>
                <p className="text-xs">
                  Reports are reviewed by moderators and may result in warnings, 
                  temporary suspensions, or permanent bans. False reports may result 
                  in action against your account.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReport}
            disabled={!reason || !category || isSubmitting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ModerationBadgeProps {
  content: string;
  userId: string;
  username: string;
  gameId: string;
  isFlagged?: boolean;
  className?: string;
}

export function ModerationBadge({
  content,
  userId,
  username,
  gameId,
  isFlagged = false,
  className
}: ModerationBadgeProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReported, setIsReported] = useState(false);

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {isFlagged && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="w-3 h-3" />
            Flagged
          </Badge>
        )}
        
        {!isReported ? (
          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-red-500 gap-1"
          >
            <Flag className="w-3 h-3" />
            Report
          </Button>
        ) : (
          <Badge variant="secondary" className="text-xs gap-1">
            <Check className="w-3 h-3" />
            Reported
          </Badge>
        )}
      </div>

      <AnimatePresence>
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          gameId={gameId}
          reportedUserId={userId}
          reportedUsername={username}
          content={content}
          onReportSubmitted={() => setIsReported(true)}
        />
      </AnimatePresence>
    </>
  );
}

interface ContentModerationWrapperProps {
  content: string;
  userId: string;
  username: string;
  gameId: string;
  children: React.ReactNode;
  moderationFlags?: string[];
}

export function ContentModerationWrapper({
  content,
  userId,
  username,
  gameId,
  children,
  moderationFlags = []
}: ContentModerationWrapperProps) {
  const [showContent, setShowContent] = useState(moderationFlags.length === 0);
  const isFlagged = moderationFlags.length > 0;

  if (isFlagged && !showContent) {
    return (
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Content Hidden
              </span>
              <Badge variant="outline" className="text-xs">
                Auto-moderated
              </Badge>
            </div>
            <Button
              onClick={() => setShowContent(true)}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Show anyway
            </Button>
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            This content was flagged by our AI moderation system for: {moderationFlags.join(', ')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative group">
      {children}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ModerationBadge
          content={content}
          userId={userId}
          username={username}
          gameId={gameId}
          isFlagged={isFlagged}
        />
      </div>
    </div>
  );
} 