"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/context/navigation-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { DocumentUpload } from "@/components/insights/document-upload";
import { InsightsDashboard } from "@/components/insights/insights-dashboard";
import { InsightsChat } from "@/components/insights/insights-chat";
import { ReportsList } from "@/components/insights/reports-list";
import { ReportDetail } from "@/components/insights/report-detail";
import { AddToReportDialog } from "@/components/insights/add-to-report-dialog";
import { InteractiveInsightsDashboard } from "@/components/insights/interactive-insights-dashboard";
import { 
  BarChart3, 
  Upload, 
  MessageSquare, 
  FileText, 
  Brain,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Play,
  Plus
} from "lucide-react";

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub";

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState<View>("insights");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportTitle, setSelectedReportTitle] = useState<string>("");
  const [showAddToReportDialog, setShowAddToReportDialog] = useState(false);
  const { navigateWithLoading } = useNavigation();
  const router = useRouter();

  // Handle view changes
  const handleViewChange = (view: View) => {
    if (view === "insights") {
      return;
    } else if (view === "dashboard") {
      navigateWithLoading("/dashboard", "Loading dashboard...");
    } else if (view === "games") {
      navigateWithLoading("/games", "Loading games...");
    } else if (view === "listening") {
      navigateWithLoading("/listening", "Loading listening...");
    } else if (view === "creation-hub") {
      navigateWithLoading("/creation-hub", "Loading creation hub...");
    } else {
      navigateWithLoading(`/chat?view=${view}`, `Loading ${view}...`);
    }
  };

  const handleUploadComplete = (document: any) => {
    setRefreshKey(prev => prev + 1);
    setActiveTab("dashboard");
  };

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error);
  };

  const handleReportClick = (reportId: string) => {
    setSelectedReportId(reportId);
  };

  const handleBackToReports = () => {
    setSelectedReportId(null);
  };

  const handleAddToReport = (reportId: string, reportTitle?: string) => {
    setSelectedReportId(reportId);
    setSelectedReportTitle(reportTitle || `Report ${reportId}`);
    setShowAddToReportDialog(true);
  };

  const handleAddToReportSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setShowAddToReportDialog(false);
  };

  // Quick action handlers
  const handleQuickAnalyze = () => {
    setActiveTab("upload");
  };

  const handleQuickChat = () => {
    setActiveTab("chat");
  };

  const handleQuickReport = () => {
    setActiveTab("reports");
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Enhanced background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/80 to-primary/5 z-[-1]" />
      
      <Header currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 container max-w-7xl mx-auto px-4 py-6 pt-16 md:pt-20">
        {/* Enhanced Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl border border-primary/20">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
            Minato AI Insights
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Transform your business data into actionable insights with AI-powered analysis
          </p>
          
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-dashed border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30"
              onClick={handleQuickAnalyze}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-500/10 rounded-lg mx-auto w-fit mb-3">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Upload & Analyze</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Drop your files and get instant insights
                </p>
                <Button size="sm" variant="outline" className="group">
                  Start Now <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-dashed border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30"
              onClick={handleQuickChat}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-green-500/10 rounded-lg mx-auto w-fit mb-3">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Ask Questions</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Chat with your data in plain English
                </p>
                <Button size="sm" variant="outline" className="group">
                  Chat Now <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-dashed border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30"
              onClick={handleQuickReport}
            >
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-purple-500/10 rounded-lg mx-auto w-fit mb-3">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">View Reports</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Access your generated reports
                </p>
                <Button size="sm" variant="outline" className="group">
                  Browse <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content with Simplified Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Simplified, mobile-friendly tab navigation */}
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-4 w-full max-w-md bg-muted/50 p-1">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2 text-xs">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2 text-xs">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2 text-xs">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="dashboard" className="space-y-6 mt-8">
            <InteractiveInsightsDashboard 
              key={refreshKey}
              realTimeUpdates={true}
              allowDrillDown={true}
              onExportDashboard={() => {
                console.log('Exporting dashboard...');
                // Export functionality would be implemented here
              }}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6 mt-8">
            <div className="max-w-4xl mx-auto">
              <DocumentUpload 
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
              />
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6 mt-8">
            <div className="h-[calc(100vh-280px)] min-h-[500px] max-w-6xl mx-auto">
              <InsightsChat />
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6 mt-8">
            <div className="max-w-6xl mx-auto">
              {selectedReportId ? (
                <ReportDetail
                  reportId={selectedReportId}
                  onBack={handleBackToReports}
                  onAddData={(reportId) => {
                    const reportTitle = `Report ${reportId}`;
                    handleAddToReport(reportId, reportTitle);
                  }}
                />
              ) : (
                <ReportsList 
                  onReportClick={handleReportClick}
                  onCompareReports={(reportIds) => {
                    console.log('Compared reports:', reportIds);
                    setRefreshKey(prev => prev + 1);
                  }}
                  onAddToReport={handleAddToReport}
                  refreshTrigger={refreshKey}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add to Report Dialog */}
      {showAddToReportDialog && selectedReportId && (
        <AddToReportDialog
          isOpen={showAddToReportDialog}
          onClose={() => setShowAddToReportDialog(false)}
          reportId={selectedReportId}
          reportTitle={selectedReportTitle}
          onSuccess={handleAddToReportSuccess}
        />
      )}
    </main>
  );
} 