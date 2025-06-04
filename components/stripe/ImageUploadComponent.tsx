"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Upload, ExternalLink, ImageIcon, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from '@/memory-framework/config';

interface ImageUploadComponentProps {
  onImageUploaded: (imageUrl: string) => void;
  onCancel: () => void;
}

export function ImageUploadComponent({ onImageUploaded, onCancel }: ImageUploadComponentProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) {
      setUploadError('Please enter a valid image URL');
      return;
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      setUploadError('URL must start with http:// or https://');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // Validate the image URL by trying to load it
    const img = new Image();
    img.onload = () => {
      setIsUploading(false);
      setUploadedImageUrl(imageUrl);
      setPreviewUrl(imageUrl);
      logger.info(`[ImageUploadComponent] Valid image URL provided: ${imageUrl}`);
    };
    img.onerror = () => {
      setIsUploading(false);
      setUploadError('Invalid image URL or image not accessible');
      logger.error(`[ImageUploadComponent] Invalid image URL: ${imageUrl}`);
    };
    img.src = imageUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create a temporary preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // In a real implementation, you would upload the file to your server or cloud storage
      // For this example, we'll simulate an upload delay and then use a data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTimeout(() => {
            // This is a simulation - in a real app you'd get a URL from your server
            const uploadedUrl = event.target!.result as string;
            setUploadedImageUrl(uploadedUrl);
            setIsUploading(false);
            logger.info(`[ImageUploadComponent] Image file processed successfully`);
          }, 1000);
        }
      };
      reader.onerror = () => {
        setUploadError('Error reading the file');
        setIsUploading(false);
        logger.error(`[ImageUploadComponent] Error reading file`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadError('Error uploading the image');
      setIsUploading(false);
      logger.error(`[ImageUploadComponent] Error in file upload process:`, error);
    }
  };

  const handleConfirm = () => {
    if (uploadedImageUrl) {
      onImageUploaded(uploadedImageUrl);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Add Product Image
        </CardTitle>
        <CardDescription>
          Upload an image for your product to increase conversion rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="url">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">Image URL</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4 p-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/product-image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={isUploading}
              />
              <Button 
                onClick={handleUrlSubmit} 
                disabled={isUploading || !imageUrl.trim()}
                variant="secondary"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the URL of an existing image (must be publicly accessible)
            </p>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4 p-4">
            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop or click to upload</p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, GIF, WEBP (max 5MB)
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Select File
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {uploadError && (
          <Alert variant="destructive">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {isUploading && (
          <div className="text-center py-4">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary animate-bounce" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Processing image...</p>
            </div>
          </div>
        )}

        {previewUrl && !isUploading && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Image Preview:</p>
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full max-h-64 object-contain bg-black/5"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                onClick={() => {
                  setPreviewUrl(null);
                  setUploadedImageUrl(null);
                  setImageUrl('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={!uploadedImageUrl || isUploading}
        >
          Confirm Image
        </Button>
      </CardFooter>
    </Card>
  );
} 