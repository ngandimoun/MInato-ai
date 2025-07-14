"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export function VideoIntelligenceSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Video Intelligence Settings</h2>

      <div className="text-center py-12">
        <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Settings Configuration</h3>
        <p className="text-muted-foreground">
          Configure your video intelligence preferences and alert settings
        </p>
      </div>
    </div>
  );
} 