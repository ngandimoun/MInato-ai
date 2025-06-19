"use client";

import React, { useState, useEffect } from 'react'
import { LivingDossierProvider } from '@/livingdossier/context/LivingDossierContext'
import DossierView from '@/livingdossier/components/living-dossier/DossierView'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsItem, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

export default function ExampleDossierPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [mockDossierId, setMockDossierId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Mock loading of an example dossier
  useEffect(() => {
    // Simulate a network request
    const timer = setTimeout(() => {
      try {
        // In a real scenario, you would fetch this from the server
        // or generate it using the API
        setMockDossierId('example-coffee-shop-soho')
        setIsLoading(false)
      } catch (err) {
        setError('Failed to load example dossier')
        setIsLoading(false)
      }
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])
  
  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-2/3 mx-auto"></div>
          <div className="h-6 bg-muted rounded w-1/2 mx-auto"></div>
          <div className="h-64 bg-muted rounded mt-8"></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container max-w-5xl mx-auto py-20">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>An error occurred while loading the example dossier</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <LivingDossierProvider>
      <div className="container max-w-5xl mx-auto pt-8 pb-20">
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Example Living Dossier</CardTitle>
            <CardDescription>
              This is a demonstration of the Living Dossier system. The data shown is mock data for a coffee shop viability analysis in SoHo, NYC.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Living Dossiers transform complex questions into explorable, data-driven experiences. They combine AI-powered analysis with interactive elements to help you make informed decisions.
            </p>
            <div className="mt-4">
              <h3 className="font-medium mb-2">Features demonstrated in this example:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Interactive charts and visualizations</li>
                <li>Dynamic simulator with adjustable parameters</li>
                <li>AI-generated insights and recommendations</li>
                <li>Structured data appendix with source documentation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        {mockDossierId && (
          <DossierView dossierId={mockDossierId} />
        )}
      </div>
      
      {/* Mock data injector - would not exist in a real implementation */}
      <MockDataInjector />
    </LivingDossierProvider>
  )
}

// This component exists solely to inject mock data for the example page
// In a real implementation, data would come from the database
function MockDataInjector() {
  useEffect(() => {
    // Inject mock data into the window object for the provider to use
    window.__MOCK_LIVING_DOSSIER__ = {
      id: 'example-coffee-shop-soho',
      userId: 'user123',
      title: 'Coffee Shop Viability Analysis: SoHo, NYC',
      query: 'Is opening a specialty coffee shop in SoHo, NYC viable?',
      refinedQuery: 'What is the financial viability, market opportunity, and potential ROI for opening a specialty coffee shop in SoHo, NYC in 2023?',
      status: 'completed',
      progress: 100,
      domain: 'business_intelligence',
      createdAt: '2023-06-15T14:23:15Z',
      updatedAt: '2023-06-15T14:25:47Z',
      
      executiveSummary: {
        text: 'Opening a specialty coffee shop in SoHo presents a viable business opportunity with strong potential for success. The neighborhood demonstrates high foot traffic (average 12,000 daily pedestrians), affluent demographics willing to pay premium prices for specialty coffee, and strong tourism. Our analysis identifies a specific gap in the market for third-wave specialty coffee with a focus on sustainable sourcing and unique brewing methods. Financial projections indicate potential for profitability within 16-18 months with proper execution and marketing. Key differentiation will be essential for standing out in this competitive market.',
        keyPoints: [
          'SoHo has 12,000 average daily pedestrians creating high visibility and walk-in potential',
          'Local demographics show 78% of residents willing to spend $5+ on premium coffee',
          'Competitive analysis reveals opportunity for sustainability-focused specialty coffee',
          'Rent costs ($125-175/sq ft) represent the most significant overhead challenge',
          'Break-even projected at 16-18 months with proper execution'
        ],
        recommendations: [
          'Focus on unique third-wave specialty coffee offerings with transparent sourcing',
          'Develop a distinctive brand identity that aligns with SoHo\'s artistic heritage',
          'Explore locations on side streets to balance visibility with lower rent costs',
          'Implement a robust social media strategy focusing on visual appeal and sustainability',
          'Consider a flexible layout to maximize limited square footage and enable evening events'
        ]
      },
      
      supportingEvidence: {
        sections: [
          {
            title: 'Market Analysis',
            content: '<p>SoHo presents an exceptional market for specialty coffee due to its unique combination of affluent residents, daily office workers, and consistent tourist traffic. Primary research shows 78% of SoHo residents purchase coffee outside the home at least 4 times weekly, with an average spend of $6.20 per visit.</p><p>The neighborhood has seen a 15% increase in foot traffic over the past year, reaching an average of 12,000 daily pedestrians on main thoroughfares like Broadway and Spring Street. Side streets average 4,500-6,000 daily pedestrians but offer significantly lower rent costs.</p><p>Consumer surveys indicate a strong preference (68%) for coffee shops with clear sustainability practices and transparent sourcing. Additionally, 72% of respondents expressed interest in coffee "experiences" beyond standard offerings, including specialty brewing methods, coffee education, and cupping events.</p>'
          },
          {
            title: 'Competitive Landscape',
            content: '<p>SoHo currently hosts 14 dedicated coffee shops, with 8 being chain operations and 6 independents. Location mapping shows concentration along Broadway and West Broadway, with fewer options on side streets east of Broadway.</p><p>Chain operations (Starbucks, Blue Bottle, etc.) capture approximately 65% of the current market share by volume, though specialty independents command higher average transactions ($7.40 vs $5.85).</p><p>Gap analysis identifies opportunity for a specialty coffee shop focused on:</p><ul><li>Transparent bean sourcing and direct trade relationships</li><li>Specialized brewing methods not widely available elsewhere</li><li>Educational component that engages customers in coffee culture</li><li>Evening operations with coffee-focused events (most competitors close by 7pm)</li></ul><p>Service analysis indicates peak waiting times averaging 8-12 minutes at competitors during morning rush (7:30-9:30am), representing an opportunity for efficient service design.</p>'
          },
          {
            title: 'Financial Considerations',
            content: '<p>Commercial real estate in SoHo commands premium prices, with retail spaces averaging $125-175 per square foot annually. A viable coffee shop operation requires minimum 800-1,000 square feet, creating a baseline annual rent expense of $100,000-175,000.</p><p>Initial capital requirements for a specialty coffee shop in this location range from $350,000-450,000, including:</p><ul><li>Leasehold improvements: $150,000-200,000</li><li>Equipment: $80,000-120,000</li><li>Initial inventory: $15,000-25,000</li><li>Working capital (6 months): $100,000</li></ul><p>Projected revenue scenarios based on average daily customer count:</p><table><tr><th>Scenario</th><th>Daily Customers</th><th>Avg. Transaction</th><th>Annual Revenue</th></tr><tr><td>Conservative</td><td>200</td><td>$6.50</td><td>$474,500</td></tr><tr><td>Expected</td><td>275</td><td>$7.25</td><td>$727,800</td></tr><tr><td>Optimistic</td><td>350</td><td>$8.00</td><td>$1,022,000</td></tr></table><p>With industry-standard COGS of 28-32% and labor costs of 30-35%, the business projects positive cashflow in months 10-12 (optimistic scenario) or months 16-18 (expected scenario).</p>'
          },
          {
            title: 'Consumer Behavior Analysis',
            content: '<p>Research into SoHo coffee consumers reveals several key behavior patterns that inform business strategy:</p><p>Morning traffic (7am-10am) consists primarily of local residents and workers seeking quick, high-quality coffee before work. Speed of service is paramount for this segment.</p><p>Mid-day traffic (11am-2pm) includes a mix of tourists, shoppers, and local workers looking for a place to sit and rest. Space and atmosphere become more important factors during these hours.</p><p>Afternoon and evening patronage (3pm-8pm) includes shoppers seeking rest, remote workers looking for workspace, and locals meeting socially. This segment values ambiance, wifi reliability, and food offerings alongside coffee.</p><p>Weekend patterns differ significantly, with later morning peaks and longer average visit durations (42 minutes vs. 17 minutes on weekdays).</p><p>Specialty coffee consumers specifically demonstrate high loyalty behaviors when they find establishments that match their quality expectations, with 65% becoming regular customers who visit 3+ times weekly.</p>'
          }
        ],
        sources: [
          {
            title: "NYC Department of Small Business Services: Retail Market Profile - SoHo (2022)",
            url: "https://www1.nyc.gov/site/sbs/about/publications.page",
            relevance: 0.9
          },
          {
            title: "National Coffee Association: Coffee Drinking Trends Report 2023",
            url: "https://www.ncausa.org/Industry-Resources/Market-Research/NCDT",
            relevance: 0.85
          },
          {
            title: "CBRE Commercial Real Estate Market Outlook - Manhattan Retail Q1 2023",
            url: "https://www.cbre.com/insights/reports",
            relevance: 0.8
          },
          {
            title: "Specialty Coffee Association: Coffee Retail Sentiment Index 2023",
            url: "https://sca.coffee/research",
            relevance: 0.95
          }
        ]
      },
      
      simulator: {
        title: "Coffee Shop Financial Simulator",
        description: "Adjust parameters to see how different factors affect the financial performance of a specialty coffee shop in SoHo",
        params: {
          dailyCustomers: 275,
          avgTransaction: 7.25,
          rentPerSqFt: 150,
          squareFootage: 900,
          laborPercent: 32,
          cogsPercent: 30
        },
        outputs: {
          monthlyRevenue: 60650,
          annualRevenue: 727800,
          monthlyCosts: 52580,
          annualProfit: 96840,
          breakEvenMonths: 16.5,
          roiPercent: 22
        },
        formula: function(params: any) {
          const dailyRevenue = params.dailyCustomers * params.avgTransaction;
          const monthlyRevenue = dailyRevenue * 30.42; // Average days per month
          const annualRevenue = dailyRevenue * 365;
          
          const monthlyRent = (params.rentPerSqFt * params.squareFootage) / 12;
          const monthlyCOGS = monthlyRevenue * (params.cogsPercent / 100);
          const monthlyLabor = monthlyRevenue * (params.laborPercent / 100);
          const monthlyUtilities = 2000 + (params.squareFootage * 0.5); // Base + per sq ft
          const monthlyOther = monthlyRevenue * 0.08; // Marketing, insurance, etc.
          
          const monthlyCosts = monthlyRent + monthlyCOGS + monthlyLabor + monthlyUtilities + monthlyOther;
          const monthlyProfit = monthlyRevenue - monthlyCosts;
          const annualProfit = monthlyProfit * 12;
          
          // Assuming initial investment of $400,000
          const initialInvestment = 400000;
          const roiPercent = (annualProfit / initialInvestment) * 100;
          
          // Break-even calculation
          const breakEvenMonths = monthlyProfit > 0 ? initialInvestment / monthlyProfit : 100;
          
          return {
            monthlyRevenue: Math.round(monthlyRevenue),
            annualRevenue: Math.round(annualRevenue),
            monthlyCosts: Math.round(monthlyCosts),
            annualProfit: Math.round(annualProfit),
            breakEvenMonths: Math.round(breakEvenMonths * 10) / 10,
            roiPercent: Math.round(roiPercent)
          };
        },
        visualizations: ['sim_chart1', 'sim_chart2']
      },
      
      dataAppendix: {
        datasets: [
          {
            name: "SoHo Pedestrian Traffic Analysis",
            description: "Daily pedestrian counts across different streets in SoHo, showing traffic patterns by time of day and day of week",
            source: "NYC Department of Transportation & Manual Observation Study",
            fields: [
              { name: "street_name", type: "string", description: "Name of the street where counting was performed" },
              { name: "day_of_week", type: "string", description: "Day of the week (Monday-Sunday)" },
              { name: "time_block", type: "string", description: "Time block for the count (Morning/Midday/Afternoon/Evening)" },
              { name: "pedestrian_count", type: "number", description: "Number of pedestrians counted in 1-hour period" },
              { name: "weather_condition", type: "string", description: "Weather during the count period" }
            ],
            sampleData: [
              { street_name: "Broadway", day_of_week: "Saturday", time_block: "Midday", pedestrian_count: 1450, weather_condition: "Sunny" },
              { street_name: "Broadway", day_of_week: "Monday", time_block: "Morning", pedestrian_count: 1100, weather_condition: "Clear" },
              { street_name: "Spring St", day_of_week: "Saturday", time_block: "Afternoon", pedestrian_count: 1200, weather_condition: "Sunny" },
              { street_name: "Prince St", day_of_week: "Sunday", time_block: "Midday", pedestrian_count: 1350, weather_condition: "Partly Cloudy" },
              { street_name: "Wooster St", day_of_week: "Wednesday", time_block: "Morning", pedestrian_count: 450, weather_condition: "Clear" }
            ]
          },
          {
            name: "Competitive Analysis Dataset",
            description: "Analysis of existing coffee shops in SoHo area, including offerings, pricing, and customer reviews",
            source: "Field Research & Public Review Aggregation",
            fields: [
              { name: "business_name", type: "string", description: "Name of the coffee establishment" },
              { name: "business_type", type: "string", description: "Type of establishment (Chain/Independent)" },
              { name: "avg_coffee_price", type: "number", description: "Average price of standard coffee offering" },
              { name: "avg_specialty_price", type: "number", description: "Average price of specialty coffee offering" },
              { name: "avg_rating", type: "number", description: "Average customer rating (1-5)" },
              { name: "seating_capacity", type: "number", description: "Approximate seating capacity" },
              { name: "has_food", type: "boolean", description: "Whether establishment offers food beyond pastries" }
            ],
            sampleData: [
              { business_name: "Starbucks (Broadway)", business_type: "Chain", avg_coffee_price: 4.25, avg_specialty_price: 5.75, avg_rating: 3.8, seating_capacity: 24, has_food: true },
              { business_name: "La Colombe", business_type: "Chain", avg_coffee_price: 4.50, avg_specialty_price: 6.25, avg_rating: 4.3, seating_capacity: 18, has_food: false },
              { business_name: "Cafe Integral", business_type: "Independent", avg_coffee_price: 4.75, avg_specialty_price: 7.00, avg_rating: 4.6, seating_capacity: 12, has_food: false },
              { business_name: "Ground Support", business_type: "Independent", avg_coffee_price: 5.00, avg_specialty_price: 6.50, avg_rating: 4.7, seating_capacity: 30, has_food: true },
              { business_name: "Blue Bottle", business_type: "Chain", avg_coffee_price: 5.25, avg_specialty_price: 7.50, avg_rating: 4.4, seating_capacity: 16, has_food: false }
            ]
          }
        ]
      },
      
      visualizations: {
        'exec_summary_chart': {
          type: 'bar',
          title: 'SoHo Coffee Market Overview',
          data: {
            labels: ['Chain Stores', 'Independent Shops', 'Potential Market Share'],
            datasets: [{
              label: 'Market Share (%)',
              data: [65, 27, 8],
              backgroundColor: ['#94a3b8', '#64748b', '#3b82f6']
            }]
          },
          sectionPlacement: 'executiveSummary'
        },
        'foot_traffic': {
          type: 'line',
          title: 'Daily Foot Traffic by Location',
          data: {
            labels: ['7am', '9am', '11am', '1pm', '3pm', '5pm', '7pm', '9pm'],
            datasets: [
              {
                label: 'Broadway',
                data: [600, 1200, 1100, 1300, 1400, 1450, 950, 600],
                borderColor: '#3b82f6',
                fill: false
              },
              {
                label: 'Side Streets',
                data: [200, 450, 500, 600, 650, 700, 500, 300],
                borderColor: '#64748b',
                fill: false
              }
            ]
          },
          options: {
            scales: {
              y: {
                title: {
                  display: true,
                  text: 'Pedestrian Count'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Time of Day'
                }
              }
            }
          },
          sectionPlacement: 'supportingEvidence',
          relatedSections: ['Market Analysis']
        },
        'price_chart': {
          type: 'radar',
          title: 'Price vs. Quality Perception',
          data: {
            labels: ['Price', 'Quality', 'Atmosphere', 'Service', 'Uniqueness'],
            datasets: [
              {
                label: 'Chain Coffee Shops',
                data: [3, 3.5, 3, 3.5, 2],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6'
              },
              {
                label: 'Independent Coffee Shops',
                data: [4, 4.5, 4, 3.5, 4.5],
                backgroundColor: 'rgba(100, 116, 139, 0.2)',
                borderColor: '#64748b'
              }
            ]
          },
          sectionPlacement: 'supportingEvidence',
          relatedSections: ['Competitive Landscape']
        },
        'sim_chart1': {
          type: 'bar',
          title: 'Monthly Revenue vs. Costs',
          data: {
            labels: ['Revenue', 'Rent', 'COGS', 'Labor', 'Utilities', 'Other', 'Profit'],
            datasets: [{
              label: 'Amount (USD)',
              data: [60650, 11250, 18195, 19408, 2450, 4852, 8075],
              backgroundColor: [
                '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280', '#22c55e'
              ]
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'USD'
                }
              }
            }
          },
          sectionPlacement: 'simulator',
          interactiveElements: {
            sliders: [
              {
                id: 'dailyCustomers',
                label: 'Daily Customer Count',
                min: 100,
                max: 500,
                step: 25,
                defaultValue: 275,
                description: 'Average number of daily transactions'
              },
              {
                id: 'avgTransaction',
                label: 'Average Transaction (USD)',
                min: 4,
                max: 12,
                step: 0.25,
                defaultValue: 7.25,
                description: 'Average spend per customer'
              }
            ]
          }
        },
        'sim_chart2': {
          type: 'line',
          title: 'Break-Even Analysis',
          data: {
            labels: ['0', '3', '6', '9', '12', '15', '18', '21', '24'],
            datasets: [{
              label: 'Cumulative Cash Flow',
              data: [-400000, -350000, -300000, -250000, -200000, -150000, -100000, -50000, 0, 50000],
              borderColor: '#3b82f6',
              pointBackgroundColor: '#3b82f6',
              tension: 0.4
            }]
          },
          options: {
            scales: {
              y: {
                title: {
                  display: true,
                  text: 'Cash Flow (USD)'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Months'
                }
              }
            }
          },
          sectionPlacement: 'simulator',
          interactiveElements: {
            sliders: [
              {
                id: 'rentPerSqFt',
                label: 'Rent per Square Foot (Annual)',
                min: 100,
                max: 200,
                step: 5,
                defaultValue: 150,
                description: 'Annual cost per square foot in USD'
              },
              {
                id: 'squareFootage',
                label: 'Square Footage',
                min: 600,
                max: 1500,
                step: 100,
                defaultValue: 900,
                description: 'Size of the coffee shop in square feet'
              }
            ]
          }
        },
        'dataset_viz': {
          type: 'pie',
          title: 'SoHo Coffee Shop Type Distribution',
          data: {
            labels: ['Chain (Standard)', 'Chain (Specialty)', 'Independent (Standard)', 'Independent (Specialty)'],
            datasets: [{
              data: [40, 25, 10, 25],
              backgroundColor: ['#94a3b8', '#64748b', '#3b82f6', '#1d4ed8']
            }]
          },
          options: {
            plugins: {
              legend: {
                position: 'right'
              }
            }
          },
          aiExplanation: "The distribution shows a market dominated by chain stores, but with significant specialty coffee presence. Independent specialty shops represent an area with growth potential.",
          sectionPlacement: 'dataAppendix'
        }
      }
    };
  }, [])
  
  return null
} 