import React from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CreationHubLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md bg-background/80 border-b border-border h-14" />
      
      <main className="pt-14">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="relative">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            {/* Tabs skeleton */}
            <div className="flex space-x-4 mb-6">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>

            {/* Content skeleton */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                
                <div className="flex justify-center">
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>

            {/* Gallery skeleton */}
            <div className="mt-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                  >
                    <Skeleton className="aspect-square w-full" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 