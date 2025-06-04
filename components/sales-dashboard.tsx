"use client";

import { useState, useEffect } from "react";
import { logger } from "@/memory-framework/config";
import { 
  Loader2, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface Sale {
  id: string;
  minato_payment_link_id: string;
  stripe_payment_intent_id: string;
  amount_total_cents: number;
  currency: string;
  customer_email: string | null;
  sale_status: string;
  created_at: string;
  payment_link?: {
    name: string;
  };
}

interface SalesData {
  sales: Sale[];
  totalRevenue: number;
  totalSales: number;
  recentSales: Sale[];
  thisMonthRevenue: number;
  thisMonthSales: number;
}

export function SalesDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/seller/sales');
        
        if (!response.ok) {
          throw new Error('Failed to fetch sales data');
        }
        
        const data = await response.json();
        setSalesData(data);
        
      } catch (error: any) {
        logger.error('[SalesDashboard] Error fetching sales data:', error);
        setError(error.message || 'Failed to load sales data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSalesData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70 mr-2" />
        <p>Loading sales data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error: {error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!salesData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No sales data available.</p>
      </div>
    );
  }

  const {
    totalRevenue,
    totalSales,
    recentSales,
    thisMonthRevenue,
    thisMonthSales
  } = salesData;

  return (
    <div className="space-y-6">
      {/* Sales Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/50 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Completed transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthRevenue, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              {thisMonthSales} sale{thisMonthSales !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Sale</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSales > 0 ? formatCurrency(totalRevenue / totalSales, 'USD') : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average order value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>
            Your latest transactions and customer activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sales yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Sales will appear here once customers start purchasing through your payment links.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {sale.payment_link?.name || 'Unknown Product'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{sale.customer_email || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{new Date(sale.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className={`capitalize ${
                        sale.sale_status === 'completed' ? 'text-green-600' : 
                        sale.sale_status === 'pending' ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {sale.sale_status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(sale.amount_total_cents, 'USD')}
                    </div>
                  </div>
                </div>
              ))}
              
              {recentSales.length >= 5 && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('https://dashboard.stripe.com/payments', '_blank')}
                    className="gap-2"
                  >
                    View All Sales
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Dashboard Link */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analytics</CardTitle>
          <CardDescription>
            View comprehensive sales analytics and manage payouts in your Stripe dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => window.open('https://dashboard.stripe.com/dashboard', '_blank')}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Open Stripe Dashboard
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 