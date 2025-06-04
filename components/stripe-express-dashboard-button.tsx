"use client";

import { useState } from "react";
import { logger } from "@/memory-framework/config";
import { ExternalLink, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface StripeExpressDashboardButtonProps {
  connectedAccountId?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function StripeExpressDashboardButton({ 
  connectedAccountId,
  variant = "outline",
  size = "default",
  className = "",
  children
}: StripeExpressDashboardButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenExpressDashboard = async () => {
    if (!connectedAccountId) {
      toast({
        title: "Error",
        description: "No Stripe account found. Please complete seller onboarding first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/stripe/create-express-dashboard-login-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectedAccountId: connectedAccountId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create dashboard login link');
      }
      
      const data = await response.json();
      
      if (data.url) {
        // Open the Stripe Express Dashboard in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Success",
          description: "Opening your Stripe Express Dashboard in a new tab.",
        });
      } else {
        throw new Error('No dashboard URL received');
      }
      
    } catch (error: any) {
      logger.error('[StripeExpressDashboardButton] Error opening Express Dashboard:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open Stripe Express Dashboard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
      onClick={handleOpenExpressDashboard}
      disabled={isLoading || !connectedAccountId}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening Dashboard...
        </>
      ) : (
        <>
          {children || (
            <>
              <Store className="h-4 w-4" />
              Open Stripe Express Dashboard
              <ExternalLink className="h-4 w-4" />
            </>
          )}
        </>
      )}
    </Button>
  );
} 