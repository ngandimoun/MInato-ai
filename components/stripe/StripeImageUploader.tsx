"use client";

import React, { useState } from 'react';
import { ImageUploadComponent } from './ImageUploadComponent';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, X, Plus, Check, Forward } from "lucide-react";
import { logger } from '@/memory-framework/config';

interface StripeImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  onComplete: () => void;
}

export function StripeImageUploader({ onImageUploaded, onComplete }: StripeImageUploaderProps) {
  const [showUploader, setShowUploader] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleImageUploaded = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
    setShowUploader(false);
    onImageUploaded(imageUrl);
    logger.info(`[StripeImageUploader] Image URL set: ${imageUrl.substring(0, 30)}...`);
  };

  const handleRemoveImage = () => {
    setUploadedImageUrl(null);
    logger.info(`[StripeImageUploader] Image removed`);
  };

  const handleComplete = () => {
    onComplete();
    logger.info(`[StripeImageUploader] Process completed`);
  };

  if (showUploader) {
    return (
      <ImageUploadComponent 
        onImageUploaded={handleImageUploaded}
        onCancel={() => setShowUploader(false)}
      />
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Add Product Image
        </CardTitle>
        <CardDescription>
          Adding a product image can increase conversion rates by up to 40%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadedImageUrl ? (
          <div className="relative">
            <img 
              src={uploadedImageUrl}
              alt="Product" 
              className="w-full max-h-80 object-contain border rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3" />
                Image Ready
              </Badge>
              <p className="text-sm text-muted-foreground">
                Your product image has been uploaded successfully
              </p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="bg-muted/50 h-16 w-16 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No image selected yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Upload a product image to help customers recognize your product and increase trust
            </p>
            <Button onClick={() => setShowUploader(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Select Image
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleComplete}>
          Skip
        </Button>
        <Button 
          onClick={handleComplete}
          disabled={!uploadedImageUrl}
          className="gap-2"
        >
          <Forward className="h-4 w-4" />
          {uploadedImageUrl ? 'Continue with Image' : 'Continue'}
        </Button>
      </CardFooter>
    </Card>
  );
} 