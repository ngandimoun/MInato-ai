"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AIParameterOptimizer, 
  type OptimalImageParameters,
  type ImageGenerationContext
} from './ai-parameter-optimizer';
import { CATEGORY_INFO, type ImageCategory } from './category-types';
import { Sparkles, Zap, Target, Settings } from 'lucide-react';

interface DemoScenario {
  id: string;
  name: string;
  category: ImageCategory;
  formValues: Record<string, any>;
  userPrompt: string;
  description: string;
  expectedOptimizations: string[];
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'instagram-text',
    name: 'Instagram Post with Text',
    category: 'social-media',
    formValues: {
      platform: 'instagram-post',
      postTopic: 'Summer Sale Announcement',
      textOnImage: '50% OFF Everything!',
      visualStyle: 'vibrant-colorful'
    },
    userPrompt: 'Create an eye-catching Instagram post announcing our summer sale',
    description: 'Social media post with promotional text requiring high readability',
    expectedOptimizations: ['PNG format for text clarity', 'Square aspect ratio', 'High quality for engagement']
  },
  {
    id: 'tech-logo',
    name: 'Tech Company Logo',
    category: 'logo-brand',
    formValues: {
      companyName: 'AI Innovations',
      logoStyle: 'minimalist-abstract',
      industry: 'technology',
      coreFeeling: ['modern', 'innovative', 'trustworthy']
    },
    userPrompt: 'Design a modern minimalist logo for AI Innovations',
    description: 'Professional logo requiring scalability and transparency',
    expectedOptimizations: ['Transparent background', 'PNG format', 'High quality', 'Square format']
  },
  {
    id: 'shopping-icon',
    name: 'Shopping Cart Icon',
    category: 'ui-components',
    formValues: {
      componentType: 'icon',
      iconRepresents: 'Shopping cart for e-commerce',
      iconStyle: 'line-art'
    },
    userPrompt: 'Create a clean shopping cart icon',
    description: 'UI icon needing transparency and scalability',
    expectedOptimizations: ['Transparent background', 'Square format', 'PNG format', 'Icon optimization']
  },
  {
    id: 'business-card',
    name: 'Professional Business Card',
    category: 'marketing',
    formValues: {
      materialType: 'business-card'
    },
    userPrompt: 'Design a professional business card',
    description: 'Print material requiring maximum quality',
    expectedOptimizations: ['High quality for print', 'PNG format', 'No compression']
  },
  {
    id: 'website-banner',
    name: 'Website Header Banner',
    category: 'banners',
    formValues: {},
    userPrompt: 'Create a website header banner',
    description: 'Web banner optimized for loading speed and visual impact',
    expectedOptimizations: ['Landscape format', 'JPEG compression', 'Web optimization']
  },
  {
    id: 'sales-chart',
    name: 'Sales Data Chart',
    category: 'data-viz',
    formValues: {},
    userPrompt: 'Create a bar chart showing quarterly sales data',
    description: 'Data visualization with text and precise details',
    expectedOptimizations: ['PNG for clarity', 'High quality', 'Text preservation']
  },
  {
    id: 'character-art',
    name: 'Character Illustration',
    category: 'illustrations',
    formValues: {},
    userPrompt: 'Draw a fantasy character illustration',
    description: 'Artistic illustration with rich colors and details',
    expectedOptimizations: ['High quality', 'Color preservation', 'PNG format']
  },
  {
    id: 'tshirt-mockup',
    name: 'T-Shirt Design Mockup',
    category: 'product-mockups',
    formValues: {},
    userPrompt: 'Show a t-shirt design mockup',
    description: 'Product visualization for marketing materials',
    expectedOptimizations: ['High quality', 'Product focus', 'Square format']
  },
  {
    id: 'company-letterhead',
    name: 'Company Letterhead',
    category: 'letterhead',
    formValues: {},
    userPrompt: 'Design a professional company letterhead',
    description: 'Corporate document header for official use',
    expectedOptimizations: ['Portrait format', 'High quality', 'Professional styling']
  },
  {
    id: 'professional-avatar',
    name: 'Professional Avatar',
    category: 'ai-avatars',
    formValues: {
      avatarStyle: 'professional'
    },
    userPrompt: 'Create a professional business avatar',
    description: 'Professional headshot with optional transparency',
    expectedOptimizations: ['Square format', 'Transparent option', 'High quality']
  }
];

