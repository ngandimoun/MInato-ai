"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Camera, AlertTriangle, Eye, Upload } from "lucide-react";

interface VideoIntelligenceMonitorProps {
  streams: any[];
  alerts: any[];
  onRefresh: () => void;
}

export function VideoIntelligenceMonitor({ streams, alerts, onRefresh }: VideoIntelligenceMonitorProps) {
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  if (streams.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No Video Streams</h3>
        <p className="text-muted-foreground mb-6">
          Connect your cameras to start monitoring with AI-powered video intelligence
        </p>
        <Button>
          <Camera className="h-4 w-4 mr-2" />
          Add Camera Stream
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live Monitoring</h2>
        <Button variant="outline" onClick={onRefresh}>
          <Eye className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {streams.map((stream) => (
          <Card key={stream.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{stream.name}</CardTitle>
                <Badge variant={stream.status === 'active' ? 'default' : 'secondary'}>
                  {stream.status}
                </Badge>
              </div>
              {stream.location && (
                <p className="text-sm text-muted-foreground">{stream.location}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video placeholder */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Live Feed</p>
                  <p className="text-xs text-muted-foreground">{stream.stream_type}</p>
                </div>
              </div>

              {/* Stream controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Upload className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stream.last_analysis_at ? 
                    `Last analyzed: ${new Date(stream.last_analysis_at).toLocaleTimeString()}` :
                    'No analysis yet'
                  }
                </div>
              </div>

              {/* Recent alerts for this stream */}
              {alerts.filter(alert => alert.stream_id === stream.id).slice(0, 2).map((alert) => (
                <div key={alert.id} className="flex items-center space-x-2 p-2 bg-muted rounded">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alert.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 