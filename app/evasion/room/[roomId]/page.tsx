// app/evasion/room/[roomId]/page.tsx
"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Copy, Play, Edit3, Check, X, UserPlus, MessageSquare, Video, Crown, Youtube, SendHorizontal, Home, ArrowLeft } from "lucide-react"
import { TimestampText } from "@/components/evasion/timestamp-link"
import { AIAssistantButton } from "@/components/evasion/ai-assistant-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/context/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Header } from "@/components/header"
import { getBrowserSupabaseClient } from "@/lib/supabase/client"
import { UserSelector } from "@/components/evasion/user-selector"

type View =
  | "chat"
  | "settings"
  | "memory"
  | "dashboard"
  | "games"
  | "listening"
  | "insights"
  | "creation-hub"
  | "escape"
  | "evasion"

interface EvasionRoom {
  id: string
  name: string
  description?: string
  host_user_id: string
  current_video_url?: string
  current_video_position: number
  is_playing: boolean
  max_participants: number
  is_private: boolean
  room_code: string
  created_at: string
}

interface RoomParticipant {
  id: string
  user_id: string
  name?: string
  avatar_url?: string
  joined_at: string
  is_active: boolean
}

interface ChatMessage {
  id: string
  content: string
  user_id: string
  username: string
  avatar_url?: string
  message_type?: "text" | "system" | "video_action" | "ai_response"
  created_at: string
}

interface PageProps {
  params: Promise<{ roomId: string }>
}

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  display_name: string
}

