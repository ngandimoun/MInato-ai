'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Shield, 
  Activity,
  Clock,
  FileVideo,
  Download,
  RefreshCw,
  Volume2,
  Image,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VideoIntelligenceChat } from './video-intelligence-chat';

interface VideoAnalysisResult {
  id: string;
  stream_id: string;
  analysis_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  detected_objects: any[];
  detected_people: any[];
  danger_zones_violated: any[];
  scene_description: string;
  threat_analysis: string;
  recommended_actions: string[];
  timestamp: string;
  frame_metadata: any;
}

interface VideoAnalysisResultsProps {
  streamId: string;
  streamName: string;
  onClose?: () => void;
}

export function VideoAnalysisResults({ streamId, streamName, onClose }: VideoAnalysisResultsProps) {
  const [results, setResults] = useState<VideoAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<VideoAnalysisResult | null>(null);
  const { toast } = useToast();

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/video-intelligence/analyze?stream_id=${streamId}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        if (data.results?.length > 0) {
          setSelectedResult(data.results[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analysis results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [streamId]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'high':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAnalysisTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6">
          <FileVideo className="h-12 w-12 text-gray-400" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">No Analysis Results</h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            No analysis results found for this video. The video may still be processing.
          </p>
        </div>
        <Button onClick={fetchResults} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Results
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Analysis Results</h2>
          <p className="text-gray-600 dark:text-gray-400">{streamName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchResults} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedResult?.id === result.id
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getRiskColor(result.risk_level)}>
                      {getRiskIcon(result.risk_level)}
                      <span className="ml-1">{result.risk_level.toUpperCase()}</span>
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(result.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {getAnalysisTypeLabel(result.analysis_type)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Confidence: {Math.round(result.confidence_score * 100)}%
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <div className="lg:col-span-2">
          {selectedResult && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="frames">Frames</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="objects">Objects</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="chat">AI Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Scene Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Risk Level
                        </p>
                        <Badge className={getRiskColor(selectedResult.risk_level)}>
                          {getRiskIcon(selectedResult.risk_level)}
                          <span className="ml-1">{selectedResult.risk_level.toUpperCase()}</span>
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Confidence Score
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={selectedResult.confidence_score * 100} className="flex-1" />
                          <span className="text-sm font-medium">
                            {Math.round(selectedResult.confidence_score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Scene Description
                      </p>
                      <p className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        {selectedResult.scene_description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Threat Analysis
                      </p>
                      <p className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        {selectedResult.threat_analysis}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="frames" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Frame-by-Frame Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="font-medium">Total Frames Analyzed</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedResult.frame_metadata?.summary?.frame_count || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="font-medium">Processing Time</p>
                          <p className="text-2xl font-bold text-green-600">
                            {selectedResult.frame_metadata?.summary?.processing_time ? 
                              `${Math.round(selectedResult.frame_metadata.summary.processing_time / 1000)}s` : 
                              'N/A'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {selectedResult.frame_metadata?.summary && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <p className="font-medium text-red-700">High Risk Frames</p>
                              <p className="text-xl font-bold text-red-600">
                                {selectedResult.frame_metadata.summary.high_risk_frames || 0}
                              </p>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <p className="font-medium text-yellow-700">Medium Risk Frames</p>
                              <p className="text-xl font-bold text-yellow-600">
                                {selectedResult.frame_metadata.summary.medium_risk_frames || 0}
                              </p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                              <p className="font-medium text-gray-700">Video Duration</p>
                              <p className="text-xl font-bold text-gray-600">
                                {selectedResult.frame_metadata.summary.video_duration ? 
                                  `${Math.round(selectedResult.frame_metadata.summary.video_duration)}s` : 
                                  'N/A'
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <h4 className="font-medium mb-2">Frame Analysis Summary</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Analyzed {selectedResult.frame_metadata.summary.frame_count} frames extracted at 1 frame per second intervals. 
                              Detected {selectedResult.frame_metadata.summary.total_objects_detected} objects and {selectedResult.frame_metadata.summary.total_people_detected} people across all frames.
                              {selectedResult.frame_metadata.summary.danger_zones_violated > 0 && 
                                ` Warning: ${selectedResult.frame_metadata.summary.danger_zones_violated} danger zone violations detected.`
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audio" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5" />
                      Audio Intelligence Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Audio Analyzed
                          </p>
                          <Badge className={selectedResult.frame_metadata?.summary?.audio_analyzed ? 'bg-green-500' : 'bg-gray-500'}>
                            {selectedResult.frame_metadata?.summary?.audio_analyzed ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Audio Sentiment
                          </p>
                          <Badge variant="outline">
                            {selectedResult.frame_metadata?.summary?.audio_sentiment || 'N/A'}
                          </Badge>
                        </div>
                      </div>

                      {selectedResult.frame_metadata?.summary?.audio_analyzed && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Audio Transcript
                            </p>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <p className="text-sm">
                                {selectedResult.frame_metadata.summary.audio_transcript || 'No transcript available'}
                              </p>
                            </div>
                          </div>

                          {selectedResult.frame_metadata.summary.audio_threat_indicators?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                Audio Threat Indicators
                              </p>
                              <div className="space-y-2">
                                {selectedResult.frame_metadata.summary.audio_threat_indicators.map((indicator: string, index: number) => (
                                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-700 dark:text-red-300">{indicator}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!selectedResult.frame_metadata?.summary?.audio_analyzed && (
                        <div className="text-center py-8">
                          <Volume2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
                            No audio analysis available for this video
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="objects" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Detected Objects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedResult.detected_objects.length > 0 ? (
                      <div className="space-y-3">
                        {selectedResult.detected_objects.map((obj, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div>
                              <p className="font-medium">{obj.name || obj.type}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {obj.description || 'No description'}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {obj.confidence ? `${Math.round(obj.confidence * 100)}%` : 'N/A'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                        No objects detected in this analysis
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="people" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Detected People
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedResult.detected_people.length > 0 ? (
                      <div className="space-y-3">
                        {selectedResult.detected_people.map((person, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div>
                              <p className="font-medium">Person {index + 1}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {person.description || 'No description'}
                              </p>
                              {person.age_estimate && (
                                <p className="text-xs text-gray-500">
                                  Estimated age: {person.age_estimate}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">
                              {person.confidence ? `${Math.round(person.confidence * 100)}%` : 'N/A'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                        No people detected in this analysis
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedResult.recommended_actions.length > 0 ? (
                      <div className="space-y-3">
                        {selectedResult.recommended_actions.map((action, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                            <p className="text-sm">{action}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                        No specific actions recommended
                      </p>
                    )}
                  </CardContent>
                </Card>

                {selectedResult.danger_zones_violated.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone Violations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedResult.danger_zones_violated.map((violation, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-red-700 dark:text-red-400">
                                {violation.zone_name || `Zone ${index + 1}`}
                              </p>
                              <p className="text-sm text-red-600 dark:text-red-300">
                                {violation.description || 'Unauthorized access detected'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                                  )}
                </TabsContent>

                <TabsContent value="chat" className="space-y-4">
                  <div className="h-[600px]">
                    <VideoIntelligenceChat
                      streamId={streamId}
                      streamName={streamName}
                      streamStatus={selectedResult?.frame_metadata?.summary ? 'completed' : 'processing'}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    );
  } 