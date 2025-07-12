//components/listening/recording-skeleton.tsx
'use client'
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface RecordingSkeletonProps {
  className?: string;
}

export function RecordingSkeleton({ className }: RecordingSkeletonProps) {
  return (
    <Card className={cn("w-full h-[600px]", className)}>
      <CardHeader className="pb-4 space-y-2">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex mt-3 items-center space-x-2">
          <Skeleton className="h-9 w-24" />
          <div className="flex-1 flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <div className="space-y-4">
          <div className="flex space-x-1">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-10 w-1/4" />
          </div>
          
          <div className="space-y-4 pt-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            
            <Skeleton className="h-6 w-1/3" />
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            
            <Skeleton className="h-6 w-1/3" />
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 