export default function EvasionRoomPage({ params }: PageProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [currentView, setCurrentView] = useState<View>("evasion")
  const supabase = getBrowserSupabaseClient()

  // Use React.use to unwrap the params Promise
  const { roomId } = React.use(params)
  const roomIdRef = useRef<string>(roomId)

  // Room state
  const [room, setRoom] = useState<EvasionRoom | null>(null)
  const [participants, setParticipants] = useState<RoomParticipant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")

  // Chat state
  const [newMessage, setNewMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [showVideoControls, setShowVideoControls] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Video state
  const [videoUrl, setVideoUrl] = useState("")
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [showVideoDialog, setShowVideoDialog] = useState(false)

  // Add state for invite dialog and selected users
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isInviting, setIsInviting] = useState(false)

  // Add state for participants modal
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const handleGoHome = () => {
    window.location.href = "/"
  }

  const handleGoBackToEvasion = () => {
    window.location.href = "/evasion"
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    // Store roomId in ref to avoid dependency issues
    roomIdRef.current = roomId
  }, [roomId])

  useEffect(() => {
    if (!user || !roomIdRef.current) return

    console.log("🔄 Setting up room data and subscriptions for user:", user.id)

    const fetchData = async () => {
      await fetchRoomData()
    }

    fetchData()

    // Set up real-time subscription and store cleanup function
    const cleanup = setupRealtimeSubscription()

    // Set up YouTube iframe API message listener
    const handleYouTubeMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return

      try {
        const data = JSON.parse(event.data)
        if (data.event === "onReady") {
          console.log("🎬 YouTube player ready")
        }
      } catch (error) {
        // Ignore parsing errors for non-JSON messages
      }
    }

    window.addEventListener("message", handleYouTubeMessage)

    return () => {
      console.log("🧹 Cleaning up room subscriptions")
      // Cleanup subscriptions
      if (cleanup) {
        cleanup()
      }
      // Also cleanup any existing channels
      supabase.channel(`evasion_room_${roomIdRef.current}`).unsubscribe()
      // Remove YouTube message listener
      window.removeEventListener("message", handleYouTubeMessage)
    }
  }, [user])

  const fetchRoomData = async () => {
    try {
      setIsLoading(true)

      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from("evasion_rooms")
        .select("*")
        .eq("id", roomIdRef.current)

      if (roomError) {
        console.error("Error fetching room:", roomError.message)
        toast({
          title: "Error",
          description: roomError.message || "Room not found.",
          variant: "destructive",
        })
        return
      }

      if (!roomData || roomData.length === 0) {
        toast({
          title: "Error",
          description: "Room not found. The room may have been deleted or doesn't exist.",
          variant: "destructive",
        })
        // Redirect back to evasion page after a short delay
        setTimeout(() => {
          window.location.href = "/evasion"
        }, 2000)
        return
      }

      const room = roomData[0] // Get the first (and should be only) room
      setRoom(room)

      // Fetch participants (simple query)
      const { data: participantsData, error: participantsError } = await supabase
        .from("evasion_room_participants")
        .select("user_id, joined_at")
        .eq("room_id", roomIdRef.current)

      if (participantsError) {
        console.error("Error fetching participants:", participantsError.message)
        toast({
          title: "Warning",
          description: "Failed to load participants.",
          variant: "destructive",
        })
      } else if (participantsData) {
        // Fetch user profiles separately
        const userIds = participantsData.map((p: { user_id: string }) => p.user_id)
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("id, full_name, avatar_url")
            .in("id", userIds)

          const formattedParticipants = participantsData.map((p: { user_id: string; joined_at: string }) => {
            const profile = profiles?.find(
              (prof: { id: string; full_name: string; avatar_url?: string }) => prof.id === p.user_id,
            )
            return {
              id: p.user_id,
              name: profile?.full_name || "Unknown User",
              avatar_url: profile?.avatar_url,
            }
          })

          setParticipants(formattedParticipants)
        }
      }

      // Fetch chat messages (simple query)
      const { data: messagesData, error: messagesError } = await supabase
        .from("evasion_chat_messages")
        .select("id, content, created_at, user_id, message_type")
        .eq("room_id", roomIdRef.current)
        .order("created_at", { ascending: true })
        .limit(100)

      if (messagesError) {
        console.error("Error fetching messages:", messagesError.message)
        toast({
          title: "Warning",
          description: "Failed to load messages.",
          variant: "destructive",
        })
      } else if (messagesData) {
        // Fetch user profiles for messages (excluding system/AI messages)
        const regularUserIds = [
          ...new Set(
            messagesData
              .filter((m: { user_id: string }) => m.user_id !== "00000000-0000-0000-0000-000000000000")
              .map((m: { user_id: string }) => m.user_id),
          ),
        ]

        let profiles: any[] = []
        if (regularUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("user_profiles")
            .select("id, full_name, avatar_url")
            .in("id", regularUserIds)
          profiles = profilesData || []
        }

        const formattedMessages = messagesData.map(
          (msg: { id: string; content: string; user_id: string; created_at: string; message_type?: string }) => {
            let username = "Unknown User"
            let avatar_url = undefined

            // Handle system/AI messages differently
            if (msg.user_id === "00000000-0000-0000-0000-000000000000") {
              if (msg.message_type === "ai_response") {
                username = "Minato AI"
                avatar_url = "/minato-ai-avatar.png"
              } else {
                username = "System"
              }
            } else {
              // Regular user message
              const profile = profiles.find(
                (prof: { id: string; full_name: string; avatar_url?: string }) => prof.id === msg.user_id,
              )
              username = profile?.full_name || "Unknown User"
              avatar_url = profile?.avatar_url
            }

            return {
              id: msg.id,
              content: msg.content,
              user_id: msg.user_id,
              username: username,
              avatar_url: avatar_url,
              message_type: msg.message_type || "text",
              created_at: msg.created_at,
            }
          },
        )

        setMessages(formattedMessages)

        // Scroll to bottom after loading messages
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
          }
        }, 100)
      }
    } catch (error) {
      console.error("Error fetching room data:", error)
      toast({
        title: "Error",
        description: "Failed to load room data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update setupRealtimeSubscription function
  const setupRealtimeSubscription = () => {
    if (!roomIdRef.current) return

    console.log("🔄 Setting up realtime subscriptions for room:", roomIdRef.current)

    try {
      // Create a single channel for all subscriptions
      const channel = supabase.channel(`evasion_room_${roomIdRef.current}`)

      // Subscribe to chat messages
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "evasion_chat_messages",
          filter: `room_id=eq.${roomIdRef.current}`,
        },
        async (payload: any) => {
          console.log("📨 New chat message received:", payload)

          if (payload.new) {
            try {
              let username = "Unknown User"
              let avatar_url = undefined

              // Handle system/AI messages differently
              if (payload.new.user_id === "00000000-0000-0000-0000-000000000000") {
                // System or AI message
                if (payload.new.message_type === "ai_response") {
                  username = "Minato AI"
                  avatar_url = "/minato-ai-avatar.png" // You can add a Minato AI avatar
                } else {
                  username = "System"
                }
              } else {
                // Regular user message - fetch user profile
                const { data: profile } = await supabase
                  .from("user_profiles")
                  .select("full_name, avatar_url")
                  .eq("id", payload.new.user_id)
                  .single()

                username = profile?.full_name || "Unknown User"
                avatar_url = profile?.avatar_url
              }

              const newMessage: ChatMessage = {
                id: payload.new.id,
                content: payload.new.content,
                user_id: payload.new.user_id,
                username: username,
                avatar_url: avatar_url,
                message_type: payload.new.message_type || "text",
                created_at: payload.new.created_at,
              }

              console.log("📝 Adding new message to state:", newMessage)
              setMessages((prev) => [...prev, newMessage])

              // Auto-scroll to bottom
              setTimeout(() => {
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
                }
              }, 100)
            } catch (error) {
              console.error("❌ Error processing new message:", error)
            }
          }
        },
      )

      // Subscribe to room updates (for video changes)
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "evasion_rooms",
          filter: `id=eq.${roomIdRef.current}`,
        },
        (payload: any) => {
          console.log("📺 Room updated:", payload.new)
          if (payload.new) {
            setRoom((prevRoom) => {
              const newRoom = prevRoom
                ? {
                    ...prevRoom,
                    ...payload.new,
                  }
                : null
              console.log("📺 Room state updated:", newRoom)
              return newRoom
            })
          }
        },
      )

      // Subscribe to participants changes
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evasion_room_participants",
          filter: `room_id=eq.${roomIdRef.current}`,
        },
        () => {
          console.log("👥 Participants changed, refetching...")
          // Refetch participants when changes occur
          fetchParticipants()
        },
      )

      // Subscribe to the channel
      channel.subscribe((status: string) => {
        console.log("🔄 Channel subscription status:", status)
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to room updates")
          console.log("🧪 Real-time chat is now active - messages should appear instantly!")
        } else if (status === "CLOSED") {
          console.error("❌ Channel subscription closed - retrying in 2 seconds")
          setTimeout(() => setupRealtimeSubscription(), 2000)
        } else {
          console.error("❌ Failed to subscribe to channel:", status)
        }
      })

      // Store cleanup function
      return () => {
        console.log("🔌 Cleaning up realtime subscriptions")
        channel.unsubscribe()
      }
    } catch (error) {
      console.error("❌ Error setting up realtime subscriptions:", error)
      // Retry after 2 seconds
      setTimeout(() => setupRealtimeSubscription(), 2000)
    }
  }

  // Add helper function for fetching participants
  const fetchParticipants = async () => {
    if (!roomIdRef.current) return

    const { data: participantsData, error } = await supabase
      .from("evasion_room_participants")
      .select("user_id, joined_at")
      .eq("room_id", roomIdRef.current)

    if (!error && participantsData) {
      // Fetch user profiles separately
      const userIds = participantsData.map((p: { user_id: string }) => p.user_id)
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds)

        const formattedParticipants = participantsData.map((p: { user_id: string; joined_at: string }) => {
          const profile = profiles?.find(
            (prof: { id: string; full_name: string; avatar_url?: string }) => prof.id === p.user_id,
          )
          return {
            id: p.user_id,
            name: profile?.full_name || "Unknown User",
            avatar_url: profile?.avatar_url,
          }
        })

        setParticipants(formattedParticipants)
      }
    }
  }

  // Update handleSendMessage function
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !roomIdRef.current) return

    const messageContent = newMessage.trim()
    const isAIQuery =
      messageContent.toLowerCase().includes("@minato") ||
      messageContent.toLowerCase().includes("@ai") ||
      messageContent.toLowerCase().includes("explain") ||
      messageContent.toLowerCase().includes("what is") ||
      messageContent.toLowerCase().includes("how does") ||
      messageContent.toLowerCase().includes("tell me about")

    console.log("📤 Sending message:", {
      messageContent,
      roomId: roomIdRef.current,
      userId: user.id,
      isAIQuery,
      hasVideo: !!room?.current_video_url,
      videoUrl: room?.current_video_url,
    })

    try {
      // Send the user message first
      const { error } = await supabase.from("evasion_chat_messages").insert({
        room_id: roomIdRef.current,
        user_id: user.id,
        content: messageContent,
      })

      if (error) {
        console.error("❌ Error sending message:", error.message)
        toast({
          title: "Error",
          description: "Failed to send message.",
          variant: "destructive",
        })
      } else {
        console.log("✅ Message sent successfully")
        setNewMessage("")

        // If it's an AI query and there's a video loaded, trigger AI analysis
        if (isAIQuery && room?.current_video_url) {
          console.log("🤖 Triggering AI analysis for:", messageContent)
          try {
            const currentTime = Math.floor((Date.now() - (room.current_video_position || 0)) / 1000)
            const currentTimestamp = `${Math.floor(currentTime / 60)
              .toString()
              .padStart(2, "0")}:${(currentTime % 60).toString().padStart(2, "0")}`

            console.log("📡 Making API call to /api/evasion/video-analysis")
            const response = await fetch("/api/evasion/video-analysis", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                roomId: roomIdRef.current,
                question: messageContent,
                videoUrl: room.current_video_url,
                currentTimestamp: currentTimestamp,
              }),
            })

            console.log("📡 API response status:", response.status)
            if (!response.ok) {
              console.error("❌ AI analysis failed with status:", response.status)
              const errorText = await response.text()
              console.error("❌ Error details:", errorText)
            } else {
              console.log("✅ AI analysis request successful")
            }
          } catch (aiError) {
            console.error("❌ Error triggering AI analysis:", aiError)
          }
        } else {
          console.log("⚠️ AI analysis not triggered:", {
            isAIQuery,
            hasVideo: !!room?.current_video_url,
            videoUrl: room?.current_video_url,
          })
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateRoomName = async () => {
    if (!newRoomName.trim() || !room) return

    try {
      const { error } = await supabase
        .from("evasion_rooms")
        .update({ name: newRoomName.trim() })
        .eq("id", roomIdRef.current)

      if (error) {
        console.error("Error updating room name:", error)
        toast({
          title: "Error",
          description: "Failed to update room name.",
          variant: "destructive",
        })
      } else {
        setIsEditingName(false)
        toast({
          title: "Success",
          description: "Room name updated!",
        })
      }
    } catch (error) {
      console.error("Error updating room name:", error)
      toast({
        title: "Error",
        description: "Failed to update room name.",
        variant: "destructive",
      })
    }
  }

  const extractYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const handleLoadVideo = async () => {
    if (!videoUrl.trim()) return

    console.log("🎬 Loading video:", videoUrl)
    const videoId = extractYouTubeVideoId(videoUrl)
    if (!videoId) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL.",
        variant: "destructive",
      })
      return
    }

    console.log("🎬 Video ID extracted:", videoId)

    try {
      setIsLoadingVideo(true)
      const { error } = await supabase
        .from("evasion_rooms")
        .update({
          current_video_url: videoUrl.trim(),
          current_video_position: 0,
          is_playing: false,
        })
        .eq("id", roomIdRef.current)

      if (error) {
        console.error("Error loading video:", error)
        toast({
          title: "Error",
          description: "Failed to load video.",
          variant: "destructive",
        })
      } else {
        // Update local room state immediately
        console.log("🎬 Updating local room state with video URL:", videoUrl.trim())
        setRoom((prevRoom) =>
          prevRoom
            ? {
                ...prevRoom,
                current_video_url: videoUrl.trim(),
                current_video_position: 0,
                is_playing: false,
              }
            : null,
        )

        // Start video transcript processing
        try {
          const response = await fetch("/api/evasion/video-transcript", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roomId: roomIdRef.current,
              videoUrl: videoUrl.trim(),
            }),
          })

          if (response.ok) {
            console.log("Video transcript processing started")
          }
        } catch (transcriptError) {
          console.error("Error starting transcript processing:", transcriptError)
        }

        setShowVideoDialog(false)
        setVideoUrl("")
        toast({
          title: "Success",
          description: "Video loaded successfully! AI analysis is being prepared...",
        })
      }
    } catch (error) {
      console.error("Error loading video:", error)
      toast({
        title: "Error",
        description: "Failed to load video.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingVideo(false)
    }
  }

  const handleCopyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code)
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard.",
      })
    }
  }

  const isHost = user?.id === room?.host_user_id

  // Add handleInviteUsers function
  const handleInviteUsers = async () => {
    if (!selectedUsers.length) return

    try {
      setIsInviting(true)
      const response = await fetch("/api/evasion/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_id: roomId,
          invited_user_ids: selectedUsers.map((user) => user.id),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invites sent successfully!",
        })
        setShowInviteDialog(false)
        setSelectedUsers([])
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to send invites")
      }
    } catch (error) {
      console.error("Error sending invites:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invites",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  // Handle timestamp clicks
  const handleTimestampClick = (timestamp: string) => {
    const [minutes, seconds] = timestamp.split(":").map(Number)
    const totalSeconds = minutes * 60 + seconds

    console.log(`🎯 Seeking to ${timestamp} (${totalSeconds} seconds)`)

    // Find the YouTube iframe and seek to the timestamp
    const iframe = document.getElementById("youtube-player") as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      try {
        // Send message to YouTube iframe to seek to timestamp
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [totalSeconds, true],
          }),
          "*",
        )

        toast({
          title: "Timestamp Navigation",
          description: `Jumping to ${timestamp}`,
        })

        console.log(`✅ Sent seek command to YouTube iframe`)
      } catch (error) {
        console.error("❌ Error seeking video:", error)
        toast({
          title: "Error",
          description: "Failed to seek to timestamp",
          variant: "destructive",
        })
      }
    } else {
      console.error("❌ YouTube iframe not found or not ready")
      toast({
        title: "Error",
        description: "Video player not ready. Please wait a moment and try again.",
        variant: "destructive",
      })
    }
  }

  // Handle video click for mobile playback
  const handleVideoClick = () => {
    const iframe = document.getElementById("youtube-player") as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      try {
        // Set controls state
        setShowVideoControls(true)

        // Send message to YouTube iframe to play video
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "playVideo",
          }),
          "*",
        )

        // Force show controls
        setTimeout(() => {
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "setOption",
              args: ["controls", 1],
            }),
            "*",
          )
        }, 100)

        console.log(`✅ Sent play command and controls to YouTube iframe`)
      } catch (error) {
        console.error("❌ Error playing video:", error)
      }
    }
  }

  // Handle AI questions
  const handleAIQuestion = async (question: string) => {
    if (!room?.current_video_url) {
      toast({
        title: "No Video",
        description: "Please load a video first to ask questions about it.",
        variant: "destructive",
      })
      return
    }

    // Send the question as a message
    setNewMessage(question)
    // The handleSendMessage will detect it as an AI query and process it
  }

  // Render overlapping avatars component
  const renderOverlappingAvatars = () => {
    const maxVisible = 4
    const visibleParticipants = participants.slice(0, maxVisible)
    const remainingCount = participants.length - maxVisible

    return (
      <div className="flex items-center">
        <div className="flex -space-x-2 sm:-space-x-3">
          {visibleParticipants.map((participant, index) => (
            <Avatar
              key={participant.id}
              className="w-7 h-7 sm:w-9 sm:h-9 border-2 sm:border-3 border-white dark:border-gray-900 cursor-pointer hover:z-10 transition-all duration-200 hover:scale-110 shadow-lg"
              style={{ zIndex: maxVisible - index }}
              onClick={() => setShowParticipantsModal(true)}
            >
              <AvatarImage src={participant.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                {participant.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-2 sm:border-3 border-white dark:border-gray-900 flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-all duration-200 shadow-lg"
              style={{ zIndex: 0 }}
              onClick={() => setShowParticipantsModal(true)}
            >
              +{remainingCount}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] px-4">
          <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Authentication Required</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-center">
                <Button
                  onClick={handleGoHome}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Minato Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] px-4">
          <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4 mb-6">
                <div className="h-4 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full w-3/4"></div>
                <div className="h-4 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full w-1/2"></div>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={handleGoHome}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Minato Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)] px-4">
          <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Room Not Found</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-center">
                <Button
                  onClick={handleGoHome}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Minato Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header currentView={currentView} onViewChange={setCurrentView} />

      <ScrollArea className="h-[calc(100vh)]">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl pt-16 sm:pt-20">
          {/* Room Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 sm:mb-16">
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoBackToEvasion}
                      className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-all duration-200 p-2 sm:p-3 rounded-xl"
                    >
                      <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl">
                      <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditingName ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <Input
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            className="text-lg sm:text-2xl font-bold border-2 focus:border-indigo-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateRoomName()
                              if (e.key === "Escape") {
                                setIsEditingName(false)
                                setNewRoomName(room.name)
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateRoomName} className="bg-green-500 hover:bg-green-600">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingName(false)
                                setNewRoomName(room.name)
                              }}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                            {room.name}
                          </h1>
                          {isHost && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsEditingName(true)}
                              className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 flex-shrink-0"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all duration-200 px-2 sm:px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs"
                          onClick={handleCopyRoomCode}
                        >
                          <Copy className="w-3 h-3 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{room.room_code}</span>
                          <span className="sm:hidden">{room.room_code.substring(0, 6)}...</span>
                        </Badge>
                        <Badge variant="outline" className="border-purple-200 dark:border-purple-800 px-2 sm:px-3 py-1 text-xs">
                          <Users className="w-3 h-3 mr-1 sm:mr-2" />
                          {participants.length}/{room.max_participants}
                        </Badge>
                        {isHost && (
                          <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 sm:px-3 py-1 shadow-lg text-xs">
                            <Crown className="w-3 h-3 mr-1 sm:mr-2" />
                            Host
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    {isHost && (
                      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 text-xs sm:text-sm"
                          >
                            <Youtube className="w-4 h-4 mr-1 sm:mr-2 text-red-500" />
                            <span className="hidden sm:inline">Load Video</span>
                            <span className="sm:hidden">Video</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                              <Youtube className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                              Load YouTube Video
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Enter YouTube URL..."
                              value={videoUrl}
                              onChange={(e) => setVideoUrl(e.target.value)}
                              className="focus:ring-2 focus:ring-indigo-500 border-2"
                            />
                            <Button
                              onClick={handleLoadVideo}
                              disabled={isLoadingVideo}
                              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                              {isLoadingVideo ? "Loading..." : "Load Video"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(true)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 text-xs sm:text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-1 sm:mr-2 text-blue-500" />
                      <span className="hidden sm:inline">Invite</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Main Content - Video and Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4 sm:gap-8 mb-6 sm:mb-10">
            {/* Video Player */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 sm:space-y-6">
              <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl overflow-hidden">
                <CardContent className="p-0">
                  {room.current_video_url ? (
                    <div className="aspect-video overflow-hidden relative">
                      <iframe
                        id="youtube-player"
                        src={`https://www.youtube.com/embed/${extractYouTubeVideoId(room.current_video_url)}?enablejsapi=1&origin=${window.location.origin}&widget_referrer=${window.location.origin}&playsinline=1&rel=0&modestbranding=1&fs=1&autoplay=0&mute=0&controls=1&showinfo=1`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        frameBorder="0"
                        title="YouTube video player"
                        loading="lazy"
                      />
                      {/* Overlay pour améliorer l'interaction sur mobile */}
                      {!showVideoControls && (
                        <div className="absolute inset-0 pointer-events-none md:hidden">
                          <div className="absolute inset-0 bg-transparent pointer-events-auto" 
                               onClick={handleVideoClick}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video flex items-center justify-center text-muted-foreground bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 m-4 sm:m-8 rounded-xl sm:rounded-2xl">
                      <div className="text-center px-4">
                        <Video className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 text-indigo-400" />
                        <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">No video loaded</h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {isHost ? "Load a YouTube video to get started!" : "Waiting for host to load a video..."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Chat & Participants Sidebar */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 sm:space-y-6">
              {/* Chat Card */}
              <Card className="h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl overflow-hidden">
                {/* Fixed Chat Header */}
                <CardHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/20 dark:to-purple-900/20 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2 sm:gap-3 font-semibold">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      Chat
                    </CardTitle>
                    {participants.length > 0 && renderOverlappingAvatars()}
                  </div>
                </CardHeader>

                {/* Chat Content - Messages Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-gray-50/30 to-white/50 dark:from-gray-800/30 dark:to-gray-900/50">
                  {/* Scrollable Messages Area */}
                  <ScrollArea className="flex-1 px-3 sm:px-6 py-3 sm:py-4">
                    <div className="space-y-3 sm:space-y-4 pr-1 sm:pr-2">
                      <AnimatePresence>
                        {messages.map((message) => {
                          const isCurrentUser = message.user_id === user?.id
                          const isAI = message.message_type === "ai_response"

                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className={`flex gap-2 sm:gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                            >
                              {!isCurrentUser && (
                                <Avatar className="w-7 h-7 sm:w-9 sm:h-9 mt-1 shadow-lg flex-shrink-0 ring-2 ring-white dark:ring-gray-800">
                                  <AvatarImage src={message.avatar_url || "/placeholder.svg"} />
                                  <AvatarFallback
                                    className={`text-xs font-semibold ${isAI ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"} text-white`}
                                  >
                                    {message.username?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                              )}

                              <div
                                className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isCurrentUser ? "items-end" : "items-start"}`}
                              >
                                {!isCurrentUser && (
                                  <div className="flex items-center gap-1 sm:gap-2 mb-1 px-1">
                                    <span
                                      className={`text-xs sm:text-sm font-semibold ${isAI ? "" : "text-indigo-600 dark:text-indigo-400"}`}
                                    >
                                      {message.username || "Unknown"}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                )}

                                <div
                                  className={`
                                  relative px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg backdrop-blur-sm text-xs sm:text-sm
                                  ${
                                    isCurrentUser
                                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white ml-6 sm:ml-8"
                                      : isAI
                                        ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800"
                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mr-6 sm:mr-8"
                                  }
                                `}
                                >
                                  {/* Message bubble tail */}
                                  <div
                                    className={`
                                    absolute w-3 h-3 transform rotate-45
                                    ${
                                      isCurrentUser
                                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 -bottom-1 right-4"
                                        : isAI
                                          ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-r border-b border-emerald-200 dark:border-emerald-800 -bottom-1 left-4"
                                          : "bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 -bottom-1 left-4"
                                    }
                                  `}
                                  />

                                  {message.message_type === "ai_response" ? (
                                    <TimestampText text={message.content} onTimestampClick={handleTimestampClick} />
                                  ) : (
                                    <p className="break-words leading-relaxed">{message.content}</p>
                                  )}

                                  {isCurrentUser && (
                                    <span className="text-xs text-indigo-200 mt-1 block">
                                      {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isCurrentUser && (
                                <Avatar className="w-7 h-7 sm:w-8 sm:h-8 mt-1 shadow-lg flex-shrink-0 ring-2 ring-white dark:ring-gray-800">
                                  <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                                  <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                    {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Fixed Message Input */}
                  <div className="flex-shrink-0 p-2 sm:p-3 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="relative">
                        <textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          disabled={isSendingMessage}
                          className="w-full min-h-[60px] sm:min-h-[78px] max-h-72 resize-none rounded-xl sm:rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 pr-12 sm:pr-14 text-xs sm:text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-lg"
                          rows={1}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = "auto"
                            target.style.height = Math.min(target.scrollHeight, 112) + "px"
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={handleSendMessage}
                          disabled={isSendingMessage || !newMessage.trim()}
                          className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 h-7 w-7 p-0 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
                        >
                          <SendHorizontal className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* AI Assistant Button */}
                      {room?.current_video_url && (
                        <div className="flex justify-center">
                          <AIAssistantButton onAskQuestion={handleAIQuestion} isProcessing={isSendingMessage} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </ScrollArea>

      {/* Participants Modal */}
      <Dialog open={showParticipantsModal} onOpenChange={setShowParticipantsModal}>
        <DialogContent className="w-[95vw] max-w-md border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              Participants ({participants.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-80 sm:h-96">
            <div className="space-y-2 sm:space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 backdrop-blur-sm"
                >
                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shadow-lg ring-2 ring-white dark:ring-gray-800">
                    <AvatarImage src={participant.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                      {participant.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base truncate">
                      {participant.name || "Unknown"}
                    </span>
                    {participant.user_id === room.host_user_id && (
                      <Badge className="ml-2 sm:ml-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs shadow-lg">
                        <Crown className="w-3 h-3 mr-1" />
                        Host
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="w-[95vw] max-w-md border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              Invite Users
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <UserSelector
              selectedUsers={selectedUsers}
              onUsersChange={setSelectedUsers}
              maxUsers={room.max_participants - participants.length}
            />
            <Button
              onClick={handleInviteUsers}
              disabled={isInviting || selectedUsers.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isInviting ? "Sending Invites..." : "Send Invites"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
