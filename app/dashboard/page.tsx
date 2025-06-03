"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider";
import { logger } from "@/memory-framework/config";
import { Loader2, Store, ArrowRight, ExternalLink, AlertTriangle, Settings, CreditCard, TrendingUp } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { PaymentLinksList } from "@/components/payment-links-list";
import { SalesDashboard } from "@/components/sales-dashboard";
import { StripeExpressDashboardButton } from "@/components/stripe-express-dashboard-button";
import { useRouter } from "next/navigation";
import { StripeEmbeddedOnboarding } from "@/components/stripe-embedded-onboarding";

// Define the different seller states
type SellerStatus = 'not_seller' | 'onboarding' | 'active';

interface StripeStatusData {
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
}

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState<"dashboard" | "chat" | "settings" | "memory">("dashboard");
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [sellerStatus, setSellerStatus] = useState<SellerStatus | null>(null);
  const [stripeData, setStripeData] = useState<StripeStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Move fetchSellerStatus to component scope
  const fetchSellerStatus = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/stripe-status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch seller status');
      }
      
      const data: StripeStatusData = await response.json();
      setStripeData(data);
      
      // Determine seller status based on API response
      if (!data.stripe_account_id) {
        setSellerStatus('not_seller');
      } else if (!data.stripe_onboarding_complete) {
        setSellerStatus('onboarding');
      } else {
        setSellerStatus('active');
      }
      
    } catch (error) {
      logger.error('[DashboardPage] Error fetching seller status:', error);
      // Default to not_seller if there's an error
      setSellerStatus('not_seller');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      logger.info("[DashboardPage] User logged out (will redirect via middleware).");
    }
  }, [user, isAuthLoading]);

  // Handle navigation to other pages when different views are selected
  useEffect(() => {
    if (currentView === "chat") {
      router.push("/chat");
    } else if (currentView === "settings") {
      router.push("/chat?view=settings");
    } else if (currentView === "memory") {
      router.push("/chat?view=memory");
    }
  }, [currentView, router]);

  // Fetch the user's Stripe seller status
  useEffect(() => {
    fetchSellerStatus();
  }, [user]);

  const handleBecomeSellerClick = async () => {
    try {
      // Call the API to initiate seller onboarding
      const response = await fetch('/api/seller/onboarding', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate seller onboarding');
      }
      
      const data = await response.json();
      
      // Refresh seller status to show embedded onboarding
      fetchSellerStatus();
    } catch (error) {
      logger.error('[DashboardPage] Error initiating seller onboarding:', error);
      // Handle error (could show a toast notification)
    }
  };

  const handleContinueOnboardingClick = async () => {
    try {
      // Call the API to continue seller onboarding
      const response = await fetch('/api/seller/onboarding/continue', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to continue seller onboarding');
      }
      
      const data = await response.json();
      
      // If the API returns a URL, redirect to Stripe's onboarding
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      logger.error('[DashboardPage] Error continuing seller onboarding:', error);
      // Handle error (could show a toast notification)
    }
  };

  // Loading state while checking authentication and seller status
  if (isAuthLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary/70 mb-4" />
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    // This is handled by middleware, but adding as a fallback
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

      <div className="flex-1 container max-w-5xl mx-auto px-4 pb-4 pt-16 md:pt-20 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold">Seller Dashboard</h1>
              <p className="text-muted-foreground">
                {sellerStatus === 'active' 
                  ? 'Manage your products, payment links, and sales.'
                  : 'Create and manage your payment links with Stripe.'}
              </p>
            </div>

            {/* Content based on seller status */}
            {sellerStatus === 'not_seller' && (
              <Card className="border-border/40 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Unlock Your Selling Potential with Minato!
                  </CardTitle>
                  <CardDescription>
                    Ready to share your creations, products, or services with the world? Minato, in partnership with Stripe, makes it easy to accept payments securely.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center text-primary font-bold">1</div>
                        <h3 className="font-semibold">Create your seller account</h3>
                        <p className="text-sm text-muted-foreground">Connect securely with Stripe to handle payments and payouts.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center text-primary font-bold">2</div>
                        <h3 className="font-semibold">Create payment links</h3>
                        <p className="text-sm text-muted-foreground">Set up products or services with just a few clicks.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center text-primary font-bold">3</div>
                        <h3 className="font-semibold">Get paid</h3>
                        <p className="text-sm text-muted-foreground">Share your payment links and receive money directly to your account.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full sm:w-auto gap-2" 
                    size="lg"
                    onClick={handleBecomeSellerClick}
                  >
                    <Store className="h-4 w-4" />
                    Become a Seller
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {sellerStatus === 'onboarding' && (
              <div className="space-y-4">
                <Alert variant="warning" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-800 dark:text-amber-400">Complete Your Seller Account Setup</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <p>
                      Welcome! Please complete your seller account setup below to start accepting payments through Minato.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <Card className="border-border/40 shadow-sm">
                  <CardContent className="pt-6">
                    <StripeEmbeddedOnboarding 
                      stripeAccountId={stripeData?.stripe_account_id || null}
                      onComplete={fetchSellerStatus}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {sellerStatus === 'active' && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="payment-links">My Payment Links</TabsTrigger>
                  <TabsTrigger value="sales">My Sales</TabsTrigger>
                  <TabsTrigger value="account">Seller Account</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dashboard Overview</CardTitle>
                      <CardDescription>Your selling activity at a glance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-muted/50 border-border/40">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Payment Links</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className="text-2xl font-bold">0</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50 border-border/40">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className="text-2xl font-bold">$0.00</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50 border-border/40">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className="text-2xl font-bold">$0.00</p>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="gap-2" onClick={() => window.open('https://dashboard.stripe.com/dashboard', '_blank')}>
                        Visit Stripe Dashboard
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="payment-links">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Payment Links</CardTitle>
                      <CardDescription>Create and manage your payment links</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-4">
                        <PaymentLinksList />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="sales">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Sales</CardTitle>
                      <CardDescription>Track your sales and transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SalesDashboard />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="account">
                  <div className="space-y-6">
                    {/* Stripe Express Account Management Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Store className="h-5 w-5 text-primary" />
                          Your Stripe Seller Account
                        </CardTitle>
                        <CardDescription>
                          Manage your Stripe Express account and access financial dashboard
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Account Status */}
                        <div className="rounded-lg border p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">Account Status</h3>
                            <div className="flex items-center gap-2">
                              {stripeData?.stripe_onboarding_complete ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {stripeData?.stripe_onboarding_complete ? 'Active' : 'Pending Setup'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {stripeData?.stripe_account_id 
                              ? `Account ID: ${stripeData.stripe_account_id.slice(0, 8)}...`
                              : 'No Stripe account connected'
                            }
                          </p>
                        </div>

                        {/* Dashboard Access */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h3 className="font-medium">Stripe Express Dashboard</h3>
                            <p className="text-sm text-muted-foreground">
                              Access your complete financial dashboard to view earnings, payouts, and account settings.
                            </p>
                            <StripeExpressDashboardButton 
                              connectedAccountId={stripeData?.stripe_account_id || undefined}
                              variant="default"
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-3">
                            <h3 className="font-medium">Account Management</h3>
                            <p className="text-sm text-muted-foreground">
                              Update your business details, banking information, and tax settings.
                            </p>
                            <Button 
                              variant="outline" 
                              className="gap-2 w-full"
                              onClick={() => window.open('https://dashboard.stripe.com/settings/account', '_blank')}
                            >
                              <Store className="h-4 w-4" />
                              Account Settings
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-3">
                          <h3 className="font-medium">Quick Actions</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 justify-start"
                              onClick={() => window.open('https://dashboard.stripe.com/payments', '_blank')}
                            >
                              View Payments
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 justify-start"
                              onClick={() => window.open('https://dashboard.stripe.com/balance/overview', '_blank')}
                            >
                              Check Balance
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 justify-start"
                              onClick={() => window.open('https://dashboard.stripe.com/tax', '_blank')}
                            >
                              Tax Reports
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Business Information Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Business Information</CardTitle>
                        <CardDescription>
                          Your business details as registered with Stripe
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground">
                            To update your business information, tax details, or banking information, 
                            please use the Stripe Express Dashboard or Account Settings links above.
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2"
                              onClick={() => window.open('https://dashboard.stripe.com/settings/public-details', '_blank')}
                            >
                              Public Details
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2"
                              onClick={() => window.open('https://dashboard.stripe.com/settings/payouts', '_blank')}
                            >
                              Payout Settings
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Help & Support Card */}
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
                      <CardHeader>
                        <CardTitle className="text-blue-900 dark:text-blue-300">Help & Support</CardTitle>
                        <CardDescription className="text-blue-800 dark:text-blue-400">
                          Get help with your seller account and payment processing
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 justify-start border-blue-300 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                              onClick={() => window.open('https://support.stripe.com/express', '_blank')}
                            >
                              Stripe Support
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 justify-start border-blue-300 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                              onClick={() => window.open('https://stripe.com/docs/express', '_blank')}
                            >
                              Documentation
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-400">
                            For technical issues with Minato integration, please contact our support team.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
} 