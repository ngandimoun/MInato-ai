"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  File, 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  FileText,
  Image,
  FileSpreadsheet,
  FileType,
  Sparkles,
  ArrowRight,
  Plus,
  Zap,
  Camera,
  Scan,
  Eye,
  Receipt,
  CreditCard,
  FileBarChart,
  Trash2,
  Edit3,
  Save,
  Brain,
  Target,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logger } from "@/memory-framework/config";

interface UploadedDocument {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (documents: UploadedDocument[]) => void;
  onUploadError?: (error: string) => void;
}

interface FileWithContext {
  file: File;
  id: string;
  title: string;
  description: string;
  category: string;
  preview?: string;
}

const getFileIcon = (fileName: string, category?: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Category-based icons for business context
  if (category) {
    switch (category) {
      case 'receipt':
        return <Receipt className="h-8 w-8 text-green-500" />;
      case 'invoice':
        return <CreditCard className="h-8 w-8 text-blue-500" />;
      case 'financial-report':
        return <FileBarChart className="h-8 w-8 text-purple-500" />;
      case 'contract':
        return <FileText className="h-8 w-8 text-orange-500" />;
    }
  }
  
  // Extension-based fallback
  switch (extension) {
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-8 w-8 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    case 'csv':
      return <FileSpreadsheet className="h-8 w-8 text-orange-500" />;
    case 'txt':
      return <FileType className="h-8 w-8 text-gray-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'bmp':
      return <Image className="h-8 w-8 text-purple-500" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
};

const isImageFile = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension || '');
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const businessCategories = [
  { value: 'receipt', label: 'Receipt', description: 'Expense receipts, purchase records' },
  { value: 'invoice', label: 'Invoice', description: 'Client invoices, bills to pay' },
  { value: 'financial-report', label: 'Financial Report', description: 'Financial statements, analytics' },
  { value: 'contract', label: 'Contract', description: 'Agreements, legal documents' },
  { value: 'marketing', label: 'Marketing Material', description: 'Ads, campaigns, analytics' },
  { value: 'inventory', label: 'Inventory', description: 'Stock lists, product catalogs' },
  { value: 'tax-document', label: 'Tax Document', description: 'Tax forms, deductions' },
  { value: 'bank-statement', label: 'Bank Statement', description: 'Bank records, transactions' },
  { value: 'business-plan', label: 'Business Plan', description: 'Strategy, planning documents' },
  { value: 'other', label: 'Other', description: 'Other business documents' }
];

