"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, FileText, RotateCw, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useMobile } from '../../hooks/use-mobile';

interface LivingDossier {
  id: string;
  title?: string;
  query: string;
  refined_query?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  nextjs_url?: string;
  streamlit_url?: string;
  pdf_url?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

interface DossierListProps {
  onCreateNew: () => void;
  onViewDossier?: (dossier: LivingDossier) => void;
}

export function DossierList({ onCreateNew, onViewDossier }: DossierListProps) {
  const { session } = useAuth();
  const [dossiers, setDossiers] = useState<LivingDossier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'title' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const isMobile = useMobile();

  // Fetch user's dossiers
  useEffect(() => {
    const fetchDossiers = async () => {
      if (!session?.access_token) {
        setDossiers([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/living-dossier/list", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setDossiers(data.dossiers || []);
      } catch (err) {
        console.error("Error fetching dossiers:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    fetchDossiers();
  }, [session, refreshFlag]);

  // Helper to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString();
  };

  // Helper to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "processing": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  // Check status for dossiers that are still processing
  const refreshDossierStatus = async (dossierId: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`/api/living-dossier/${dossierId}/status`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const updatedDossier = await response.json();
      setDossiers(prev => prev.map(dossier => 
        dossier.id === dossierId ? { ...dossier, ...updatedDossier } : dossier
      ));

      if (updatedDossier.status === "completed") {
        toast({
          title: "Dossier Ready",
          description: `Your dossier "${updatedDossier.title || 'Untitled'}" is now ready to view.`,
        });
      } else if (updatedDossier.status === "failed") {
        toast({
          title: "Dossier Generation Failed",
          description: updatedDossier.error || "An unknown error occurred during generation.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error refreshing dossier status:", err);
      toast({
        title: "Error",
        description: "Failed to refresh dossier status",
        variant: "destructive",
      });
    }
  };

  // Refresh all processing dossiers
  const refreshProcessingDossiers = () => {
    dossiers
      .filter(dossier => ["pending", "processing"].includes(dossier.status))
      .forEach(dossier => refreshDossierStatus(dossier.id));
  };

  const refreshAllDossiers = () => {
    setRefreshFlag(prev => prev + 1);
  };

  // Filter and sort dossiers
  const filteredAndSortedDossiers = dossiers
    .filter(dossier => {
      // Filter by search query
      const matchesSearch = 
        dossier.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dossier.query?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by status
      const matchesStatus = statusFilter === 'all' || dossier.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by selected field
      let comparison = 0;
      
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Living Dossiers</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshAllDossiers}
            disabled={isLoading}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={onCreateNew}
          >
            <FileText className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-24 ml-auto" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : dossiers.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Dossiers Found</h3>
            <p className="text-muted-foreground mb-6">You haven't created any Living Dossiers yet.</p>
            <Button onClick={onCreateNew}>Create Your First Dossier</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedDossiers.map((dossier) => (
            <Card key={dossier.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {dossier.title || "Untitled Dossier"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Created: {formatDate(dossier.created_at)}
                    </CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(dossier.status)} text-white`}>
                    {dossier.status.charAt(0).toUpperCase() + dossier.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Original Query</h4>
                    <p className="text-sm text-muted-foreground">{dossier.query}</p>
                  </div>
                  
                  {dossier.refined_query && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Refined Query</h4>
                      <p className="text-sm text-muted-foreground">{dossier.refined_query}</p>
                    </div>
                  )}
                  
                  {dossier.error && dossier.status === "failed" && (
                    <div>
                      <h4 className="text-sm font-medium mb-1 text-red-500">Error</h4>
                      <p className="text-sm text-red-500">{dossier.error}</p>
                    </div>
                  )}
                  
                  {dossier.status === "processing" && typeof dossier.progress === "number" && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{Math.round(dossier.progress * 100)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${Math.round(dossier.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2 ml-auto">
                  {["pending", "processing"].includes(dossier.status) && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => refreshDossierStatus(dossier.id)}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Check Status
                    </Button>
                  )}
                  
                  {dossier.status === "completed" && dossier.nextjs_url && (
                    <Button 
                      size="sm"
                      onClick={() => window.open(dossier.nextjs_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Dossier
                    </Button>
                  )}
                  
                  {dossier.status === "completed" && !dossier.nextjs_url && (
                    <Button 
                      size="sm"
                      onClick={() => window.open(`/living-dossier/${dossier.id}`, "_blank")}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      View Dossier
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
          
          {dossiers.some(d => ["pending", "processing"].includes(d.status)) && (
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={refreshProcessingDossiers}
              >
                Refresh Processing Dossiers
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 