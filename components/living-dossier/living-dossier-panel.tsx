"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LivingDossierProvider } from '@/livingdossier/context/LivingDossierContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Search, History, ArrowRight } from 'lucide-react';

export function LivingDossierPanel() {
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentDossiers, setRecentDossiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch recent dossiers
  useEffect(() => {
    const fetchRecentDossiers = async () => {
      try {
        const response = await fetch('/api/living-dossier/list');
        if (response.ok) {
          const data = await response.json();
          setRecentDossiers(data.dossiers || []);
        }
      } catch (error) {
        console.error('Error fetching recent dossiers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentDossiers();
  }, []);

  // Handle dossier generation
  const handleGenerateDossier = async () => {
    if (!query.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/living-dossier/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate dossier');
      }
      
      const data = await response.json();
      router.push(`/living-dossier/${data.dossierId}`);
    } catch (error) {
      console.error('Error generating dossier:', error);
      setIsGenerating(false);
    }
  };

  return (
    <LivingDossierProvider>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Living Dossiers</h1>
          <p className="text-muted-foreground">
            Transform complex questions into interactive, data-driven experiences that help you make informed decisions.
          </p>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create a New Living Dossier</CardTitle>
            <CardDescription>
              Ask a complex question and get a comprehensive, interactive analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="E.g., Is opening a specialty coffee shop in SoHo, NYC viable?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button 
                onClick={handleGenerateDossier} 
                disabled={!query.trim() || isGenerating}
                className="md:w-auto"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    Generate Dossier
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Living Dossiers analyze data from multiple sources to provide comprehensive insights.
          </CardFooter>
        </Card>
        
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Dossiers</h2>
          <Button variant="outline" size="sm" onClick={() => router.push('/living-dossier/example')}>
            View Example
          </Button>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-8 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : recentDossiers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentDossiers.map((dossier) => (
              <Card key={dossier.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{dossier.title || 'Untitled Dossier'}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={dossier.status === 'completed' ? 'default' : 'outline'}>
                      {dossier.status}
                    </Badge>
                    {dossier.domain && (
                      <Badge variant="secondary">{dossier.domain}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dossier.query}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push(`/living-dossier/${dossier.id}`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Dossier
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>No dossiers yet</CardTitle>
              <CardDescription>
                Create your first Living Dossier by entering a question above
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => router.push('/living-dossier/example')}
              >
                View Example Dossier
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </LivingDossierProvider>
  );
}
