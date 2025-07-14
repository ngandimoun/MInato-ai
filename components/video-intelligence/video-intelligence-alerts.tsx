"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VideoIntelligenceAlertsProps {
  alerts: any[];
  onRefresh: () => void;
  onAlertUpdate: (alertId: string, status: string) => void;
}

export function VideoIntelligenceAlerts({ alerts, onRefresh, onAlertUpdate }: VideoIntelligenceAlertsProps) {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const updateAlertStatus = async (alertId: string, status: string) => {
    try {
      const response = await fetch('/api/video-intelligence/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertId, status }),
      });

      if (response.ok) {
        onAlertUpdate(alertId, status);
      }
    } catch (error) {
      console.error('Error updating alert status:', error);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'critical_danger':
      case 'child_safety':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'fall_detected':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'intruder_alert':
        return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'destructive';
      case 'acknowledged':
        return 'default';
      case 'resolved':
        return 'default';
      case 'dismissed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-semibold mb-2">No Active Alerts</h3>
        <p className="text-muted-foreground">
          Your video intelligence system is monitoring all streams. No threats detected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Security Alerts</h2>
        <Button variant="outline" onClick={onRefresh}>
          <Eye className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`${alert.priority === 'critical' ? 'border-red-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getPriorityColor(alert.priority) as any}>
                      {alert.priority}
                    </Badge>
                    <Badge variant={getStatusColor(alert.status) as any}>
                      {alert.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{alert.message}</p>
                
                {alert.status === 'active' && (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAlertStatus(alert.id, 'resolved')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAlertStatus(alert.id, 'dismissed')}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                )}

                {alert.status === 'acknowledged' && (
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAlertStatus(alert.id, 'resolved')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  </div>
                )}

                {/* Alert details */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Alert Type: {alert.alert_type.replace('_', ' ')}</p>
                  <p>Stream ID: {alert.stream_id}</p>
                  {alert.acknowledged_at && (
                    <p>Acknowledged: {formatDistanceToNow(new Date(alert.acknowledged_at), { addSuffix: true })}</p>
                  )}
                  {alert.resolved_at && (
                    <p>Resolved: {formatDistanceToNow(new Date(alert.resolved_at), { addSuffix: true })}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 