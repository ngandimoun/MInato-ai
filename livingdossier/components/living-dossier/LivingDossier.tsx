import React, { useState } from "react"
import { Card } from "../../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Slider } from "../../../components/ui/slider"
import { Input } from "../../../components/ui/input"
import { Badge } from "../../../components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../components/ui/accordion"
import { ExternalLink, Download, Share2, Maximize2, Info } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/ui/tooltip"
import dynamic from "next/dynamic"

// Dynamic import for client-side only components
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })
const Map = dynamic(() => import("../map/MapComponent"), { ssr: false })

interface LivingDossierProps {
  title: string
  query: string
  executiveSummary: {
    recommendation: string
    keyMetrics: Array<{
      label: string
      value: string | number
    }>
  }
  supportingEvidence: {
    maps?: {
      center: [number, number]
      markers: Array<{
        position: [number, number]
        name: string
        details: string
      }>
    }
    charts: Array<{
      type: "bar" | "line" | "pie" | "area"
      title: string
      data: any
      options?: any
      aiExplanation: string
    }>
    customerQuotes?: Array<{
      quote: string
      source: string
    }>
    videoEvidence?: Array<{
      title: string
      youtubeId: string
      description: string
    }>
  }
  simulator: {
    title: string
    description: string
    parameters: Array<{
      id: string
      name: string
      type: "slider" | "input"
      min?: number
      max?: number
      step?: number
      defaultValue: number
      unit?: string
    }>
    formula: (params: Record<string, number>) => Record<string, number>
    outputs: Array<{
      id: string
      name: string
      format: (value: number) => string
    }>
    visualizations: Array<{
      type: "bar" | "line"
      title: string
      options?: any
      getDataFromParams: (params: Record<string, number>) => any
    }>
  }
  dataAppendix: {
    rawData: Array<{
      title: string
      data: any
    }>
    sources: Array<{
      name: string
      url: string
      type: string
    }>
    methodology: string
  }
}

