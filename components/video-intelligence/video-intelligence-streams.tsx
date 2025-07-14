'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Camera, Plus, Settings, Trash2, Play, Pause, Upload, MessageCircle } from 'lucide-react';
import { VideoUpload } from './video-upload';
import { VideoIntelligenceChat } from './video-intelligence-chat';
import { useToast } from '@/hooks/use-toast';

interface VideoStream {
  id: string;
  name: string;
  type: 'camera' | 'upload' | 'rtsp';
  status: 'active' | 'inactive' | 'processing' | 'error' | 'completed';
  url?: string;
  scenario: string;
  description?: string;
  created_at: string;
  metadata?: any;
}

interface VideoIntelligenceStreamsProps {
  streams: any[];
  onRefresh: () => void;
  onStreamUpdate: (stream: any) => void;
}

export function VideoIntelligenceStreams({ streams: initialStreams, onRefresh, onStreamUpdate }: VideoIntelligenceStreamsProps) {
  const [streams, setStreams] = useState<VideoStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStreamForChat, setSelectedStreamForChat] = useState<VideoStream | null>(null);
  const { toast } = useToast();

  const fetchStreams = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/video-intelligence/streams');
      if (response.ok) {
        const data = await response.json();
        setStreams(data.streams || []);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUploads = async () => {
    try {
      const response = await fetch('/api/video-intelligence/upload');
      if (response.ok) {
        const data = await response.json();
        return data.uploads || [];
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
    return [];
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const handleAddCamera = () => {
    // TODO: Implement camera stream addition
    console.log('Add camera stream');
    toast({
      title: "Coming Soon",
      description: "Camera stream addition will be available in the next update.",
    });
  };

  const handleUploadComplete = (streamId: string) => {
    // Refresh streams to show the new upload
    fetchStreams();
    onRefresh();
    toast({
      title: "Upload Complete",
      description: "Your video has been successfully uploaded and analyzed.",
    });
  };

  const handleDeleteStream = async (streamId: string) => {
    try {
      const response = await fetch(`/api/video-intelligence/streams/${streamId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setStreams(streams.filter(s => s.id !== streamId));
        onRefresh();
        toast({
          title: "Stream Deleted",
          description: "The video stream has been removed.",
        });
      }
    } catch (error) {
      console.error('Error deleting stream:', error);
      toast({
        title: "Error",
        description: "Failed to delete the stream. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStreamCard = (stream: VideoStream) => (
    <Card key={stream.id}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {stream.type === 'upload' ? (
                <Upload className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(stream.status)}`} />
            </div>
            <div>
              <CardTitle className="text-base">{stream.name}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stream.type.toUpperCase()} • {stream.scenario.replace('_', ' ')}
                {stream.metadata?.file_size && (
                  <span className="ml-2">• {formatFileSize(stream.metadata.file_size)}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(stream.status)}
                          {stream.status === 'completed' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedStreamForChat(stream)}
                  title="Chat with AI about this video"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {stream.type !== 'upload' && (
              <Button
                variant="outline"
                size="sm"
                disabled={stream.status === 'error'}
              >
                {stream.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {stream.description || 'No description'}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-700"
            onClick={() => handleDeleteStream(stream.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const cameraStreams = streams.filter(s => s.type === 'camera' || s.type === 'rtsp');
  const uploadedVideos = streams.filter(s => s.type === 'upload');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Live Streams
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Live Camera Streams</h3>
            <Button onClick={handleAddCamera} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </div>

          {cameraStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6">
                <Camera className="h-12 w-12 text-gray-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No Live Streams</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Connect your cameras to start real-time monitoring with AI-powered video intelligence
                </p>
              </div>
              <Button onClick={handleAddCamera} className="bg-lime-500 hover:bg-lime-600">
                <Camera className="h-4 w-4 mr-2" />
                Add Camera Stream
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {cameraStreams.map(renderStreamCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <VideoUpload onUploadComplete={handleUploadComplete} />
          
          {uploadedVideos.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Uploaded Videos</h3>
                <Button variant="outline" size="sm" onClick={fetchStreams} disabled={refreshing}>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
              <div className="grid gap-4">
                {uploadedVideos.map(renderStreamCard)}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Chat Modal */}
      {selectedStreamForChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
            <VideoIntelligenceChat
              streamId={selectedStreamForChat.id}
              streamName={selectedStreamForChat.name}
              streamStatus={selectedStreamForChat.status}
              onClose={() => setSelectedStreamForChat(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
} 