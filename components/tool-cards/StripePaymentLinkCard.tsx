"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, ExternalLink, Copy, Check, DollarSign, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/memory-framework/config";
import { toast } from "@/components/ui/use-toast";

interface StripePaymentLinkData {
  result_type: "payment_link";
  source_api: "stripe";
  query: any;
  payment_link: {
    id: string;
    url: string;
    product: {
      id: string;
      name: string;
      description?: string;
    };
    price: {
      id: string;
      unit_amount: number;
      currency: string;
    };
    created: number;
    active: boolean;
    features?: {
      tax_collection?: boolean;
      promotion_codes?: boolean;
      pdf_invoices?: boolean;
      shipping_required?: boolean;
      quantity_adjustable?: boolean;
      inventory_tracking?: boolean;
    };
  } | null;
  error?: string;
  image_url?: string;
}

interface StripePaymentLinkCardProps { 
  data: StripePaymentLinkData; 
}

export function StripePaymentLinkCard({ data }: StripePaymentLinkCardProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!data) {
    return <p className="text-sm text-muted-foreground">No payment link data.</p>;
  }

  if (data.error || !data.payment_link) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <CreditCard className="h-5 w-5" />
            Payment Link Creation Failed
          </CardTitle>
          <CardDescription>
            {data.error || "An error occurred while creating the payment link."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { payment_link } = data;
  const formatPrice = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
      }).format(amount / 100);
    } catch (error) {
      return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(payment_link.url);
      setCopiedUrl(true);
      toast({
        title: "Payment link copied!",
        description: "The payment link has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedUrl(false), 2000);
      logger.debug(`[StripePaymentLinkCard] Payment link copied: ${payment_link.url}`);
    } catch (error) {
      logger.error('[StripePaymentLinkCard] Error copying to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy the payment link. Please try manually.",
        variant: "destructive",
      });
    }
  };

  const handleOpenLink = () => {
    window.open(payment_link.url, '_blank', 'noopener,noreferrer');
    logger.debug(`[StripePaymentLinkCard] Payment link opened: ${payment_link.url}`);
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Payment Link Created Successfully
        </CardTitle>
        <CardDescription>
          Your Stripe payment link is ready to share with customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Information */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                {payment_link.product.name}
              </h3>
              {payment_link.product.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {payment_link.product.description}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {formatPrice(payment_link.price.unit_amount, payment_link.price.currency)}
              </div>
              <p className="text-xs text-muted-foreground uppercase">
                {payment_link.price.currency}
              </p>
            </div>
          </div>
          
          {/* Display product image if available */}
          {data.query?.image_url && (
            <div className="mb-3 rounded-md overflow-hidden border border-border/40">
              <img 
                src={data.query.image_url} 
                alt={payment_link.product.name} 
                className="w-full h-auto max-h-48 object-cover"
              />
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {new Date(payment_link.created * 1000).toLocaleDateString()}
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              payment_link.active 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
            )}>
              {payment_link.active ? "Active" : "Inactive"}
            </div>
          </div>
        </div>

        {/* Payment Link Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Payment Link</p>
              <p className="text-xs text-muted-foreground truncate" title={payment_link.url}>
                {payment_link.url}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleCopyUrl}
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              disabled={copiedUrl}
            >
              {copiedUrl ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              onClick={handleOpenLink}
              size="sm"
              className="flex-1 gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Link
            </Button>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            <strong>Share this link</strong> with your customers to collect payments. 
            They'll be redirected to a secure Stripe checkout page.
          </p>
        </div>
        
        {/* Features */}
        {payment_link.features && Object.values(payment_link.features).some(v => v === true) && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Enabled Features</h4>
            <ul className="space-y-1">
              {payment_link.features.quantity_adjustable && (
                <li className="text-xs flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Quantity adjustment</span>
                </li>
              )}
              {payment_link.features.promotion_codes && (
                <li className="text-xs flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Promotion codes</span>
                </li>
              )}
              {payment_link.features.pdf_invoices && (
                <li className="text-xs flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Automatic PDF invoices</span>
                </li>
              )}
              {payment_link.features.tax_collection && (
                <li className="text-xs flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Tax collection</span>
                </li>
              )}
              {payment_link.features.shipping_required && (
                <li className="text-xs flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Shipping information collection</span>
                </li>
              )}
              {payment_link.features.inventory_tracking && (
                <li className="text-xs flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>Inventory tracking</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 