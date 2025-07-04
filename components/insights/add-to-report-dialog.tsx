"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  DollarSign,
  Brain,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  Search
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/memory-framework/config";

interface DataItem {
  id: string;
  title?: string;
  analysis_name?: string;
  original_filename?: string;
  description?: string;
  file_type?: string;
  transaction_type?: string;
  amount?: number;
  currency?: string;
  status?: string;
  created_at: string;
}

interface AddToReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
  onSuccess: () => void;
}

export function AddToReportDialog({ 
  isOpen, 
  onClose, 
  reportId, 
  reportTitle, 
  onSuccess 
}: AddToReportDialogProps) {
  const [documents, setDocuments] = useState<DataItem[]>([]);
  const [transactions, setTransactions] = useState<DataItem[]>([]);
  const [analyses, setAnalyses] = useState<DataItem[]>([]);
  
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [documentsResponse, transactionsResponse, analysesResponse] = await Promise.all([
        fetch('/api/insights/upload?limit=50'),
        fetch('/api/insights/transactions?limit=50'),
        fetch('/api/insights/analyses?limit=50')
      ]);

      const [documentsData, transactionsData, analysesData] = await Promise.all([
        documentsResponse.json(),
        transactionsResponse.json(),
        analysesResponse.json()
      ]);

      if (documentsData.success) setDocuments(documentsData.documents || []);
      if (transactionsData.success) setTransactions(transactionsData.transactions || []);
      if (analysesData.success) setAnalyses(analysesData.analyses || []);

    } catch (error: any) {
      logger.error('[AddToReportDialog] Error fetching data:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const documentIds = Array.from(selectedDocuments);
    const transactionIds = Array.from(selectedTransactions);
    const analysisIds = Array.from(selectedAnalyses);

    if (documentIds.length === 0 && transactionIds.length === 0 && analysisIds.length === 0) {
      setError('Please select at least one item to add to the report');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/insights/reports/${reportId}/add-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: documentIds,
          transaction_ids: transactionIds,
          analysis_ids: analysisIds
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add data: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        logger.info(`[AddToReportDialog] Successfully added data to report: ${reportId}`);
        onSuccess();
        handleClose();
      } else {
        throw new Error(data.error || 'Failed to add data to report');
      }

    } catch (error: any) {
      logger.error('[AddToReportDialog] Error adding data:', error.message);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedDocuments(new Set());
    setSelectedTransactions(new Set());
    setSelectedAnalyses(new Set());
    setSearchTerm('');
    setError(null);
    onClose();
  };

  const filterItems = (items: DataItem[]) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      (item.title?.toLowerCase().includes(term)) ||
      (item.analysis_name?.toLowerCase().includes(term)) ||
      (item.original_filename?.toLowerCase().includes(term)) ||
      (item.description?.toLowerCase().includes(term))
    );
  };

  const getTotalSelected = () => {
    return selectedDocuments.size + selectedTransactions.size + selectedAnalyses.size;
  };

  const renderDocuments = () => {
    const filteredDocs = filterItems(documents);
    
    return (
      <div className="space-y-3">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              checked={selectedDocuments.has(doc.id)}
              onCheckedChange={(checked) => {
                const newSelected = new Set(selectedDocuments);
                if (checked) {
                  newSelected.add(doc.id);
                } else {
                  newSelected.delete(doc.id);
                }
                setSelectedDocuments(newSelected);
              }}
            />
            
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{doc.title || doc.original_filename}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {doc.file_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTransactions = () => {
    const filteredTrans = filterItems(transactions);
    
    return (
      <div className="space-y-3">
        {filteredTrans.map((transaction) => (
          <div key={transaction.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              checked={selectedTransactions.has(transaction.id)}
              onCheckedChange={(checked) => {
                const newSelected = new Set(selectedTransactions);
                if (checked) {
                  newSelected.add(transaction.id);
                } else {
                  newSelected.delete(transaction.id);
                }
                setSelectedTransactions(newSelected);
              }}
            />
            
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{transaction.description}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {transaction.transaction_type}
                </Badge>
                {transaction.amount && (
                  <span className="text-xs font-medium">
                    {transaction.currency} {transaction.amount}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnalyses = () => {
    const filteredAnalyses = filterItems(analyses);
    
    return (
      <div className="space-y-3">
        {filteredAnalyses.map((analysis) => (
          <div key={analysis.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              checked={selectedAnalyses.has(analysis.id)}
              onCheckedChange={(checked) => {
                const newSelected = new Set(selectedAnalyses);
                if (checked) {
                  newSelected.add(analysis.id);
                } else {
                  newSelected.delete(analysis.id);
                }
                setSelectedAnalyses(newSelected);
              }}
            />
            
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-4 w-4 text-purple-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{analysis.analysis_name || analysis.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {analysis.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Data to Report
          </DialogTitle>
          <DialogDescription>
            Select documents, transactions, or analyses to add to <strong>{reportTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents, transactions, or analyses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading data...</span>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Documents</span>
                  <Badge variant="secondary">{documents.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Transactions</span>
                  <Badge variant="secondary">{transactions.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="analyses" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span>Analyses</span>
                  <Badge variant="secondary">{analyses.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4">
                <ScrollArea className="h-[400px]">
                  {renderDocuments()}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <ScrollArea className="h-[400px]">
                  {renderTransactions()}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analyses" className="space-y-4">
                <ScrollArea className="h-[400px]">
                  {renderAnalyses()}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {getTotalSelected()} item{getTotalSelected() !== 1 ? 's' : ''} selected
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || getTotalSelected() === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 