export function AIOptimizationDemo() {
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [optimizedParams, setOptimizedParams] = useState<OptimalImageParameters | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    scenario: string;
    params: OptimalImageParameters;
  }>>([]);

  const analyzeScenario = async (scenario: DemoScenario) => {
    setIsAnalyzing(true);
    try {
      // Analyze context
      const context: ImageGenerationContext = AIParameterOptimizer.analyzeContext(
        scenario.category,
        scenario.formValues,
        scenario.userPrompt
      );

      // Get optimal parameters
      const params = await AIParameterOptimizer.optimizeParameters(context);
      setOptimizedParams(params);
      
      // Add to history
      setAnalysisHistory(prev => [...prev.slice(-4), {
        scenario: scenario.name,
        params
      }]);
      
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    analyzeScenario(selectedScenario);
  }, [selectedScenario]);

  const getParameterColor = (param: string, value: any) => {
    if (param === 'quality' && value === 'high') return 'bg-green-100 text-green-800';
    if (param === 'format' && value === 'png') return 'bg-blue-100 text-blue-800';
    if (param === 'format' && value === 'jpeg') return 'bg-orange-100 text-orange-800';
    if (param === 'format' && value === 'webp') return 'bg-purple-100 text-purple-800';
    if (param === 'background' && value === 'transparent') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-violet-600" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            AI Parameter Optimization Demo
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover how our AI intelligently selects optimal image generation parameters based on your specific needs across all 10 specialized categories.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Choose Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DEMO_SCENARIOS.map((scenario) => (
                <Button
                  key={scenario.id}
                  variant={selectedScenario.id === scenario.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <div>
                    <div className="font-medium">{scenario.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {CATEGORY_INFO[scenario.category].name}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Scenario Info */}
              <div>
                <h3 className="font-semibold text-lg">{selectedScenario.name}</h3>
                <Badge variant="secondary" className="mb-2">
                  {CATEGORY_INFO[selectedScenario.category].name}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {selectedScenario.description}
                </p>
              </div>

              <Separator />

              {/* User Prompt */}
              <div>
                <div className="text-sm font-medium mb-1">User Prompt:</div>
                <div className="text-sm bg-muted p-2 rounded italic">
                  "{selectedScenario.userPrompt}"
                </div>
              </div>

              {/* Form Values */}
              {Object.keys(selectedScenario.formValues).length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Form Data:</div>
                  <div className="space-y-1">
                    {Object.entries(selectedScenario.formValues).map(([key, value]) => (
                      <div key={key} className="text-xs flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expected Optimizations */}
              <div>
                <div className="text-sm font-medium mb-2">Expected Optimizations:</div>
                <div className="space-y-1">
                  {selectedScenario.expectedOptimizations.map((opt, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-1 h-1 bg-violet-500 rounded-full" />
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimized Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Optimized Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
              </div>
            ) : optimizedParams ? (
              <div className="space-y-4">
                {/* Parameters Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Size</div>
                    <Badge className={getParameterColor('size', optimizedParams.size)}>
                      {optimizedParams.size}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Quality</div>
                    <Badge className={getParameterColor('quality', optimizedParams.quality)}>
                      {optimizedParams.quality}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Format</div>
                    <Badge className={getParameterColor('format', optimizedParams.format)}>
                      {optimizedParams.format.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Background</div>
                    <Badge className={getParameterColor('background', optimizedParams.background)}>
                      {optimizedParams.background}
                    </Badge>
                  </div>
                </div>

                {/* Compression */}
                {optimizedParams.compression && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Compression</div>
                    <Badge variant="outline">
                      {optimizedParams.compression}%
                    </Badge>
                  </div>
                )}

                <Separator />

                {/* AI Reasoning */}
                <div>
                  <div className="text-sm font-medium mb-2">AI Reasoning:</div>
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                    {optimizedParams.reasoning}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => analyzeScenario(selectedScenario)}>
                    Re-analyze
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const nextIndex = (DEMO_SCENARIOS.findIndex(s => s.id === selectedScenario.id) + 1) % DEMO_SCENARIOS.length;
                    setSelectedScenario(DEMO_SCENARIOS[nextIndex]);
                  }}>
                    Next Scenario
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a scenario to see AI optimization
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis History */}
      {analysisHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Analysis History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysisHistory.slice(-6).map((analysis, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="font-medium text-sm">{analysis.scenario}</div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {analysis.params.format.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {analysis.params.size}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {analysis.params.quality}
                    </Badge>
                    {analysis.params.background === 'transparent' && (
                      <Badge variant="outline" className="text-xs">
                        transparent
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-violet-600">10</div>
              <div className="text-sm text-muted-foreground">Specialized Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">5</div>
              <div className="text-sm text-muted-foreground">Parameter Types</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-sm text-muted-foreground">Output Formats</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">100%</div>
              <div className="text-sm text-muted-foreground">AI-Driven Selection</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 