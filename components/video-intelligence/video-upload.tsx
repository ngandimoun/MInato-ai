'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileVideo, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoUploadProps {
  onUploadComplete?: (streamId: string) => void;
  onUploadStart?: () => void;
}

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
}

const SCENARIOS = [
  { value: 'child_safety', label: 'Child Safety Monitor', description: 'Detect children in danger zones' },
  { value: 'fall_detection', label: 'Fall Detection', description: 'Medical emergency identification' },
  { value: 'intrusion_detection', label: 'Intrusion Detection', description: 'Unauthorized person detection' },
  { value: 'behavior_analysis', label: 'Behavior Analysis', description: 'Conflict and aggression detection' },
  { value: 'traffic_stop', label: 'Traffic Stop Documentation', description: 'Legal compliance monitoring' },
  { value: 'rideshare_safety', label: 'Rideshare Safety', description: 'Passenger/driver protection' },
  { value: 'general_surveillance', label: 'General Surveillance', description: 'Overall security monitoring' }
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime'];

export function VideoUpload({ onUploadComplete, onUploadStart }: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scenario, setScenario] = useState<string>('behavior_analysis');
  const [description, setDescription] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Supported formats: MP4, WebM, AVI, MOV';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 100MB';
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: "Invalid File",
        description: error,
        variant: "destructive"
      });
      return;
    }
    setSelectedFile(file);
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    onUploadStart?.();
    setUploadProgress({
      progress: 0,
      status: 'uploading',
      message: 'Uploading video...'
    });

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('scenario', scenario);
      formData.append('description', description);

      const response = await fetch('/api/video-intelligence/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadProgress({
        progress: 50,
        status: 'processing',
        message: 'Processing video with AI...'
      });

      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev || prev.progress >= 90) return prev;
          return {
            ...prev,
            progress: prev.progress + 10
          };
        });
      }, 500);

      // Wait for processing to complete (in real app, you'd poll the API)
      setTimeout(() => {
        clearInterval(progressInterval);
        setUploadProgress({
          progress: 100,
          status: 'completed',
          message: 'Video analysis completed!'
        });

        toast({
          title: "Upload Successful",
          description: "Your video has been uploaded and is being analyzed.",
        });

        onUploadComplete?.(result.stream_id);
        
        // Reset form
        setTimeout(() => {
          setSelectedFile(null);
          setDescription('');
          setUploadProgress(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 2000);
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });

      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: "destructive"
      });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    if (!uploadProgress) return null;
    
    switch (uploadProgress.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-5 w-5" />
          Upload Video for Intelligence Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/10'
              : selectedFile
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <FileVideo className="h-8 w-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {uploadProgress && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-sm font-medium">
                      {uploadProgress.message}
                    </span>
                  </div>
                  <Progress value={uploadProgress.progress} className="w-full" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium">Drop your video here</p>
                <p className="text-sm text-gray-500">
                  or{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse files
                  </Button>
                </p>
              </div>
              <div className="text-xs text-gray-500">
                Supported formats: MP4, WebM, AVI, MOV • Max size: 100MB
              </div>
            </div>
          )}
        </div>

        {/* Scenario Selection */}
        <div className="space-y-2">
          <Label htmlFor="scenario">Analysis Scenario</Label>
          <Select value={scenario} onValueChange={setScenario}>
            <SelectTrigger>
              <SelectValue placeholder="Select analysis scenario" />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-gray-500">{s.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe what you want to analyze in this video..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Selected Scenario Info */}
        {scenario && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">
                {SCENARIOS.find(s => s.value === scenario)?.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {SCENARIOS.find(s => s.value === scenario)?.description}
            </p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploadProgress?.status === 'uploading' || uploadProgress?.status === 'processing'}
          className="w-full"
          size="lg"
        >
          {uploadProgress?.status === 'uploading' || uploadProgress?.status === 'processing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {uploadProgress.status === 'uploading' ? 'Uploading...' : 'Processing...'}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Analyze Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 