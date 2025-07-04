"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider";
import { logger } from "@/memory-framework/config";
import { 
  Loader2, 
  Store, 
  ArrowRight, 
  ExternalLink, 
  AlertTriangle, 
  Settings, 
  CreditCard, 
  TrendingUp,
  Menu, // Icône pour le menu mobile
  X, // Icône pour fermer le menu mobile
  LayoutDashboard, // Icône pour Overview
  Link as LinkIcon, // Icône pour Payment Links
  DollarSign, // Icône pour Sales
  UserCircle, // Icône pour Seller Account
} from "lucide-react";
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
// Supposons que vous avez ces composants:
// import { getBrowserSupabaseClient } from "@/lib/supabase/client";
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

interface TabItem {
  value: string;
  label: string;
  icon: React.ElementType;
}

const sellerTabs: TabItem[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "payment-links", label: "My Payment Links", icon: LinkIcon },
  { value: "sales", label: "My Sales", icon: CreditCard },
  { value: "account", label: "Seller Account", icon: UserCircle },
];

// Define view type to match Header component
type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights";

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [sellerStatus, setSellerStatus] = useState<SellerStatus | null>(null);
  const [stripeData, setStripeData] = useState<StripeStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(sellerTabs[0].value);


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
      
      if (!data.stripe_account_id) {
        setSellerStatus('not_seller');
      } else if (!data.stripe_onboarding_complete) {
        setSellerStatus('onboarding');
      } else {
        setSellerStatus('active');
      }
      
    } catch (error) {
      logger.error('[DashboardPage] Error fetching seller status:', error);
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

  useEffect(() => {
    if (currentView === "chat") {
      router.push("/chat");
    } else if (currentView === "settings") {
      router.push("/chat?view=settings");
    } else if (currentView === "memory") {
      router.push("/chat?view=memory");
    } else if (currentView === "listening") {
      router.push("/listening");
    } else if (currentView === "insights") {
      router.push("/insights");
    }
  }, [currentView, router]);

  useEffect(() => {
    fetchSellerStatus();
  }, [user]);

  const handleBecomeSellerClick = async () => {
    try {
      const response = await fetch('/api/seller/onboarding', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to initiate seller onboarding');
      fetchSellerStatus();
    } catch (error) {
      logger.error('[DashboardPage] Error initiating seller onboarding:', error);
    }
  };

  const handleContinueOnboardingClick = async () => {
    try {
      const response = await fetch('/api/seller/onboarding/continue', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to continue seller onboarding');
      const data = await response.json();
      if (data.onboardingUrl) window.location.href = data.onboardingUrl;
    } catch (error) {
      logger.error('[DashboardPage] Error continuing seller onboarding:', error);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary/70 mb-4" />
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-destructive">
        <p>Authentication error or session expired. Redirecting...</p>
      </div>
    );
  }

  const renderSidebarContent = () => (
    <TabsList className="flex flex-col items-start space-y-1 p-2 md:p-0 bg-transparent">
      {sellerTabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="w-full justify-start px-3 py-2 text-sm font-medium rounded-md hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          onClick={() => {
            setActiveTab(tab.value);
            if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
          }}
        >
          <tab.icon className="mr-2 h-4 w-4" />
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />
      <Header currentView={currentView} onViewChange={setCurrentView} />

      {/* Mobile Sidebar Toggle Button */}
      {sellerStatus === 'active' && (
        <Button
          variant="outline"
          size="icon"
          className="md:hidden fixed top-1/2 left-3 -translate-y-1/2 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          aria-label="Toggle navigation"
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}
      
      {/* Overlay for mobile sidebar */}
      {isMobileSidebarOpen && sellerStatus === 'active' && (
          <div 
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
          />
      )}


      <div className="flex-1 container max-w-7xl mx-auto px-4 pb-4 pt-16 md:pt-20 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full"
        >
          {/* Content based on seller status */}
          {sellerStatus !== 'active' && (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
              {/* ... (Not_seller and Onboarding content remains the same as your original) ... */}
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
                        {/* ... Step 1, 2, 3 ... */}
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
            </div>
          )}
            
          {sellerStatus === 'active' && (
            <Tabs 
                defaultValue={activeTab} 
                value={activeTab}
                onValueChange={setActiveTab} 
                className="w-full"
            >
              <div className="md:flex md:space-x-6">
                {/* Desktop Sidebar */}
                <aside className="hidden md:block w-[20%] max-w-xs pr-6 border-r border-border/40">
                <div className="fixed  top-56"> {/* Pour que la sidebar reste visible en scrollant */}
                    
                    {renderSidebarContent()}
                  </div>
                </aside>

                {/* Mobile Sidebar (Drawer) */}
                <div
                  className={`md:hidden fixed inset-y-0 left-0 z-40 w-3/4 max-w-sm bg-background border-r border-border/40 p-4
                              transform transition-transform duration-300 ease-in-out
                              ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                   <div className="flex justify-between items-center mb-6">
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)}>
                        {/* <X className="h-5 w-5" /> */}
                    </Button>
                   </div>
                  {renderSidebarContent()}
                </div>
                
                {/* Main Content Area */}
                <div className="flex-1 md:pl-0"> {/* md:pl-0 pour annuler le padding si on en met un globalement */}
                  {/* Cet élément sera le conteneur stylisé pour le contenu des Tabs */}
                  <div className="bg-card text-card-foreground border border-border/40 rounded-lg shadow-sm p-6 min-h-[calc(100vh-10rem)]">
                    <TabsContent value="overview">
                      <Card className="bg-transparent h-[600px] border-none shadow-none">
                        <CardHeader className="px-0 pt-0">
                          <CardTitle>Dashboard Overview</CardTitle>
                          <CardDescription>Your selling activity at a glance</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* ... Vos Cards d'overview ... */}
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
                        <CardFooter className="px-0 pb-0 mt-4">
                          <Button variant="outline" className="gap-2" onClick={() => window.open('https://dashboard.stripe.com/dashboard', '_blank')}>
                            Visit Stripe Dashboard
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </TabsContent>
                    <TabsContent value="payment-links">
                      <Card className="bg-transparent border-none shadow-none">
                        <CardHeader className="px-0 pt-0">
                          <CardTitle>My Payment Links</CardTitle>
                          <CardDescription>Create and manage your payment links</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          <div className="flex flex-col gap-4">
                            <PaymentLinksList />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="sales">
                      <Card className="bg-transparent border-none shadow-none">
                        <CardHeader className="px-0 pt-0">
                          <CardTitle>My Sales</CardTitle>
                          <CardDescription>Track your sales and transactions</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          <SalesDashboard />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="account">
                       <div className="space-y-6">
                        {/* Stripe Express Account Management Section */}
                        <Card className="bg-transparent  border-none shadow-none">
                          <CardHeader className="px-0 pt-0">
                            <CardTitle className="flex items-center gap-2">
                              <Store className="h-5 w-5 text-primary" />
                              Your Stripe Seller Account
                            </CardTitle>
                            <CardDescription>
                              Manage your Stripe Express account and access financial dashboard
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 px-0 pb-0">
                            {/* Account Status */}
                            <div className="rounded-lg border p-4 bg-muted/30">
                              {/* ... contenu status ... */}
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
                              {/* ... contenu dashboard access ... */}
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
                              {/* ... contenu quick actions ... */}
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
                        <Card className="bg-transparent border-none shadow-none">
                           <CardHeader className="px-0">
                            <CardTitle>Business Information</CardTitle>
                            <CardDescription>
                              Your business details as registered with Stripe
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="px-0 pb-0">
                            {/* ... contenu business info ... */}
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
                            {/* ... contenu help & support ... */}
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
                  </div>
                </div>
              </div>
            </Tabs>
          )}
        </motion.div>
      </div>
    </main>
  );
}