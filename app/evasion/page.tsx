// app/evasion/page.tsx
"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Users, Play, Search, Eye, Lock, Loader, Home } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/context/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Header } from "@/components/header"

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
  host_username?: string
  host_avatar_url?: string
  current_video_url?: string
  participant_count: number
  max_participants: number
  is_private: boolean
  room_code: string
  created_at: string
}

interface EvasionInvitation {
  id: string
  room_id: string
  room_name: string
  room_description?: string
  room_code: string
  is_private: boolean
  host_user_id: string
  host_username: string
  host_avatar_url?: string
  status: string
  created_at: string
  expires_at: string
}

export default function EvasionPage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [currentView, setCurrentView] = useState<View>("evasion")
  const [rooms, setRooms] = useState<EvasionRoom[]>([])
  const [invitations, setInvitations] = useState<EvasionInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)

  // Create room form state
  const [newRoom, setNewRoom] = useState({
    name: "",
    description: "",
    is_private: false,
    max_participants: 10,
  })

  useEffect(() => {
    if (user) {
      fetchRooms()
      fetchInvitations()
    }
  }, [user])

  // Refresh rooms when the page becomes visible (user comes back from room)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchRooms()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [user])

  const fetchRooms = async () => {
    try {
      setIsLoading(true)
      console.log("Fetching rooms...")
      const response = await fetch("/api/evasion/rooms")
      console.log("Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Rooms data:", data)
        setRooms(data.rooms || [])
      } else {
        const errorData = await response.json()
        console.error("API error:", errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to load rooms. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast({
        title: "Error",
        description: "Failed to load rooms. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      setIsLoadingInvitations(true)
      console.log("Fetching invitations...")
      const response = await fetch("/api/evasion/invitations")
      console.log("Invitations response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Invitations data:", data)
        setInvitations(data.invitations || [])
      } else {
        const errorData = await response.json()
        console.error("Invitations API error:", errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to load invitations. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching invitations:", error)
      toast({
        title: "Error",
        description: "Failed to load invitations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingInvitations(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingRoom(true)
    try {
      const response = await fetch("/api/evasion/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRoom),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: "Room created successfully!",
        })
        setShowCreateDialog(false)
        setNewRoom({ name: "", description: "", is_private: false, max_participants: 10 })
        window.location.href = `/evasion/room/${data.room.id}`
      } else {
        throw new Error("Failed to create room")
      }
    } catch (error) {
      console.error("Error creating room:", error)
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room code.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/evasion/rooms/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room_code: joinCode.toUpperCase() }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowJoinDialog(false)
        setJoinCode("")
        window.location.href = `/evasion/room/${data.room.id}`
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to join room")
      }
    } catch (error) {
      console.error("Error joining room:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join room. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleJoinRoomDirect = async (roomId: string) => {
    setJoiningRoomId(roomId)
    try {
      const response = await fetch(`/api/evasion/rooms/${roomId}/join`, {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Joining room...",
        })
        window.location.href = `/evasion/room/${roomId}`
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to join room")
      }
    } catch (error) {
      console.error("Error joining room:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join room. Please try again.",
        variant: "destructive",
      })
    } finally {
      setJoiningRoomId(null)
    }
  }

  const handleInvitationResponse = async (invitationId: string, action: "accept" | "decline") => {
    try {
      const response = await fetch("/api/evasion/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId, action }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message,
        })

        // Refresh invitations
        fetchInvitations()

        // If accepted, redirect to the room
        if (action === "accept") {
          const invitation = invitations.find((inv) => inv.id === invitationId)
          if (invitation) {
            window.location.href = `/evasion/room/${invitation.room_id}`
          }
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to respond to invitation. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error responding to invitation:", error)
      toast({
        title: "Error",
        description: "Failed to respond to invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredRooms = rooms.filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Card className="shadow-xl border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Authentication Required</CardTitle>
                <CardDescription className="text-base">
                  Please sign in to access Evasion and start watching videos together.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/"}
                  className="mt-4 border-2 hover:bg-muted/50 transition-all duration-300"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Minato Home
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Header currentView={currentView} onViewChange={setCurrentView} />

      <ScrollArea className="h-[calc(100vh)]">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Hero Section */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-8 pt-8">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                Evasion
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Watch YouTube videos together and chat with friends in real-time. Create your own room or join others for
              shared entertainment.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
          >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-8 text-base font-medium"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Room
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">Create New Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="room-name" className="text-sm font-medium">
                      Room Name
                    </Label>
                    <Input
                      id="room-name"
                      placeholder="Enter room name..."
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room-description" className="text-sm font-medium">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="room-description"
                      placeholder="What's this room about?"
                      value={newRoom.description}
                      onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="private-room" className="text-sm font-medium">
                      Private Room
                    </Label>
                    <Switch
                      id="private-room"
                      checked={newRoom.is_private}
                      onCheckedChange={(checked) => setNewRoom({ ...newRoom, is_private: checked })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-participants" className="text-sm font-medium">
                      Max Participants
                    </Label>
                    <Input
                      id="max-participants"
                      type="number"
                      min="2"
                      max="20"
                      value={newRoom.max_participants}
                      onChange={(e) =>
                        setNewRoom({ ...newRoom, max_participants: Number.parseInt(e.target.value) || 10 })
                      }
                      className="h-11"
                    />
                  </div>
                  <Button onClick={handleCreateRoom} disabled={isCreatingRoom} className="w-full h-11 text-base font-medium">
                    {isCreatingRoom ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                        Creating...
                      </>
                    ) : (
                      "Create Room"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 hover:bg-muted/50 shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-8 text-base font-medium bg-transparent"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Join with Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">Join Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="join-code" className="text-sm font-medium">
                      Room Code
                    </Label>
                    <Input
                      id="join-code"
                      placeholder="Enter 6-character code..."
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="h-11 text-center text-lg font-mono tracking-wider"
                    />
                  </div>
                  <Button onClick={handleJoinRoom} className="w-full h-11 text-base font-medium">
                    Join Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <div className="flex items-center gap-4 justify-center">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base shadow-sm border-2 focus:border-purple-300 transition-colors"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchRooms}
                disabled={isLoading}
                title="Refresh rooms"
                className="h-12 w-12 border-2 shadow-sm hover:bg-muted/50 bg-transparent"
              >
                <svg
                  className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>
            </div>
          </motion.div>

          {/* Invitations Section */}
          {invitations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-3">Room Invitations</h2>
                <p className="text-lg text-muted-foreground">You have pending invitations to join rooms</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invitations.map((invitation, index) => (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-2 border-orange-200 dark:border-orange-800 hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg flex items-center gap-2 truncate">
                              {invitation.is_private && (
                                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="truncate">{invitation.room_name}</span>
                            </CardTitle>
                            <CardDescription className="mt-2 line-clamp-2">
                              {invitation.room_description || "No description"}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-3 font-mono text-xs">
                            {invitation.room_code}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={invitation.host_avatar_url || "/placeholder.svg"} />
                              <AvatarFallback className="text-xs">
                                {invitation.host_username?.charAt(0).toUpperCase() || "H"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground truncate">
                              Invited by {invitation.host_username}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            onClick={() => handleInvitationResponse(invitation.id, "accept")}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-9"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInvitationResponse(invitation.id, "decline")}
                            className="flex-1 h-9"
                          >
                            Decline
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Rooms Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pb-8 mt-8"
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse bg-card/50">
                    <CardHeader className="pb-4">
                      <div className="h-5 bg-muted rounded-md w-3/4 mb-2"></div>
                      <div className="h-4 bg-muted rounded-md w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded-md w-full mb-3"></div>
                      <div className="h-4 bg-muted rounded-md w-2/3 mb-4"></div>
                      <div className="h-9 bg-muted rounded-md w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-muted/50 rounded-md flex items-center justify-center">
                  <Users className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">No rooms found</h3>
                <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery
                    ? "Try adjusting your search criteria."
                    : "Be the first to create a room and start watching together!"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    size="lg"
                    className="h-12 px-8 text-base font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Room
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredRooms.map((room, index) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-md transition-all duration-300 border-2 hover:border-purple-200 dark:hover:border-purple-800 bg-card/50 backdrop-blur-sm group">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg flex items-center gap-2 truncate group-hover:text-purple-600 transition-colors">
                                {room.is_private && <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                                <span className="truncate">{room.name}</span>
                              </CardTitle>
                              <CardDescription className="mt-2 line-clamp-2">
                                {room.description || "No description"}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="ml-3 font-mono text-xs">
                              {room.room_code}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span className="font-medium">
                                  {room.participant_count}/{room.max_participants}
                                </span>
                              </div>
                              {room.current_video_url && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Play className="w-4 h-4" />
                                  <span className="font-medium">Watching</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Avatar className="w-7 h-7">
                                <AvatarImage src={room.host_avatar_url || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">
                                  {room.host_username?.charAt(0).toUpperCase() || "H"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground truncate">
                                {room.host_username || "Host"}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleJoinRoomDirect(room.id)}
                              disabled={room.participant_count >= room.max_participants || joiningRoomId === room.id}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-9 px-4 ml-3"
                            >
                              {joiningRoomId === room.id ? (
                                <>
                                  <Loader className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" />
                                  Joining...
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Join
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  )
}
