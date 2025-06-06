// components/payment-links-list.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/memory-framework/config";
import { 
  Loader2, 
  Plus, 
  ExternalLink, 
  MoreHorizontal, 
  Link as LinkIcon,
  Trash2, // Peut-être plus utilisé si on garde que archive, à vérifier
  Copy,
  Check, // Nouvelle icône pour l'animation de copie
  QrCode,
  Eye,
  EyeOff,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import QRCode from 'qrcode';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Ajout pour le scroll Shadcn

interface PaymentLink {
  id: string;
  product_name: string;
  description: string | null;
  price: number;
  currency: string;
  payment_link_url: string;
  active: boolean;
  created_at: string;
  stripe_payment_link_id?: string;
  image_urls?: string[];
  features?: {
    tax_collection?: boolean;
    promotion_codes?: boolean;
    pdf_invoices?: boolean;
    shipping_required?: boolean;
    quantity_adjustable?: boolean;
    inventory_tracking?: boolean;
  };
}

// Hauteur fixe pour le composant principal (ajustez au besoin)
const FIXED_COMPONENT_HEIGHT = "h-[calc(100vh-120px)]"; // Exemple: hauteur de la fenêtre moins 120px pour un éventuel header/footer de page

export function PaymentLinksList() {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); 
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const router = useRouter();

  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false); // Nouvel état pour le bouton Create Payment Link

  // Fetch payment links
  useEffect(() => {
    const fetchPaymentLinks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/seller/payment-links');
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment links');
        }
        
        const data = await response.json();
        setPaymentLinks(data.paymentLinks || []);
      } catch (error) {
        logger.error('[PaymentLinksList] Error fetching payment links:', error);
        toast({
          title: "Error",
          description: "Failed to load your payment links. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPaymentLinks();
  }, []);

  const handleCreatePaymentLink = () => {
    setIsCreatingLink(true); // Active l'état de chargement
    // La navigation va démonter le composant, donc l'état isCreatingLink
    // sera naturellement réinitialisé. Pas besoin de le remettre à false ici.
    router.push('/dashboard/create-payment-link');
  };

  const handleCopyLink = (linkId: string, url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopiedLinkId(linkId);
        toast({
          title: "Link Copied!",
          description: "Payment link copied to clipboard.",
        });
        setTimeout(() => {
          setCopiedLinkId(null);
        }, 2000);
      })
      .catch(err => {
        logger.error('[PaymentLinksList] Error copying to clipboard:', err);
        toast({
          title: "Error",
          description: "Failed to copy link. Please try manually.",
          variant: "destructive",
        });
      });
  };

  const handleViewQRCode = async (link: PaymentLink) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(link.payment_link_url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
      setSelectedLink(link);
      setQrCodeDialogOpen(true);
    } catch (error) {
      logger.error('[PaymentLinksList] Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeUrl || !selectedLink) return;
    
    const link = document.createElement('a');
    link.download = `${selectedLink.product_name}-qr-code.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleToggleStatus = async (link: PaymentLink) => {
    if (!link.stripe_payment_link_id) {
      toast({
        title: "Error",
        description: "Cannot update status: Stripe payment link ID not found.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingStatus(link.id);
      
      const response = await fetch('/api/stripe/update-payment-link-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripePaymentLinkId: link.stripe_payment_link_id,
          active: !link.active
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment link status');
      }
      
      setPaymentLinks(prevLinks => 
        prevLinks.map(l => 
          l.id === link.id ? { ...l, active: !l.active } : l
        )
      );
      
      toast({
        title: "Success",
        description: `Payment link ${!link.active ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error: any) {
      logger.error('[PaymentLinksList] Error updating payment link status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update payment link status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleArchiveLink = async (link: PaymentLink) => {
    setSelectedLink(link);
    setArchiveDialogOpen(true);
  };

  const confirmArchiveLink = async () => {
    if (!selectedLink) return;

    try {
      setIsArchiving(selectedLink.id);
      
      const response = await fetch('/api/seller/archive-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          minatoPaymentLinkId: selectedLink.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive payment link');
      }
      
      setPaymentLinks(prevLinks => 
        prevLinks.filter(l => l.id !== selectedLink.id)
      );
      
      toast({
        title: "Success",
        description: "Payment link archived successfully.",
      });
    } catch (error: any) {
      logger.error('[PaymentLinksList] Error archiving payment link:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to archive payment link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(null);
      setArchiveDialogOpen(false);
      setSelectedLink(null);
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      setIsDeleting(id);
      const response = await fetch(`/api/seller/payment-links/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete payment link');
      }
      setPaymentLinks(prevLinks => 
        prevLinks.map(link => 
          link.id === id ? { ...link, active: false } : link
        )
      );
      toast({
        title: "Success",
        description: "Payment link deactivated successfully.",
      });
    } catch (error) {
      logger.error('[PaymentLinksList] Error deleting payment link:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className={`flex flex-col ${FIXED_COMPONENT_HEIGHT} bg-card border rounded-lg overflow-hidden`}>
      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70 mr-2" />
          <p>Loading payment links...</p>
        </div>
      ) : paymentLinks.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
          <p className="text-muted-foreground mb-4">You don't have any payment links yet.</p>
          <Button 
            onClick={handleCreatePaymentLink} 
            className="gap-2"
            disabled={isCreatingLink} // Désactive le bouton pendant le chargement
          >
            {isCreatingLink ? (
              <Loader2 className="h-4 w-4 animate-spin" /> // Icône de chargement
            ) : (
              <Plus className="h-4 w-4" /> // Icône Plus
            )}
            {isCreatingLink ? "Loading..." : "Create Payment Link"} {/* Texte conditionnel */}
          </Button>
        </div>
      ) : (
        <>
          {/* Section Header - Non scrollable */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {paymentLinks.filter(link => link.active).length} active payment link{paymentLinks.filter(link => link.active).length !== 1 ? 's' : ''}
              </p>
              <Button 
                onClick={handleCreatePaymentLink} 
                size="sm" 
                className="gap-2"
                disabled={isCreatingLink} // Désactive le bouton pendant le chargement
              >
                {isCreatingLink ? (
                  <Loader2 className="h-4 w-4 animate-spin" /> // Icône de chargement
                ) : (
                  <Plus className="h-4 w-4" /> // Icône Plus
                )}
                {isCreatingLink ? "Loading..." : "Create Payment Link"} {/* Texte conditionnel */}
              </Button>
            </div>
          </div>

          {/* Section Liste - Scrollable */}
          <ScrollArea className="flex-1 p-6">
            <div className="grid gap-4">
              {paymentLinks.map((link) => (
                <div 
                  key={link.id} 
                  className={`bg-background rounded-lg border p-4 ${!link.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate" title={link.product_name}>{link.product_name}</h3>
                        <Badge variant={link.active ? "default" : "secondary"}>
                          {link.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {link.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{link.description}</p>
                      )}
                      
                      {link.features && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {link.features.tax_collection && <Badge variant="outline" className="text-xs">Tax Collection</Badge>}
                          {link.features.promotion_codes && <Badge variant="outline" className="text-xs">Promo Codes</Badge>}
                          {link.features.pdf_invoices && <Badge variant="outline" className="text-xs">PDF Invoices</Badge>}
                          {link.features.shipping_required && <Badge variant="outline" className="text-xs">Shipping</Badge>}
                          {link.features.quantity_adjustable && <Badge variant="outline" className="text-xs">Adjustable Qty</Badge>}
                          {link.features.inventory_tracking && <Badge variant="outline" className="text-xs">Inventory</Badge>}
                        </div>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyLink(link.id, link.payment_link_url)}>
                          {copiedLinkId === link.id ? (
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          {copiedLinkId === link.id ? "Copied!" : "Copy Link"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewQRCode(link)}>
                          <QrCode className="mr-2 h-4 w-4" />
                          View QR Code
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(link.payment_link_url, '_blank')}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(link)}
                          disabled={isUpdatingStatus === link.id}
                        >
                          {isUpdatingStatus === link.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : link.active ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Deactivate Link
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Activate Link
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleArchiveLink(link)}
                          disabled={isArchiving === link.id}
                          className="text-destructive focus:text-destructive"
                        >
                          {isArchiving === link.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Archiving...
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive Link
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                      {formatCurrency(link.price, link.currency)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleCopyLink(link.id, link.payment_link_url)}
                        disabled={copiedLinkId === link.id}
                      >
                        {copiedLinkId === link.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <LinkIcon className="h-3 w-3" />
                        )}
                        {copiedLinkId === link.id ? "Copied!" : "Copy Link"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </>
      )}

      <Dialog open={qrCodeDialogOpen} onOpenChange={setQrCodeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code for {selectedLink?.product_name}</DialogTitle>
            <DialogDescription>
              Customers can scan this QR code to access your payment link
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="Payment link QR code"
                className="border rounded-lg"
              />
            )}
            <div className="text-sm text-muted-foreground text-center break-all">
              {selectedLink?.payment_link_url}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownloadQRCode} variant="outline" size="sm">
                Download QR Code
              </Button>
              <Button 
                onClick={() => selectedLink && handleCopyLink(selectedLink.id, selectedLink.payment_link_url)} 
                size="sm"
                disabled={copiedLinkId === selectedLink?.id}
              >
                {copiedLinkId === selectedLink?.id ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copiedLinkId === selectedLink?.id ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Payment Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive the link for "{selectedLink?.product_name}"? 
              This will remove it from your active list in Minato. The Stripe link itself will 
              remain in its current state (Active/Inactive) on Stripe unless you deactivate it separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!(isArchiving && selectedLink && isArchiving === selectedLink.id)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmArchiveLink}
              disabled={!!(isArchiving && selectedLink && isArchiving === selectedLink.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(isArchiving && selectedLink && isArchiving === selectedLink.id) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                'Archive Link'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}