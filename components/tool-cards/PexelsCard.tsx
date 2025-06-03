//components/tool-cards/PexelsCard.tsx
"use client";

import React, { useState } from 'react';
import { CachedImageList, CachedImage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image as ImageIconLucide, User, ExternalLink, Palette, Maximize2, ChevronLeft, ChevronRight, AlertCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'; // For lightbox
import { cn } from '@/lib/utils';

interface PexelsCardProps { data: CachedImageList; }

export function PexelsCard({ data }: PexelsCardProps) {
  const [selectedImage, setSelectedImage] = useState<CachedImage | null>(data?.images?.[0] || null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!data || !data.images || data.images.length === 0) {
    return (
        <Card className="w-full glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="flex items-center"
                    >
                      <ImageIconLucide className="h-5 w-5 text-cyan-500 mr-1"/> 
                      <Sparkles className="h-3 w-3 text-cyan-400" />
                    </motion.div>
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Pexels Images
                    </motion.span>
                </CardTitle>
                <CardDescription className="flex items-center text-xs">
                  <span className="font-medium">{data?.query?.query ? `No results for "${data.query.query}"` : "No images found."}</span>
                </CardDescription>
            </CardHeader>
            {data?.error && 
                <CardContent>
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle size={14}/> {data.error}</p>
                </CardContent>
            }
        </Card>
    );
  }

  const handleSelectImage = (image: CachedImage) => {
    setSelectedImage(image);
  };

  const openLightbox = (image: CachedImage) => {
    setSelectedImage(image); // Ensure this is the image for the lightbox
    setIsLightboxOpen(true);
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
    if (!selectedImage) return;
    const currentIndex = data.images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (direction === 'next') {
        nextIndex = (currentIndex + 1) % data.images.length;
    } else {
        nextIndex = (currentIndex - 1 + data.images.length) % data.images.length;
    }
    setSelectedImage(data.images[nextIndex]);
  };


  return (
    <Card className="w-full overflow-hidden glass-card">
      {/* Card accent */}
      <span className="card-accent-left from-cyan-500/20 to-cyan-400/10" />
      <span className="card-accent-top from-cyan-500/20 to-cyan-400/10" />
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center"
            >
              <ImageIconLucide className="h-5 w-5 text-cyan-500 mr-1"/> 
              <Sparkles className="h-3 w-3 text-cyan-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row sm:items-center sm:gap-2"
            >
              <span>Pexels Images</span>
              <span className="text-muted-foreground text-sm line-clamp-1 font-normal">"{data.query?.query || "Featured"}"</span>
            </motion.div>
        </CardTitle>
        <CardDescription className="flex items-center text-xs">
          <span className="font-medium">Found {data.images.length} high-quality images</span>
          <span className="mx-1.5">•</span>
          <span className="italic">Click to view larger</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        {selectedImage && (
          <motion.div 
            key={selectedImage.id} // Animate when selectedImage changes
            initial={{ opacity: 0.8, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3 group"
          >
            <div 
              className="aspect-video relative w-full bg-muted rounded-lg overflow-hidden border border-border/40 minato-glow"
              style={selectedImage.avgColor ? { backgroundColor: selectedImage.avgColor } : {}}
            >
              <img 
                src={selectedImage.imageUrlRegular} 
                alt={selectedImage.title || `Pexels Image ${selectedImage.id}`} 
                className="w-full h-full object-contain"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-7 w-7 bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
                onClick={() => openLightbox(selectedImage)}
                title="View larger"
              >
                <Maximize2 size={16} />
              </Button>
            </div>
            <div className="mt-1.5 text-xs">
              {selectedImage.title && <p className="font-medium text-foreground line-clamp-1" title={selectedImage.title}>{selectedImage.title}</p>}
              {selectedImage.photographerName && (
                <a href={selectedImage.photographerUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1 w-fit">
                  <User size={12}/> {selectedImage.photographerName}
                </a>
              )}
            </div>
          </motion.div>
        )}

        {data.images.length > 1 && (
          <ScrollArea className="w-full custom-scrollbar">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-2 pb-1"
            >
              {data.images.map((img, index) => (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + (index * 0.05) }}
                  key={img.id}
                  onClick={() => handleSelectImage(img)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    selectedImage?.id === img.id ? "border-cyan-400 ring-1 ring-cyan-400" : "border-border hover:border-cyan-400/50 opacity-70 hover:opacity-100"
                  )}
                  style={img.avgColor ? { backgroundColor: img.avgColor } : {}}
                  title={img.title || `Pexels Photo ${img.id}`}
                >
                  <img src={img.imageUrlSmall} alt={img.title || `Thumbnail ${img.id}`} className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </motion.div>
          </ScrollArea>
        )}
        
        {data.error && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertCircle size={14}/> {data.error}</p>}
      </CardContent>
      {selectedImage?.sourceUrl && (
        <CardFooter className="pt-2 pb-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-[11px] opacity-70">Photo from Pexels</span>
              <Button variant="outline" size="sm" asChild className="text-xs h-7">
                  <a href={selectedImage.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ExternalLink className="mr-1.5 h-3 w-3"/> View original
                  </a>
              </Button>
            </div>
        </CardFooter>
      )}

      {selectedImage && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
            <DialogContent className="max-w-4xl p-2 sm:p-4 aspect-video flex items-center justify-center bg-black/90 border-none">
                <img src={selectedImage.imageUrlFull || selectedImage.imageUrlRegular} alt={selectedImage.title || `Pexels Image ${selectedImage.id}`} className="max-w-full max-h-[90vh] object-contain rounded-md"/>
                {data.images.length > 1 && (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => navigateLightbox('prev')} className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 text-white bg-black/30 hover:bg-black/50"> <ChevronLeft/> </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigateLightbox('next')} className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-white bg-black/30 hover:bg-black/50"> <ChevronRight/> </Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}