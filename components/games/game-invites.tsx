"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Clock, Check, X, Send, Eye, Calendar,
  UserPlus, Mail, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

type GameInvite = {
  id: string;
  game_session_id: string;
  host_user_id: string;
  host_username: string;
  host_avatar_url?: string;
  invited_user_id: string;
  game_type: {
    display_name: string;
    icon_name: string;
    estimated_duration_minutes: number;
  };
  status: "pending" | "accepted" | "declined" | "expired";
  created_at: string;
  expires_at: string;
  type: "incoming" | "outgoing";
};

// Mock data for development
const mockInvites: GameInvite[] = [
  {
    id: "1",
    game_session_id: "game_1",
    host_user_id: "user2",
    host_username: "Morgan",
    host_avatar_url: "/avatars/morgan.jpg",
    invited_user_id: "current_user",
    game_type: {
      display_name: "History Trivia",
      icon_name: "BookOpen",
      estimated_duration_minutes: 15
    },
    status: "pending",
    created_at: "2024-01-07T16:30:00Z",
    expires_at: "2024-01-08T16:30:00Z",
    type: "incoming"
  },
  {
    id: "2",
    game_session_id: "game_2", 
    host_user_id: "current_user",
    host_username: "You",
    invited_user_id: "user3",
    game_type: {
      display_name: "Science Quiz",
      icon_name: "Atom",
      estimated_duration_minutes: 20
    },
    status: "pending",
    created_at: "2024-01-07T15:45:00Z",
    expires_at: "2024-01-08T15:45:00Z",
    type: "outgoing"
  },
  {
    id: "3",
    game_session_id: "game_3",
    host_user_id: "user4",
    host_username: "Casey",
    invited_user_id: "current_user",
    game_type: {
      display_name: "Geography Challenge",
      icon_name: "Globe",
      estimated_duration_minutes: 25
    },
    status: "declined",
    created_at: "2024-01-07T14:20:00Z",
    expires_at: "2024-01-08T14:20:00Z",
    type: "incoming"
  }
];

export function GameInvites() {
  const [invites, setInvites] = useState<GameInvite[]>(mockInvites);
  const [isLoading, setIsLoading] = useState(false);

  const incomingInvites = invites.filter(invite => invite.type === "incoming");
  const outgoingInvites = invites.filter(invite => invite.type === "outgoing");
  const pendingIncoming = incomingInvites.filter(invite => invite.status === "pending");

  const handleAcceptInvite = (inviteId: string) => {
    console.log("Accepting invite:", inviteId);
    setInvites(prev => prev.map(invite => 
      invite.id === inviteId 
        ? { ...invite, status: "accepted" as const }
        : invite
    ));
  };

  const handleDeclineInvite = (inviteId: string) => {
    console.log("Declining invite:", inviteId);
    setInvites(prev => prev.map(invite => 
      invite.id === inviteId 
        ? { ...invite, status: "declined" as const }
        : invite
    ));
  };

  const handleCancelInvite = (inviteId: string) => {
    console.log("Canceling invite:", inviteId);
    setInvites(prev => prev.filter(invite => invite.id !== inviteId));
  };

  const refreshInvites = () => {
    setIsLoading(true);
    // TODO: Fetch invites from API
    setTimeout(() => setIsLoading(false), 1000);
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return "Expired";
    if (diffHours < 24) return `${diffHours}h left`;
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays}d left`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-600";
      case "accepted": return "text-green-600";
      case "declined": return "text-red-600";
      case "expired": return "text-gray-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Game Invitations</h2>
          <p className="text-muted-foreground">
            Manage your game invitations and join friends
          </p>
        </div>
        <Button
          onClick={refreshInvites}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Pending Notifications */}
      {pendingIncoming.length > 0 && (
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary">
              <Mail className="w-5 h-5" />
              <span className="font-medium">
                You have {pendingIncoming.length} pending invite{pendingIncoming.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invites Tabs */}
      <Tabs defaultValue="incoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="incoming" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Incoming ({incomingInvites.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            <Send className="w-4 h-4" />
            Sent ({outgoingInvites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          {incomingInvites.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No invitations</h3>
              <p className="text-sm text-muted-foreground">
                When friends invite you to games, they'll appear here.
              </p>
            </div>
          ) : (
            incomingInvites.map((invite, index) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={invite.host_avatar_url} />
                          <AvatarFallback>
                            {invite.host_username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            <span className="text-primary">{invite.host_username}</span> invited you to play
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {invite.game_type.display_name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            ~{invite.game_type.estimated_duration_minutes} minutes
                            <span>•</span>
                            <Calendar className="w-3 h-3" />
                            {formatTimeRemaining(invite.expires_at)}
                          </div>
                        </div>
                      </div>
                      
                      <Badge 
                        variant={invite.status === "pending" ? "default" : "secondary"}
                        className={cn("text-xs", getStatusColor(invite.status))}
                      >
                        {invite.status}
                      </Badge>
                    </div>

                    {invite.status === "pending" && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleAcceptInvite(invite.id)}
                          size="sm"
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          onClick={() => handleDeclineInvite(invite.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          {outgoingInvites.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No sent invitations</h3>
              <p className="text-sm text-muted-foreground">
                Invitations you send to friends will appear here.
              </p>
            </div>
          ) : (
            outgoingInvites.map((invite, index) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="glass-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-medium">
                          Invited to <span className="text-primary">{invite.game_type.display_name}</span>
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          ~{invite.game_type.estimated_duration_minutes} minutes
                          <span>•</span>
                          <Calendar className="w-3 h-3" />
                          {formatTimeRemaining(invite.expires_at)}
                        </div>
                      </div>
                      
                      <Badge 
                        variant={invite.status === "pending" ? "default" : "secondary"}
                        className={cn("text-xs", getStatusColor(invite.status))}
                      >
                        {invite.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Waiting for response...
                      </p>
                      
                      {invite.status === "pending" && (
                        <Button 
                          onClick={() => handleCancelInvite(invite.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 