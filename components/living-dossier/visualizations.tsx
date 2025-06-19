"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download, Share2, Maximize2, Minimize2 } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

// Import visualization libraries
import dynamic from "next/dynamic";

// Dynamically import visualization libraries to reduce initial bundle size
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// Interface for visualization data
export interface VisualizationData {
  type: "bar" | "line" | "area" | "pie" | "radar" | "scatter" | "heatmap" | "treemap";
  title: string;
  data: any;
  options?: any;
}

// Base visualization card component
export function VisualizationCard({
  children,
  title,
  description,
  className,
  allowFullscreen = true,
  allowDownload = true,
  allowShare = true,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  allowFullscreen?: boolean;
  allowDownload?: boolean;
  allowShare?: boolean;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      cardRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle download as image
  const downloadAsImage = () => {
    if (!cardRef.current) return;

    // Use html-to-image library or similar approach
    // For now, just show a message
    console.log("Download functionality would save visualization as image");
    alert("This would download the visualization as an image");
  };

  // Handle share
  const shareVisualization = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: description || "Check out this visualization",
        url: window.location.href,
      }).catch(err => console.error("Error sharing:", err));
    } else {
      // Fallback to copying link to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert("Link copied to clipboard!"))
        .catch(err => console.error("Error copying to clipboard:", err));
    }
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        "overflow-hidden transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "",
        className
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-medium text-lg">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {allowDownload && (
            <Button variant="ghost" size="icon" onClick={downloadAsImage} title="Download as image">
              <Download className="h-4 w-4" />
            </Button>
          )}
          {allowShare && (
            <Button variant="ghost" size="icon" onClick={shareVisualization} title="Share visualization">
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          {allowFullscreen && (
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className={cn(
          "p-4",
          isFullscreen ? "h-[calc(100vh-4rem)] flex items-center justify-center" : ""
        )}>
          {children}
        </div>
      </motion.div>
    </Card>
  );
} 