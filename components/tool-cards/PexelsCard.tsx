//components/tool-cards/PexelsCard.tsx
"use client";

import React, { useState } from 'react';
import { CachedImageList, CachedImage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image as ImageIconLucide, User, ExternalLink, Palette, Maximize2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'; // For lightbox
import { cn } from '@/lib/utils';

interface PexelsCardProps { data: CachedImageList; }

export function PexelsCard({ data }: PexelsCardProps) {
  const [selectedImage, setSelectedImage] = useState<CachedImage | null>(data?.images?.[0] || null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!data || !data.images || data.images.length === 0) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <ImageIconLucide className="h-5 w-5"/> Pexels Images
                </CardTitle>
                <CardDescription>{data?.query?.query ? `No results for "${data.query.query}"` : "No images found."}</CardDescription>
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
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <ImageIconLucide className="h-5 w-5 text-primary"/>
            Pexels Images: <span className="font-normal text-muted-foreground text-sm line-clamp-1">"{data.query?.query || "Featured"}"</span>
        </CardTitle>
        <CardDescription>
            Found {data.images.length} high-quality image(s). Click a thumbnail to view larger.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {selectedImage && (
          <motion.div 
            key={selectedImage.id} // Animate when selectedImage changes
            initial={{ opacity: 0.8, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3 group"
          >
            <div 
              className="aspect-video relative w-full bg-muted rounded-lg overflow-hidden border"
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
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              {data.images.map(img => (
                <button
                  key={img.id}
                  onClick={() => handleSelectImage(img)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    selectedImage?.id === img.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50 opacity-70 hover:opacity-100"
                  )}
                  style={img.avgColor ? { backgroundColor: img.avgColor } : {}}
                  title={img.title || `Pexels Photo ${img.id}`}
                >
                  <img src={img.imageUrlSmall} alt={img.title || `Thumbnail ${img.id}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {data.error && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertCircle size={14}/> {data.error}</p>}
      </CardContent>
      {selectedImage?.sourceUrl && (
        <CardFooter className="pt-2 border-t">
            <Button variant="link" size="sm" asChild className="text-xs">
                <a href={selectedImage.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                    <ExternalLink className="mr-1.5 h-3 w-3"/> View on Pexels
                </a>
            </Button>
        </CardFooter>
      )}

      {selectedImage && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
            <DialogContent className="max-w-3xl p-2 sm:p-4 aspect-video flex items-center justify-center bg-black/90 border-none">
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