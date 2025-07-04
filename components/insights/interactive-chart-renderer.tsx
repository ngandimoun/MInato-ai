"use client";

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Maximize2, 
  Minimize2, 
  BarChart3, 
  TrendingUp, 
  Info,
  Lightbulb
} from 'lucide-react';
import { ChartConfig } from '@/lib/services/DataVisualizationEngine';

// Dynamic imports for chart libraries
const Chart = dynamic(() => import('react-chartjs-2').then(mod => {
  // Register Chart.js components
  import('chart.js/auto');
  return mod;
}), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
});

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
});

// Import Recharts components
import {
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Pie
} from 'recharts';

interface InteractiveChartRendererProps {
  chartConfig: ChartConfig;
  height?: number;
  showInsights?: boolean;
  allowFullscreen?: boolean;
  showExportOptions?: boolean;
  className?: string;
}

export function InteractiveChartRenderer({
  chartConfig,
  height = 400,
  showInsights = true,
  allowFullscreen = true,
  showExportOptions = true,
  className = ""
}: InteractiveChartRendererProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = (format: 'png' | 'pdf' | 'svg') => {
    // Export functionality would be implemented here
    console.log(`Exporting chart as ${format}`);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderChart = () => {
    const { library, type, data, options } = chartConfig;

    switch (library) {
      case 'chartjs':
        return renderChartJsChart();
      case 'plotly':
        return renderPlotlyChart();
      case 'recharts':
        return renderRechartsChart();
      default:
        return renderFallbackChart();
    }
  };

  const renderChartJsChart = () => {
    const { type, data, options } = chartConfig;
    
    // Import Chart.js components dynamically
    const ChartComponent = dynamic(
      () => import('react-chartjs-2').then(mod => {
        switch (type) {
          case 'line': return mod.Line;
          case 'bar': return mod.Bar;
          case 'pie': return mod.Pie;
          case 'doughnut': return mod.Doughnut;
          case 'scatter': return mod.Scatter;
          case 'bubble': return mod.Bubble;
          case 'radar': return mod.Radar;
          case 'polarArea': return mod.PolarArea;
          default: return mod.Bar;
        }
      }),
      { ssr: false }
    );

    return (
      <div style={{ height: isFullscreen ? '80vh' : height }}>
        <ChartComponent 
          data={data} 
          options={{
            ...options,
            maintainAspectRatio: false,
            responsive: true
          }} 
        />
      </div>
    );
  };

  const renderPlotlyChart = () => {
    const { data, options } = chartConfig;
    
    return (
      <Plot
        data={data}
        layout={{
          ...options,
          height: isFullscreen ? window.innerHeight * 0.8 : height,
          autosize: true,
          margin: { l: 50, r: 50, t: 50, b: 50 }
        }}
        style={{ width: '100%', height: '100%' }}
        config={{
          displayModeBar: true,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
          responsive: true
        }}
      />
    );
  };

  const renderRechartsChart = () => {
    const { type, data } = chartConfig;
    
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '80vh' : height}>
            <LineChart data={data.datasets?.[0]?.data || data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="y" stroke={colors[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '80vh' : height}>
            <BarChart data={transformChartJsToRecharts(data)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '80vh' : height}>
            <PieChart>
              <Pie
                data={transformPieDataToRecharts(data)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {transformPieDataToRecharts(data).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return renderFallbackChart();
    }
  };

  const renderFallbackChart = () => (
    <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
      <div className="text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-2">Chart Type Not Supported</h3>
        <p className="text-sm text-muted-foreground">
          Chart type "{chartConfig.type}" with library "{chartConfig.library}" is not yet implemented
        </p>
      </div>
    </div>
  );

  const transformChartJsToRecharts = (chartjsData: any) => {
    if (!chartjsData.labels || !chartjsData.datasets) return [];
    
    return chartjsData.labels.map((label: string, index: number) => ({
      name: label,
      value: chartjsData.datasets[0]?.data[index] || 0
    }));
  };

  const transformPieDataToRecharts = (chartjsData: any) => {
    if (!chartjsData.labels || !chartjsData.datasets) return [];
    
    return chartjsData.labels.map((label: string, index: number) => ({
      name: label,
      value: chartjsData.datasets[0]?.data[index] || 0
    }));
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">{chartConfig.title}</h2>
              {chartConfig.description && (
                <p className="text-sm text-muted-foreground">{chartConfig.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showExportOptions && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
                    PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('svg')}>
                    SVG
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Fullscreen Content */}
          <div className="flex-1 p-4">
            {renderChart()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{chartConfig.title}</CardTitle>
            {chartConfig.description && (
              <CardDescription>{chartConfig.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {chartConfig.library}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {chartConfig.type}
            </Badge>
            {allowFullscreen && (
              <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {showInsights && chartConfig.insights ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="chart" className="flex-1">
                <BarChart3 className="h-4 w-4 mr-2" />
                Chart
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex-1">
                <Lightbulb className="h-4 w-4 mr-2" />
                Insights
              </TabsTrigger>
              {showExportOptions && (
                <TabsTrigger value="export" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="chart" className="m-0">
              <div className="p-4">
                {renderChart()}
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="m-0">
              <div className="p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Key Insights
                </h4>
                <ul className="space-y-2">
                  {chartConfig.insights?.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            
            {showExportOptions && (
              <TabsContent value="export" className="m-0">
                <div className="p-4 space-y-4">
                  <h4 className="font-medium">Export Options</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" onClick={() => handleExport('png')}>
                      <Download className="h-4 w-4 mr-2" />
                      PNG
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')}>
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('svg')}>
                      <Download className="h-4 w-4 mr-2" />
                      SVG
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Export your chart in various formats for presentations and reports
                  </p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="p-4">
            {renderChart()}
          </div>
        )}
        
        {showExportOptions && !showInsights && (
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Export:</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleExport('png')}>
                  PNG
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')}>
                  PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleExport('svg')}>
                  SVG
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Multi-chart dashboard component
interface ChartDashboardProps {
  charts: ChartConfig[];
  title?: string;
  description?: string;
  layout?: 'grid' | 'tabs' | 'carousel';
  columns?: 1 | 2 | 3 | 4;
}

export function ChartDashboard({ 
  charts, 
  title = "Data Visualizations",
  description,
  layout = 'grid',
  columns = 2 
}: ChartDashboardProps) {
  const [selectedChart, setSelectedChart] = useState(0);

  if (charts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No Charts Available</h3>
          <p className="text-sm text-muted-foreground">
            Charts will appear here once your data is analyzed
          </p>
        </CardContent>
      </Card>
    );
  }

  if (layout === 'tabs') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Tabs value={selectedChart.toString()} onValueChange={(value) => setSelectedChart(parseInt(value))}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(charts.length, 4)}, 1fr)` }}>
              {charts.slice(0, 4).map((chart, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  {chart.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {charts.map((chart, index) => (
              <TabsContent key={index} value={index.toString()}>
                <InteractiveChartRenderer 
                  chartConfig={chart}
                  height={500}
                  showInsights={true}
                  allowFullscreen={true}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // Grid layout
  return (
    <div className="space-y-6">
      {title && (
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      
      <div 
        className={`grid gap-6`}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {charts.map((chart, index) => (
          <InteractiveChartRenderer
            key={index}
            chartConfig={chart}
            height={400}
            showInsights={true}
            allowFullscreen={true}
            showExportOptions={true}
          />
        ))}
      </div>
    </div>
  );
}