export function LivingDossier(props: LivingDossierProps) {
  // State for the simulator parameters
  const [simulatorParams, setSimulatorParams] = useState<Record<string, number>>(
    Object.fromEntries(props.simulator.parameters.map(param => [param.id, param.defaultValue]))
  )
  
  // Calculate outputs based on current parameters
  const simulatorOutputs = props.simulator.formula(simulatorParams)
  
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <section id="executive-summary" className="scroll-mt-16">
        <Card className="p-6 border-l-4 border-l-blue-500">
          <h1 className="text-3xl font-bold mb-4">{props.title}</h1>
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Executive Recommendation</h2>
            <p className="text-lg">{props.executiveSummary.recommendation}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {props.executiveSummary.keyMetrics.map((metric, i) => (
              <Card key={i} className="p-4 bg-slate-50 text-center">
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </Card>
            ))}
          </div>
        </Card>
      </section>
      
      {/* SECTION 2: SUPPORTING EVIDENCE */}
      <section id="supporting-evidence" className="scroll-mt-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Supporting Evidence</h2>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4 mr-2" />
                    About This Analysis
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="w-80 p-3">
                  <p>This section presents the evidence and data that support our recommendations. Each visualization is accompanied by AI-generated explanations to help you understand the insights.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Maps */}
          {props.supportingEvidence.maps && (
            <Card className="p-4">
              <h3 className="text-xl font-semibold mb-2">Geographic Analysis</h3>
              <div className="h-[400px] w-full rounded-md overflow-hidden">
                <Map 
                  center={props.supportingEvidence.maps.center}
                  markers={props.supportingEvidence.maps.markers}
                />
              </div>
            </Card>
          )}
          
          {/* Charts with AI Explanations */}
          {props.supportingEvidence.charts.map((chart, i) => (
            <Card key={i} className="p-4">
              <div className="md:grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{chart.title}</h3>
                  <div className="h-[300px] mt-4">
                    <Chart 
                      options={chart.options || {
                        chart: {
                          type: chart.type,
                          toolbar: {
                            show: false
                          }
                        },
                        xaxis: {
                          type: "category"
                        },
                        theme: {
                          mode: "light"
                        }
                      }}
                      series={chart.data}
                      type={chart.type}
                      height="100%"
                    />
                  </div>
                </div>
                <div className="mt-4 md:mt-6">
                  <h4 className="text-lg font-medium mb-2">AI Analysis</h4>
                  <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                    <p>{chart.aiExplanation}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Customer Voice */}
          {props.supportingEvidence.customerQuotes && props.supportingEvidence.customerQuotes.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xl font-semibold mb-2">Voice of the Customer</h3>
              <div className="space-y-4">
                {props.supportingEvidence.customerQuotes.map((quote, i) => (
                  <blockquote key={i} className="border-l-4 border-slate-300 pl-4 italic">
                    "{quote.quote}"
                    <footer className="text-sm text-muted-foreground mt-1">— {quote.source}</footer>
                  </blockquote>
                ))}
              </div>
            </Card>
          )}
          
          {/* Video Evidence */}
          {props.supportingEvidence.videoEvidence && props.supportingEvidence.videoEvidence.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xl font-semibold mb-2">Visual Case Studies</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {props.supportingEvidence.videoEvidence.map((video, i) => (
                  <div key={i}>
                    <div className="aspect-video">
                      <iframe 
                        className="w-full h-full rounded"
                        src={`https://www.youtube.com/embed/${video.youtubeId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <h4 className="font-medium mt-2">{video.title}</h4>
                    <p className="text-sm text-muted-foreground">{video.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </section>
      
      {/* SECTION 3: INTERACTIVE SIMULATOR */}
      <section id="interactive-simulator" className="scroll-mt-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Interactive Simulator</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" className="w-80 p-3">
                <p>Adjust the parameters to see how they affect the outcomes. This simulator gives you a hands-on understanding of the key factors and their relationships.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-2">{props.simulator.title}</h3>
          <p className="mb-6">{props.simulator.description}</p>
          
          <div className="md:grid md:grid-cols-5 gap-6">
            {/* Controls */}
            <div className="md:col-span-2 space-y-6">
              {props.simulator.parameters.map(param => (
                <div key={param.id} className="space-y-2">
                  <div className="flex justify-between">
                    <label htmlFor={param.id} className="text-sm font-medium">
                      {param.name}
                    </label>
                    <span className="text-sm font-medium">
                      {simulatorParams[param.id]}{param.unit || ''}
                    </span>
                  </div>
                  
                  {param.type === "slider" ? (
                    <Slider 
                      id={param.id}
                      min={param.min} 
                      max={param.max} 
                      step={param.step}
                      value={[simulatorParams[param.id]]}
                      onValueChange={value => {
                        setSimulatorParams({...simulatorParams, [param.id]: value[0]})
                      }}
                    />
                  ) : (
                    <Input 
                      id={param.id}
                      type="number" 
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={simulatorParams[param.id]}
                      onChange={e => {
                        setSimulatorParams({
                          ...simulatorParams, 
                          [param.id]: Number(e.target.value)
                        })
                      }}
                    />
                  )}
                </div>
              ))}
              
              <div className="p-4 bg-slate-100 rounded-md mt-8">
                <h4 className="font-medium mb-2">Results</h4>
                <div className="space-y-2">
                  {props.simulator.outputs.map(output => (
                    <div key={output.id} className="flex justify-between items-center">
                      <span>{output.name}:</span>
                      <span className="font-bold">{output.format(simulatorOutputs[output.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Visualizations */}
            <div className="md:col-span-3 mt-6 md:mt-0">
              <Tabs defaultValue="chart0">
                <TabsList className="w-full">
                  {props.simulator.visualizations.map((viz, i) => (
                    <TabsTrigger key={i} value={`chart${i}`} className="flex-1">
                      Chart {i+1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {props.simulator.visualizations.map((viz, i) => (
                  <TabsContent key={i} value={`chart${i}`} className="mt-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">{viz.title}</h4>
                      <div className="h-[300px]">
                        <Chart 
                          options={viz.options || {
                            chart: {
                              type: viz.type,
                              toolbar: {
                                show: false
                              }
                            },
                            theme: {
                              mode: "light"
                            }
                          }}
                          series={viz.getDataFromParams(simulatorParams)}
                          type={viz.type}
                          height="100%"
                        />
                      </div>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </Card>
      </section>
      
      {/* SECTION 4: DATA APPENDIX & SOURCES */}
      <section id="data-appendix" className="scroll-mt-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Data Appendix & Sources</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Full Data
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        <Card className="p-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="methodology">
              <AccordionTrigger>Research Methodology</AccordionTrigger>
              <AccordionContent>
                {props.dataAppendix.methodology}
              </AccordionContent>
            </AccordionItem>
            
            {props.dataAppendix.rawData.map((item, i) => (
              <AccordionItem key={i} value={`data-${i}`}>
                <AccordionTrigger>{item.title}</AccordionTrigger>
                <AccordionContent>
                  <pre className="overflow-auto p-4 bg-slate-50 rounded-md text-xs">
                    {JSON.stringify(item.data, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            ))}
            
            <AccordionItem value="sources">
              <AccordionTrigger>Sources & References</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {props.dataAppendix.sources.map((source, i) => (
                    <li key={i}>
                      <a 
                        href={source.url} 
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="flex items-center text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {source.name} <span className="text-gray-500 mx-2">·</span> 
                        <Badge variant="outline">{source.type}</Badge>
                      </a>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </section>
    </div>
  )
} 