export function DocumentUpload({ onUploadComplete, onUploadError }: DocumentUploadProps) {
  const [filesWithContext, setFilesWithContext] = useState<FileWithContext[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchTitle, setBatchTitle] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithContext[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: file.name.split('.').slice(0, -1).join('.'),
      description: '',
      category: 'other'
    }));

    // Create image previews
    newFiles.forEach(fileWithContext => {
      if (isImageFile(fileWithContext.file.name)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilesWithContext(prev => 
            prev.map(f => 
              f.id === fileWithContext.id 
                ? { ...f, preview: e.target?.result as string }
                : f
            )
          );
        };
        reader.readAsDataURL(fileWithContext.file);
      }
    });

    setFilesWithContext(prev => [...prev, ...newFiles]);
    setError(null);
    setSuccess(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/json': ['.json'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/bmp': ['.bmp']
    },
    maxSize: 50 * 1024 * 1024 // 50MB per file
  });

  const removeFile = (fileId: string) => {
    setFilesWithContext(prev => prev.filter(f => f.id !== fileId));
    if (editingFile === fileId) {
      setEditingFile(null);
    }
  };

  const updateFileContext = (fileId: string, updates: Partial<FileWithContext>) => {
    setFilesWithContext(prev => 
      prev.map(f => f.id === fileId ? { ...f, ...updates } : f)
    );
  };

  const uploadAllFiles = async () => {
    if (filesWithContext.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    const uploadedDocuments: UploadedDocument[] = [];
    const progressPerFile = 100 / filesWithContext.length;

    try {
      for (let i = 0; i < filesWithContext.length; i++) {
        const fileWithContext = filesWithContext[i];
        const formData = new FormData();
        
        formData.append('file', fileWithContext.file);
        formData.append('title', fileWithContext.title);
        formData.append('description', fileWithContext.description);
        formData.append('categories', fileWithContext.category);
        formData.append('batchTitle', batchTitle);
        formData.append('batchDescription', batchDescription);
        formData.append('batchIndex', i.toString());
        formData.append('batchTotal', filesWithContext.length.toString());

        // Use appropriate endpoint based on file type
        const endpoint = isImageFile(fileWithContext.file.name) 
          ? '/api/insights/upload-image' 
          : '/api/insights/upload';

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Failed to upload ${fileWithContext.file.name}`);
        }

        uploadedDocuments.push(result.document);
        setUploadProgress((i + 1) * progressPerFile);
      }

      // Generate batch insights after all files are uploaded
      if (uploadedDocuments.length > 1) {
        await generateBatchInsights(uploadedDocuments);
      }

      setSuccess(`Successfully uploaded ${uploadedDocuments.length} files and generated insights!`);
      setFilesWithContext([]);
      setBatchTitle("");
      setBatchDescription("");
      
      onUploadComplete?.(uploadedDocuments);
      
      logger.info('[DocumentUpload] Batch upload completed:', uploadedDocuments.length);

    } catch (error: any) {
      logger.error('[DocumentUpload] Batch upload error:', error);
      setError(error.message || 'Upload failed');
      onUploadError?.(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const generateBatchInsights = async (documents: UploadedDocument[]) => {
    try {
      const response = await fetch('/api/insights/batch-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: documents.map(d => d.id),
          batchTitle: batchTitle || 'Business Data Analysis',
          batchDescription: batchDescription,
          analysisType: 'comprehensive_batch'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate batch insights');
      }

      logger.info('[DocumentUpload] Batch insights generated successfully');
    } catch (error: any) {
      logger.warn('[DocumentUpload] Batch insights generation failed:', error.message);
      // Don't fail the entire upload for this
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <div className="p-4 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl border border-primary/20">
              <Brain className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            </div>
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-3">Upload Your Business Files</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload any business documents, receipts, invoices, or images. Our AI will analyze everything together and find valuable insights and correlations.
        </p>
      </div>

      {/* Batch Context */}
      {filesWithContext.length > 0 && (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Help AI Understand Your Data
            </CardTitle>
            <CardDescription>
              Give your upload a title and description to help our AI better understand the context and generate more relevant insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchTitle">Upload Title <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input
                  id="batchTitle"
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  placeholder="e.g., Q1 Financial Review, Tax Documents 2024..."
                  className="border-border focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchDescription">Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="batchDescription"
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="Describe what these files are for and what insights you're looking for..."
                  className="border-border focus:border-primary min-h-[80px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm mb-1">Batch Analysis</h3>
            <p className="text-xs text-muted-foreground">Upload multiple files for comprehensive insights</p>
          </CardContent>
        </Card>
        <Card className="border-dashed border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <Receipt className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm mb-1">Receipts & Invoices</h3>
            <p className="text-xs text-muted-foreground">Extract data from business documents</p>
          </CardContent>
        </Card>
        <Card className="border-dashed border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm mb-1">Smart Correlations</h3>
            <p className="text-xs text-muted-foreground">Find connections across your data</p>
          </CardContent>
        </Card>
        <Card className="border-dashed border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-4 text-center">
            <FileBarChart className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm mb-1">Unified Reports</h3>
            <p className="text-xs text-muted-foreground">Get comprehensive business insights</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Upload Area */}
      <Card className="border-2 border-dashed border-border bg-gradient-to-br from-background to-muted/30">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`relative rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-2 border-primary bg-primary/10 scale-105'
                : 'border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-6">
              <div className="relative">
                <div className={`p-6 rounded-full mx-auto w-fit transition-all duration-300 ${
                  isDragActive 
                    ? 'bg-primary/20 scale-110' 
                    : 'bg-muted/50'
                }`}>
                  <Upload className={`h-16 w-16 transition-colors ${
                    isDragActive ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                {isDragActive && (
                  <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping"></div>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  {isDragActive ? 'Drop your files here!' : 'Drag & drop multiple files'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  or <span className="text-primary font-medium">click to browse</span> from your device
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Upload receipts, invoices, documents, images - any business files
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { ext: 'RECEIPTS', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                  { ext: 'INVOICES', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                  { ext: 'DOCUMENTS', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                  { ext: 'IMAGES', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' }
                ].map((type) => (
                  <Badge key={type.ext} className={`${type.color} border-0 text-xs font-medium px-3 py-1`}>
                    {type.ext}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {filesWithContext.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Uploaded Files ({filesWithContext.length})
            </CardTitle>
            <CardDescription>
              Review and add context to your files to help AI generate better insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filesWithContext.map((fileContext) => (
              <div key={fileContext.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-4">
                  {/* File Icon or Preview */}
                  <div className="flex-shrink-0">
                    {fileContext.preview ? (
                      <div className="relative">
                        <img 
                          src={fileContext.preview} 
                          alt="Preview" 
                          className="w-16 h-16 rounded-lg border object-cover"
                        />
                        <div className="absolute top-1 right-1 p-1 bg-primary/10 rounded-full">
                          <Eye className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted rounded-lg">
                        {getFileIcon(fileContext.file.name, fileContext.category)}
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium truncate">{fileContext.file.name}</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingFile(editingFile === fileContext.id ? null : fileContext.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileContext.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatFileSize(fileContext.file.size)}
                    </p>

                    {/* File Context Form */}
                    {editingFile === fileContext.id ? (
                      <div className="space-y-3 mt-4 p-3 bg-muted/30 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Title</Label>
                            <Input
                              value={fileContext.title}
                              onChange={(e) => updateFileContext(fileContext.id, { title: e.target.value })}
                              placeholder="Give this file a descriptive title..."
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Category</Label>
                            <Select
                              value={fileContext.category}
                              onValueChange={(value) => updateFileContext(fileContext.id, { category: value })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {businessCategories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    <div>
                                      <div className="font-medium">{cat.label}</div>
                                      <div className="text-xs text-muted-foreground">{cat.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={fileContext.description}
                            onChange={(e) => updateFileContext(fileContext.id, { description: e.target.value })}
                            placeholder="Describe what this file contains and why it's important..."
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingFile(null)}
                          className="gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Save Context
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {businessCategories.find(c => c.value === fileContext.category)?.label || 'Other'}
                          </Badge>
                          {fileContext.title !== fileContext.file.name.split('.').slice(0, -1).join('.') && (
                            <span className="text-xs text-muted-foreground">"{fileContext.title}"</span>
                          )}
                        </div>
                        {fileContext.description && (
                          <p className="text-xs text-muted-foreground">{fileContext.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Processing your files and generating insights...</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <div className="text-sm text-muted-foreground text-center">
                {uploadProgress < 80 ? "Uploading and analyzing files..." :
                 "Generating correlations and insights..."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {filesWithContext.length > 0 && !uploading && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={uploadAllFiles}
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
          >
            <Brain className="h-5 w-5" />
            Analyze All Files ({filesWithContext.length})
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setFilesWithContext([])}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Help Section */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            How it works for your business
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Upload Everything</h4>
                <p className="text-xs text-muted-foreground">Upload receipts, invoices, reports, images - any business documents you have</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">AI Finds Connections</h4>
                <p className="text-xs text-muted-foreground">Our AI analyzes all files together, finding patterns and correlations you might miss</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Get Business Insights</h4>
                <p className="text-xs text-muted-foreground">Receive actionable insights, expense analysis, and recommendations for your business</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 