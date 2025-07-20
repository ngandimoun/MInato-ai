"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider";
import { logger } from "@/memory-framework/config";
import { 
  ArrowLeft, 
  Loader2, 
  Package, 
  DollarSign,
  FileText,
  ExternalLink,
  Globe,
  ShoppingCart,
  Plus,
  Minus,
  Upload,
  ImageIcon,
  Sparkles
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

const CURRENCIES = [
  { value: 'usd', label: 'USD ($)' },
  { value: 'eur', label: 'EUR (€)' },
  { value: 'gbp', label: 'GBP (£)' },
  { value: 'cad', label: 'CAD (C$)' },
  { value: 'aud', label: 'AUD (A$)' },
  { value: 'jpy', label: 'JPY (¥)' },
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
];

interface PaymentLinkForm {
  // Basic product information
  productName: string;
  description: string;
  price: string;
  currency: string;
  
  // Enhanced Phase 3 features
  imageUrls: string[];
  inventoryQuantity: string;
  enableStripeLimit: boolean;
  inactiveMessage: string;
  quantityAdjustable: boolean;
  minQuantity: string;
  maxQuantity: string;
  shippingCountries: string[];
  enableTaxCollection: boolean;
  allowPromotionCodes: boolean;
  enablePdfInvoices: boolean;
  paymentLinkName: string;
}

export default function CreatePaymentLinkPage() {
  const [currentView, setCurrentView] = useState<"dashboard" | "chat" | "settings" | "memory">("dashboard");
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [formData, setFormData] = useState<PaymentLinkForm>({
    productName: '',
    description: '',
    price: '',
    currency: 'usd',
    imageUrls: [],
    inventoryQuantity: '',
    enableStripeLimit: false,
    inactiveMessage: '',
    quantityAdjustable: false,
    minQuantity: '1',
    maxQuantity: '99',
    shippingCountries: [],
    enableTaxCollection: false,
    allowPromotionCodes: false,
    enablePdfInvoices: false,
    paymentLinkName: '',
  });

  const handleInputChange = (field: keyof PaymentLinkForm, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress({ [file.name]: 0 });

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Use the public URL from the response
      const publicUrl = result.publicUrl;
      
      // Add the public URL to the form data
      if (!formData.imageUrls.includes(publicUrl)) {
        handleInputChange('imageUrls', [...formData.imageUrls, publicUrl]);
      }

      setUploadProgress({ [file.name]: 100 });
      
      toast({
        title: "Upload Successful",
        description: "Image uploaded successfully.",
      });

      logger.info('[CreatePaymentLink] Image uploaded:', result.fileId);

    } catch (error: any) {
      logger.error('[CreatePaymentLink] Image upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && !formData.imageUrls.includes(newImageUrl.trim())) {
      handleInputChange('imageUrls', [...formData.imageUrls, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImageUrl = (index: number) => {
    const newUrls = formData.imageUrls.filter((_, i) => i !== index);
    handleInputChange('imageUrls', newUrls);
  };

  const addShippingCountry = (countryCode: string) => {
    if (!formData.shippingCountries.includes(countryCode)) {
      handleInputChange('shippingCountries', [...formData.shippingCountries, countryCode]);
    }
  };

  const removeShippingCountry = (countryCode: string) => {
    const newCountries = formData.shippingCountries.filter(code => code !== countryCode);
    handleInputChange('shippingCountries', newCountries);
  };

  const enhanceDescription = async () => {
    if (!formData.productName.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name first to generate an enhanced description.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnhancingDescription(true);

      const response = await fetch('/api/ai/enhance-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: formData.productName.trim(),
          currentDescription: formData.description.trim() || '',
          price: formData.price,
          currency: formData.currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enhance description');
      }

      const result = await response.json();
      
      handleInputChange('description', result.enhancedDescription);
      
      toast({
        title: "Description Enhanced! ✨",
        description: "Your product description has been optimized for better sales.",
      });

      logger.info('[CreatePaymentLink] Description enhanced successfully');

    } catch (error: any) {
      logger.error('[CreatePaymentLink] Description enhancement failed:', error);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productName.trim() || !formData.price.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name and price are required.",
        variant: "destructive",
      });
      return;
    }

    const priceAmount = parseFloat(formData.price);
    if (isNaN(priceAmount) || priceAmount <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare the enhanced request body
      const requestBody = {
        productName: formData.productName.trim(),
        description: formData.description.trim() || undefined,
        price: Math.round(priceAmount * 100), // Convert to cents
        currency: formData.currency,
        imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
        inventoryQuantity: formData.inventoryQuantity ? parseInt(formData.inventoryQuantity) : undefined,
        enableStripeLimit: formData.enableStripeLimit,
        inactiveMessage: formData.inactiveMessage.trim() || undefined,
        quantityAdjustable: formData.quantityAdjustable,
        minQuantity: formData.quantityAdjustable ? parseInt(formData.minQuantity) : undefined,
        maxQuantity: formData.quantityAdjustable ? parseInt(formData.maxQuantity) : undefined,
        shippingCountries: formData.shippingCountries.length > 0 ? formData.shippingCountries : undefined,
        enableTaxCollection: formData.enableTaxCollection,
        allowPromotionCodes: formData.allowPromotionCodes,
        enablePdfInvoices: formData.enablePdfInvoices,
        paymentLinkName: formData.paymentLinkName.trim() || undefined,
      };

      const response = await fetch('/api/stripe/create-product-and-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment link');
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: "Your enhanced payment link has been created successfully.",
      });

      logger.info('[CreatePaymentLink] Enhanced payment link created:', result.stripePaymentLinkId);
      
      // Redirect back to dashboard
      router.push('/dashboard');

    } catch (error: any) {
      logger.error('[CreatePaymentLink] Error creating enhanced payment link:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create payment link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary/70 mb-4" />
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-destructive">
        <p>Authentication error or session expired. Redirecting...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />

      <Header currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 container max-w-4xl mx-auto px-4 pb-4 pt-16 md:pt-20 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full"
        >
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create Enhanced Payment Link</h1>
                <p className="text-muted-foreground">
                  Create a comprehensive payment link with advanced features
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Product Information */}
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Product Details
                  </CardTitle>
                  <CardDescription>
                    Enter the basic information for your product or service
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name *</Label>
                      <Input
                        id="productName"
                        placeholder="e.g., Premium Consultation, Digital Course"
                        value={formData.productName}
                        onChange={(e) => handleInputChange('productName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentLinkName">Payment Link Name (Optional)</Label>
                      <Input
                        id="paymentLinkName"
                        placeholder="Custom name for easier identification"
                        value={formData.paymentLinkName}
                        onChange={(e) => handleInputChange('paymentLinkName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Description (Optional)</Label>
                      {formData.productName.trim() && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI enhancement available
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Textarea
                        id="description"
                        placeholder="Provide detailed information about your product or service..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={enhanceDescription}
                        disabled={isEnhancingDescription || !formData.productName.trim()}
                        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-primary/10"
                        title={formData.productName.trim() ? "Enhance description with AI" : "Enter product name first"}
                      >
                        {isEnhancingDescription ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Sparkles className={`h-4 w-4 ${formData.productName.trim() ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                      </Button>
                    </div>
                    {!formData.productName.trim() && (
                      <p className="text-xs text-muted-foreground">
                        💡 Enter a product name first to use AI enhancement
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="29.99"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => handleInputChange('currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Images */}
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Product Images
                  </CardTitle>
                  <CardDescription>
                    Add images to make your product more appealing (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload Section */}
                  <div className="space-y-2">
                    <Label>Upload Images</Label>
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-primary');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary');
                        const files = Array.from(e.dataTransfer.files);
                        files.forEach(file => {
                          if (file.type.startsWith('image/')) {
                            handleImageUpload(file);
                          }
                        });
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(file => handleImageUpload(file));
                        }}
                        className="hidden"
                        id="image-upload"
                        disabled={isUploading}
                      />
                      <label 
                        htmlFor="image-upload" 
                        className={`cursor-pointer flex flex-col items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <span className="text-sm text-muted-foreground">Uploading images...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-medium">Click to upload images</span>
                            <span className="text-xs text-muted-foreground">
                              or drag and drop • PNG, JPG, JPEG up to 5MB each
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* URL Input Section */}
                  <div className="space-y-2">
                    <Label>Or add image URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        disabled={isUploading}
                      />
                      <Button 
                        type="button" 
                        onClick={addImageUrl} 
                        variant="outline" 
                        size="icon"
                        disabled={isUploading || !newImageUrl.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Display Added Images */}
                  {formData.imageUrls.length > 0 && (
                    <div className="space-y-2">
                      <Label>Added Images ({formData.imageUrls.length})</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formData.imageUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                              <img 
                                src={url} 
                                alt={`Product image ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.error-placeholder')) {
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'error-placeholder flex items-center justify-center h-full text-muted-foreground';
                                    errorDiv.innerHTML = `
                                      <div class="text-center">
                                        <div class="text-sm mb-1">⚠️</div>
                                        <p class="text-xs">Failed to load</p>
                                      </div>
                                    `;
                                    parent.appendChild(errorDiv);
                                  }
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImageUrl(index)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Image {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inventory & Quantity Management */}
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Inventory & Quantity
                  </CardTitle>
                  <CardDescription>
                    Manage stock levels and customer purchase limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inventoryQuantity">Available Stock (Optional)</Label>
                      <Input
                        id="inventoryQuantity"
                        type="number"
                        min="1"
                        placeholder="100"
                        value={formData.inventoryQuantity}
                        onChange={(e) => handleInputChange('inventoryQuantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inactiveMessage">Sold Out Message (Optional)</Label>
                      <Input
                        id="inactiveMessage"
                        placeholder="This product is currently sold out"
                        value={formData.inactiveMessage}
                        onChange={(e) => handleInputChange('inactiveMessage', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableStripeLimit"
                      checked={formData.enableStripeLimit}
                      onCheckedChange={(checked) => handleInputChange('enableStripeLimit', checked)}
                    />
                    <Label htmlFor="enableStripeLimit">Enable Stripe-side sales limit</Label>
                  </div>

                  <Separator />

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="quantityAdjustable"
                      checked={formData.quantityAdjustable}
                      onCheckedChange={(checked) => handleInputChange('quantityAdjustable', checked)}
                    />
                    <Label htmlFor="quantityAdjustable">Allow customers to adjust quantity</Label>
                  </div>

                  {formData.quantityAdjustable && (
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div className="space-y-2">
                        <Label htmlFor="minQuantity">Minimum Quantity</Label>
                        <Input
                          id="minQuantity"
                          type="number"
                          min="1"
                          value={formData.minQuantity}
                          onChange={(e) => handleInputChange('minQuantity', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxQuantity">Maximum Quantity</Label>
                        <Input
                          id="maxQuantity"
                          type="number"
                          min="1"
                          value={formData.maxQuantity}
                          onChange={(e) => handleInputChange('maxQuantity', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shipping & Geographic Settings */}
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Shipping & Geographic Settings
                  </CardTitle>
                  <CardDescription>
                    Configure shipping and geographic restrictions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Allowed Shipping Countries</Label>
                    <Select onValueChange={addShippingCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add shipping country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.filter(country => !formData.shippingCountries.includes(country.code)).map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.shippingCountries.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.shippingCountries.map((countryCode) => {
                        const country = COUNTRIES.find(c => c.code === countryCode);
                        return (
                          <Badge key={countryCode} variant="secondary" className="gap-2">
                            {country?.name || countryCode}
                            <button
                              type="button"
                              onClick={() => removeShippingCountry(countryCode)}
                              className="ml-1 hover:text-destructive"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Advanced Features */}
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle>Advanced Features</CardTitle>
                  <CardDescription>
                    Enable additional payment and business features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableTaxCollection"
                      checked={formData.enableTaxCollection}
                      onCheckedChange={(checked) => handleInputChange('enableTaxCollection', checked)}
                    />
                    <Label htmlFor="enableTaxCollection">Enable automatic tax collection</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allowPromotionCodes"
                      checked={formData.allowPromotionCodes}
                      onCheckedChange={(checked) => handleInputChange('allowPromotionCodes', checked)}
                    />
                    <Label htmlFor="allowPromotionCodes">Allow promotion codes</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enablePdfInvoices"
                      checked={formData.enablePdfInvoices}
                      onCheckedChange={(checked) => handleInputChange('enablePdfInvoices', checked)}
                    />
                    <Label htmlFor="enablePdfInvoices">Generate PDF invoices</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Enhanced Payment Link...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Create Enhanced Payment Link
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Info Card */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      Enhanced Payment Link Features
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• Advanced inventory management with automatic stock tracking</li>
                      <li>• Automatic tax collection using Stripe Tax</li>
                      <li>• Multiple shipping countries and address collection</li>
                      <li>• Promotion code support for discounts and campaigns</li>
                      <li>• PDF invoice generation for professional transactions</li>
                      <li>• Quantity limits and adjustments for bulk sales</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </main>
  );
} 