"use client";

import React, { useEffect, useState } from 'react';
import { StripeImageUploader } from '@/components/stripe/StripeImageUploader';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/memory-framework/config';

interface StripeImageUploadHandlerProps {
  toolId: string;
  queryData: any;
  onResult: (result: { action: string; toolId: string; data: any }) => void;
}

export function StripeImageUploadHandler({ toolId, queryData, onResult }: StripeImageUploadHandlerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle any errors in the query data
  useEffect(() => {
    if (queryData?.error) {
      toast({
        title: "Image Upload Error",
        description: queryData.error,
        variant: "destructive",
      });
      setIsVisible(false);
      onResult({
        action: 'complete',
        toolId,
        data: {
          ...queryData,
          image_url: null,
        },
      });
    }
  }, [queryData, toolId, onResult]);

  const handleImageUploaded = (imageUrl: string) => {
    logger.info(`[StripeImageUploadHandler] Image uploaded: ${imageUrl.substring(0, 30)}...`);
    
    // Update the tool with the uploaded image URL
    onResult({
      action: 'update',
      toolId,
      data: {
        ...queryData,
        image_url: imageUrl,
      },
    });
  };

  const handleComplete = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    logger.info(`[StripeImageUploadHandler] Image upload process completed`);
    
    setTimeout(() => {
      setIsVisible(false);
      
      // Create the appropriate result data
      let resultData = { ...queryData };
      
      // Update the next_step to indicate we're ready to create the link
      if (resultData.next_step === 'upload_image') {
        resultData.next_step = 'ready_to_create';
      }
      
      // Complete the tool execution with the updated data
      onResult({
        action: 'complete',
        toolId,
        data: resultData,
      });
      
      setIsProcessing(false);
    }, 500); // Short delay to avoid UI flickering
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-4 mt-2">
      <StripeImageUploader
        onImageUploaded={handleImageUploaded}
        onComplete={handleComplete}
      />
    </div>
  );
} 