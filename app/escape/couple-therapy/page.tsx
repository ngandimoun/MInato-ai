"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/auth-provider';
import { Header } from '@/components/header';
import { useNavigation } from '@/context/navigation-context';
import { Users, Copy, Check, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatSessionStatus, getStatusColor } from '@/lib/utils/couple-therapy';

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub" | "escape" | "evasion";

interface CoupleTherapySession {
  id: string;
  title: string;
  status: string;
  invitation_code: string;
  created_at: string;
  partner_id?: string;
  creator_id: string;
}

export default function CoupleTherapyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isNavigating } = useNavigation();
  const [currentView, setCurrentView] = useState<View>("escape");
  const [sessions, setSessions] = useState<CoupleTherapySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('Couple Therapy Page Loaded');
    console.log('User:', user?.id);
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('couple_therapy_sessions')
        .select('*')
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sessions:', error);
        setError('Failed to load sessions');
      } else {
        setSessions(data || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionTitle.trim()) {
      setError('Please enter a session title');
      return;
    }

    try {
      const response = await fetch('/api/couple-therapy/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSessionTitle })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create session');
        return;
      }

      setSuccess('Session created successfully! Share the invitation code with your partner.');
      setNewSessionTitle('');
      setShowCreateForm(false);
      loadSessions();
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session');
    }
  };

  const joinSession = async () => {
    if (!invitationCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }

    try {
      const response = await fetch('/api/couple-therapy/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_code: invitationCode })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to join session');
        return;
      }

      setSuccess('Successfully joined the session!');
      setInvitationCode('');
      setShowJoinForm(false);
      loadSessions();
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session');
    }
  };

  const copyInvitationCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const startSession = (sessionId: string) => {
    router.push(`/escape/couple-therapy/chat/${sessionId}`);
  };

  return (
    <>
      <Header currentView={currentView} onViewChange={(view: View) => setCurrentView(view)} />
      
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 pt-20 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-light text-slate-800 dark:text-white mb-4">
                💕 Couple Therapy
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-2">
                Create private therapy sessions and invite your partner to join
              </p>
              <div className="bg-rose-100 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 max-w-2xl mx-auto">
                <p className="text-rose-800 dark:text-rose-200 text-sm">
                  <strong>✨ Unique Feature:</strong> Only Couple Therapy allows you to invite another Minato user to participate in your session. 
                  Other therapy categories are for individual sessions only.
                </p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 mb-8 justify-center"
            >
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white"
                disabled={isNavigating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Session
              </Button>
              <Button
                onClick={() => setShowJoinForm(true)}
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={isNavigating}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join Session
              </Button>
            </motion.div>

            {/* Alerts */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Create Session Form */}
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Couple Therapy Session</CardTitle>
                    <CardDescription>
                      Create a private session and get an invitation code to share with your partner
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Session Title</label>
                      <Input
                        value={newSessionTitle}
                        onChange={(e) => setNewSessionTitle(e.target.value)}
                        placeholder="Enter session title..."
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createSession} disabled={isNavigating}>
                        Create Session
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Join Session Form */}
            {showJoinForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Join Couple Therapy Session</CardTitle>
                    <CardDescription>
                      Enter the invitation code provided by your partner
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Invitation Code</label>
                      <Input
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                        placeholder="Enter 8-character code..."
                        className="mt-1"
                        maxLength={8}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={joinSession} disabled={isNavigating}>
                        Join Session
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowJoinForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Feature Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-rose-200 dark:border-rose-800">
                <CardHeader>
                  <CardTitle className="text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Couple Therapy vs Other Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-rose-700 dark:text-rose-300 mb-3">💕 Couple Therapy</h4>
                      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <li>✅ Create sessions with invitation codes</li>
                        <li>✅ Invite another Minato user to join</li>
                        <li>✅ AI therapist supports both partners</li>
                        <li>✅ Shared conversation history</li>
                        <li>✅ Real-time messaging between partners</li>
                        <li>✅ Multilingual support for both users</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">🧘 Other Therapy Categories</h4>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>✅ Individual therapy sessions</li>
                        <li>❌ No invitation system</li>
                        <li>✅ AI therapist for one person</li>
                        <li>✅ Private conversation history</li>
                        <li>❌ No partner messaging</li>
                        <li>✅ Single user language support</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sessions List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-medium text-slate-800 dark:text-white mb-6">
                Your Couple Therapy Sessions
              </h2>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div>
                </div>
              ) : sessions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      No couple therapy sessions yet. Create your first session to get started.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-md mx-auto">
                      <p className="text-blue-800 dark:text-blue-200 text-xs">
                        <strong>💡 Tip:</strong> After creating a session, you'll get an invitation code to share with your partner. 
                        Only Couple Therapy has this unique invitation feature!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {sessions.map((session) => (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-medium text-slate-800 dark:text-white">
                                {session.title}
                              </h3>
                              <Badge className={getStatusColor(session.status)}>
                                {formatSessionStatus(session.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              Created {new Date(session.created_at).toLocaleDateString()}
                            </p>
                            {session.invitation_code && session.status === 'waiting_for_partner' && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  Invitation Code:
                                </span>
                                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono">
                                  {session.invitation_code}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyInvitationCode(session.invitation_code)}
                                >
                                  {copiedCode === session.invitation_code ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {session.status === 'active' && (
                              <Button
                                onClick={() => startSession(session.id)}
                                className="bg-rose-500 hover:bg-rose-600"
                              >
                                Start Session
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
} 