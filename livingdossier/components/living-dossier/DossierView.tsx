'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Share2, 
  FileText, 
  BarChart3, 
  Calculator, 
  Database,
  Lightbulb,
  ExternalLink
} from 'lucide-react'

import { LivingDossier, useLivingDossier } from '@/livingdossier/context/LivingDossierContext'

// Import any chart library components you're using
import { 
  Bar, 
  Line,
  Pie,
  Radar,
  Scatter,
  Doughnut
} from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

// Register the chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
)

interface DossierViewProps {
  dossierId: string
}

export default function DossierView({ dossierId }: DossierViewProps) {
  const { state, getDossier, updateSimulatorParam, resetSimulator } = useLivingDossier()
  const { dossier, isLoading, error } = state
  
  const [activeTab, setActiveTab] = useState('executive-summary')
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  // Fetch dossier data when component mounts
  React.useEffect(() => {
    getDossier(dossierId)
  }, [dossierId, getDossier])

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Progress value={state.progress} className="w-[60%] mb-4" />
        <p className="text-muted-foreground text-sm">
          Loading dossier... {state.progress}%
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>An error occurred while fetching this dossier</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={() => getDossier(dossierId)} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!dossier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dossier Not Found</CardTitle>
          <CardDescription>The requested dossier could not be found</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="container max-w-5xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{dossier.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{dossier.domain}</Badge>
            <Badge variant="secondary">{new Date(dossier.updatedAt).toLocaleDateString()}</Badge>
            <Badge variant={dossier.status === 'completed' ? 'default' : 'outline'}>
              {dossier.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
          <Button size="sm" variant="outline">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:grid-cols-4">
          <TabsTrigger value="executive-summary" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Executive Summary</span>
            <span className="sm:hidden">Summary</span>
          </TabsTrigger>
          <TabsTrigger value="supporting-evidence" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Supporting Evidence</span>
            <span className="sm:hidden">Evidence</span>
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center">
            <Calculator className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Interactive Simulator</span>
            <span className="sm:hidden">Simulator</span>
          </TabsTrigger>
          <TabsTrigger value="data-appendix" className="flex items-center">
            <Database className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Data Appendix</span>
            <span className="sm:hidden">Data</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Executive Summary Tab */}
        <TabsContent value="executive-summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
              <CardDescription>Key findings and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <p>{dossier.executiveSummary?.text}</p>
              </div>
              
              {/* Visualizations for executive summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {Object.entries(dossier.visualizations || {})
                  .filter(([_, viz]: [string, any]) => viz.sectionPlacement === 'executiveSummary')
                  .map(([id, viz]: [string, any]) => (
                    <Card key={id} className="overflow-hidden">
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg">{viz.title}</CardTitle>
                        {viz.description && (
                          <CardDescription>{viz.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {renderVisualization(viz)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Key Points</h3>
                  <ul className="space-y-2">
                    {dossier.executiveSummary?.keyPoints.map((point: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {dossier.executiveSummary?.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <div className="bg-primary/10 rounded-full p-1 h-6 w-6 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-xs font-medium">{i + 1}</span>
                        </div>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Supporting Evidence Tab */}
        <TabsContent value="supporting-evidence" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supporting Evidence</CardTitle>
              <CardDescription>Detailed analysis and research</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {dossier.supportingEvidence?.sections.map((section: any, i: number) => {
                const isExpanded = expandedSections.includes(`section-${i}`);
                const sectionVisualizations = Object.entries(dossier.visualizations || {})
                  .filter(([_, viz]: [string, any]) => 
                    viz.sectionPlacement === 'supportingEvidence' && 
                    viz.relatedSections?.includes(section.title)
                  )
                  .map(([id, viz]) => ({ id, viz }));

                return (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div 
                      className="p-4 flex justify-between items-center cursor-pointer bg-muted/50"
                      onClick={() => toggleSection(`section-${i}`)}
                    >
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                      <Button variant="ghost" size="icon">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 prose max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: section.content }} />
                        
                        {sectionVisualizations.length > 0 && (
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sectionVisualizations.map(({ id, viz }) => (
                              <div key={id} className="border rounded-md p-4">
                                <h4 className="text-base font-medium mb-2">{viz.title}</h4>
                                {renderVisualization(viz)}
                                {viz.aiExplanation && (
                                  <p className="mt-2 text-sm text-muted-foreground">{viz.aiExplanation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Sources</h3>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {dossier.supportingEvidence?.sources.map((source: any, i: number) => (
                    <Card key={i}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">{source.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm text-muted-foreground mb-2">Relevance: {source.relevance * 100}%</p>
                        <Button variant="link" className="p-0 h-auto" asChild>
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <span>Visit Source</span>
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Interactive Simulator Tab */}
        <TabsContent value="simulator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{dossier.simulator?.title || "Interactive Simulator"}</CardTitle>
              <CardDescription>{dossier.simulator?.description || "Adjust parameters to see different outcomes"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                  <h3 className="text-lg font-semibold">Parameters</h3>
                  
                  {Object.entries(dossier.simulator?.params || {}).map(([key, value]) => {
                    // Find slider configuration from visualizations
                    let sliderConfig: any = null;
                    Object.values(dossier.visualizations || {}).forEach(viz => {
                      if (viz.interactiveElements?.sliders) {
                        const slider = viz.interactiveElements.sliders.find((s: any) => s.id === key);
                        if (slider) sliderConfig = slider;
                      }
                    });
                    
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium">
                            {sliderConfig?.label || key}
                          </label>
                          <span className="text-sm">{value}</span>
                        </div>
                        <Slider
                          defaultValue={[value as number]}
                          min={sliderConfig?.min || 0}
                          max={sliderConfig?.max || 100}
                          step={sliderConfig?.step || 1}
                          onValueChange={([val]) => updateSimulatorParam(key, val)}
                        />
                        {sliderConfig?.description && (
                          <p className="text-xs text-muted-foreground">{sliderConfig.description}</p>
                        )}
                      </div>
                    );
                  })}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={resetSimulator}
                  >
                    Reset to Defaults
                  </Button>
                </div>
                
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-lg font-semibold">Simulation Results</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(dossier.simulator?.outputs || {}).map(([key, value]) => (
                      <Card key={key}>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{key}</p>
                          <p className="text-2xl font-semibold">{formatSimulatorValue(value)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    {Object.entries(dossier.visualizations || {})
                      .filter(([_, viz]: [string, any]) => viz.sectionPlacement === 'simulator')
                      .map(([id, viz]: [string, any]) => (
                        <Card key={id} className="mb-4">
                          <CardHeader className="py-3">
                            <CardTitle className="text-lg">{viz.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderVisualization(viz)}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Data Appendix Tab */}
        <TabsContent value="data-appendix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Appendix</CardTitle>
              <CardDescription>Datasets and sources used in this analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                {dossier.dataAppendix?.datasets.map((dataset, i) => {
                  const isExpanded = expandedSections.includes(`dataset-${i}`);
                  
                  return (
                    <Card key={i}>
                      <CardHeader className="py-3 cursor-pointer" onClick={() => toggleSection(`dataset-${i}`)}>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{dataset.name}</CardTitle>
                          <Button variant="ghost" size="icon">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                        <CardDescription>{dataset.description}</CardDescription>
                        <p className="text-sm text-muted-foreground">Source: {dataset.source}</p>
                      </CardHeader>
                      
                      {isExpanded && (
                        <CardContent>
                          <h4 className="font-medium mb-2 text-sm">Fields</h4>
                          <div className="border rounded overflow-hidden">
                            <table className="min-w-full divide-y">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Field</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {dataset.fields.map((field, j) => (
                                  <tr key={j}>
                                    <td className="px-4 py-2 text-sm">{field.name}</td>
                                    <td className="px-4 py-2 text-sm">{field.type}</td>
                                    <td className="px-4 py-2 text-sm">{field.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {dataset.sampleData && dataset.sampleData.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium mb-2 text-sm">Sample Data</h4>
                              <div className="border rounded overflow-x-auto">
                                <table className="min-w-full divide-y">
                                  <thead className="bg-muted">
                                    <tr>
                                      {Object.keys(dataset.sampleData[0]).map((key, k) => (
                                        <th key={k} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          {key}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {dataset.sampleData.slice(0, 5).map((row, r) => (
                                      <tr key={r}>
                                        {Object.values(row).map((cell, c) => (
                                          <td key={c} className="px-4 py-2 text-sm">
                                            {formatCellValue(cell)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Data Visualizations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(dossier.visualizations || {})
                    .filter(([_, viz]: [string, any]) => viz.sectionPlacement === 'dataAppendix')
                    .map(([id, viz]: [string, any]) => (
                      <Card key={id}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-lg">{viz.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {renderVisualization(viz)}
                          {viz.description && (
                            <p className="mt-2 text-sm text-muted-foreground">{viz.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function renderVisualization(viz: any) {
  const { type, data, options = {} } = viz;
  
  switch (type) {
    case 'bar':
      return <Bar data={data} options={options} />;
    case 'line':
      return <Line data={data} options={options} />;
    case 'pie':
      return <Pie data={data} options={options} />;
    case 'radar':
      return <Radar data={data} options={options} />;
    case 'scatter':
      return <Scatter data={data} options={options} />;
    case 'doughnut':
      return <Doughnut data={data} options={options} />;
    default:
      return (
        <div className="p-4 border rounded bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            Visualization type "{type}" not supported
          </p>
        </div>
      );
  }
}

function formatSimulatorValue(value: any): string {
  if (typeof value === 'number') {
    // Format as currency if it looks like a monetary value
    if (value > 100) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    
    // Format as percentage if it's between 0 and 1
    if (value >= 0 && value <= 1) {
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(value);
    }
    
    // Otherwise format as a number
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  return String(value);
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
} 