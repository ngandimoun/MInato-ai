"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Camera, 
  AlertTriangle, 
  Settings, 
  Play, 
  Pause, 
  Eye, 
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Plus,
  Activity,
  Users,
  MapPin,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { VideoIntelligenceMonitor } from "./video-intelligence-monitor";
import { VideoIntelligenceAlerts } from "./video-intelligence-alerts";
import { VideoIntelligenceSettings } from "./video-intelligence-settings";
import { VideoIntelligenceStreams } from "./video-intelligence-streams";

interface VideoIntelligenceStream {
  id: string;
  name: string;
  description?: string;
  stream_type: 'camera' | 'upload' | 'rtsp' | 'file';
  stream_url?: string;
  status: 'active' | 'inactive' | 'error';
  location?: string;
  zone_definitions: any[];
  created_at: string;
  updated_at: string;
  last_analysis_at?: string;
}

interface VideoIntelligenceAlert {
  id: string;
  alert_type: 'critical_danger' | 'intruder_alert' | 'fall_detected' | 'child_safety' | 'behavior_anomaly' | 'zone_violation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
  stream_id: string;
}

export function VideoIntelligencePanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"monitor" | "alerts" | "streams" | "settings">("monitor");
  const [streams, setStreams] = useState<VideoIntelligenceStream[]>([]);
  const [alerts, setAlerts] = useState<VideoIntelligenceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'active' | 'inactive' | 'error'>('active');
  
  // Fetch streams
  const fetchStreams = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/video-intelligence/streams');
      const data = await response.json();
      
      if (data.success) {
        setStreams(data.streams);
      } else {
        throw new Error(data.error || 'Failed to fetch streams');
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast({
        title: "Error",
        description: "Failed to load video streams",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/video-intelligence/alerts?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.alerts);
      } else {
        throw new Error(data.error || 'Failed to fetch alerts');
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load alerts",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      await Promise.all([fetchStreams(), fetchAlerts()]);
      setIsLoading(false);
    };

    initializeData();
  }, [user, fetchStreams, fetchAlerts]);

  // Real-time updates (simplified - in production, use WebSocket or Server-Sent Events)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000); // Check for new alerts every 30 seconds

    return () => clearInterval(interval);
  }, [user, fetchAlerts]);

  // Get system statistics
  const getSystemStats = () => {
    const activeStreams = streams.filter(s => s.status === 'active').length;
    const criticalAlerts = alerts.filter(a => a.priority === 'critical' && a.status === 'active').length;
    const totalAlerts = alerts.filter(a => a.status === 'active').length;
    
    return {
      activeStreams,
      criticalAlerts,
      totalAlerts,
      systemStatus: criticalAlerts > 0 ? 'critical' : totalAlerts > 0 ? 'warning' : 'normal'
    };
  };

  const stats = getSystemStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading Video Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Shield className="h-8 w-8 text-primary" />
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              stats.systemStatus === 'critical' ? 'bg-red-500' :
              stats.systemStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Video Intelligence</h1>
            <p className="text-muted-foreground">AI-powered video surveillance and threat detection</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={stats.systemStatus === 'critical' ? 'destructive' : 
                        stats.systemStatus === 'warning' ? 'secondary' : 'default'}>
            {stats.systemStatus === 'critical' ? 'Critical Alerts' :
             stats.systemStatus === 'warning' ? 'Active Alerts' : 'All Clear'}
          </Badge>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active Streams</p>
                <p className="text-2xl font-bold">{stats.activeStreams}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Total Alerts</p>
                <p className="text-2xl font-bold">{stats.totalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">System Status</p>
                <p className="text-sm font-semibold capitalize">{stats.systemStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Monitor
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {stats.totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {stats.totalAlerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="streams" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Streams
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="mt-6">
          <VideoIntelligenceMonitor 
            streams={streams}
            alerts={alerts}
            onRefresh={() => {
              fetchStreams();
              fetchAlerts();
            }}
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <VideoIntelligenceAlerts
            alerts={alerts}
            onRefresh={fetchAlerts}
            onAlertUpdate={(alertId, status) => {
              // Update alert status
              setAlerts(prev => prev.map(alert => 
                alert.id === alertId ? { ...alert, status } : alert
              ));
            }}
          />
        </TabsContent>

        <TabsContent value="streams" className="mt-6">
          <VideoIntelligenceStreams
            streams={streams}
            onRefresh={fetchStreams}
            onStreamUpdate={(updatedStream) => {
              setStreams(prev => prev.map(stream => 
                stream.id === updatedStream.id ? updatedStream : stream
              ));
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <VideoIntelligenceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
} 