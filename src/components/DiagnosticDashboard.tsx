'use client';

// Main diagnostic dashboard component that orchestrates the entire workflow

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { ImageUploader } from './ImageUploader';
import { ImageGallery } from './ImageGallery';
import { ProcessingStatus } from './ProcessingStatus';
import { ReportViewer } from './ReportViewer';

import { 
  DiagnosticSession, 
  UploadResponse,
  ImageBatch 
} from '@/types/diagnostic';
import { FileProcessor } from '@/lib/file-utils';

type WorkflowStage = 'upload' | 'review' | 'processing' | 'completed' | 'error';

export function DiagnosticDashboard() {
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('upload');
  const [currentSession, setCurrentSession] = useState<DiagnosticSession | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upload');

  // Handle successful upload
  const handleUploadComplete = (uploadResponse: UploadResponse) => {
    // Create diagnostic session from upload response
    const batches: ImageBatch[] = FileProcessor.createBatches(uploadResponse.uploadedImages, 20).map((batchImages, index) => ({
      id: `batch-${uploadResponse.sessionId}-${index}`,
      images: batchImages,
      status: 'pending' as const,
      batchNumber: index + 1,
      totalBatches: uploadResponse.totalBatches
    }));

    const session: DiagnosticSession = {
      id: uploadResponse.sessionId,
      totalImages: uploadResponse.uploadedImages.length,
      batches,
      status: 'uploading',
      createdAt: new Date()
    };

    setCurrentSession(session);
    setCurrentStage('review');
    setActiveTab('review');
    setUploadError(null);
    setProcessingError(null);
  };

  // Handle upload error
  const handleUploadError = (error: string) => {
    setUploadError(error);
    setCurrentStage('error');
  };

  // Start new session (reset)
  const startNewSession = () => {
    setCurrentSession(null);
    setCurrentStage('upload');
    setActiveTab('upload');
    setUploadError(null);
    setProcessingError(null);
  };

  // Handle processing start
  const startProcessing = () => {
    if (!currentSession) return;
    
    const updatedSession = {
      ...currentSession,
      status: 'processing' as const
    };
    
    setCurrentSession(updatedSession);
    setCurrentStage('processing');
    setActiveTab('processing');
  };

  // Handle processing completion
  const handleProcessingComplete = (completedSession: DiagnosticSession) => {
    setCurrentSession(completedSession);
    
    if (completedSession.status === 'completed' && completedSession.finalReport) {
      setCurrentStage('completed');
      setActiveTab('report');
    } else {
      setCurrentStage('error');
      setProcessingError('Processing completed with errors');
    }
  };

  // Handle processing error
  const handleProcessingError = (error: string) => {
    setProcessingError(error);
    setCurrentStage('error');
  };

  // Get stage indicator
  const getStageStatus = (stage: WorkflowStage) => {
    if (currentStage === stage) return 'current';
    
    const stageOrder: WorkflowStage[] = ['upload', 'review', 'processing', 'completed'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);
    
    if (currentStage === 'error') return 'error';
    return stageIndex < currentIndex ? 'completed' : 'pending';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            Radiology Diagnostic Center
          </h1>
          <p className="text-gray-600">
            AI-powered medical image analysis and diagnostic report generation
          </p>
        </div>

        {/* Workflow Progress Indicator */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {[
                { stage: 'upload' as WorkflowStage, label: 'Upload Images', icon: '📁' },
                { stage: 'review' as WorkflowStage, label: 'Review & Confirm', icon: '👀' },
                { stage: 'processing' as WorkflowStage, label: 'AI Analysis', icon: '🧠' },
                { stage: 'completed' as WorkflowStage, label: 'Diagnostic Report', icon: '📋' }
              ].map(({ stage, label, icon }, index) => {
                const status = getStageStatus(stage);
                return (
                  <div key={stage} className="flex items-center">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                      status === 'current' ? 'bg-blue-500 text-white' :
                      status === 'completed' ? 'bg-green-500 text-white' :
                      status === 'error' ? 'bg-red-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      <span>{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    {index < 3 && (
                      <div className={`w-8 h-0.5 mx-2 ${
                        status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {(uploadError || processingError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {uploadError || processingError}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startNewSession}
                className="ml-4"
              >
                Start Over
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="review" disabled={!currentSession}>
              Review 
              {currentSession && (
                <Badge variant="secondary" className="ml-2">
                  {currentSession.totalImages}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processing" disabled={currentStage !== 'processing'}>
              Processing
            </TabsTrigger>
            <TabsTrigger value="report" disabled={currentStage !== 'completed'}>
              Report
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <ImageUploader
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              disabled={currentStage === 'processing'}
            />
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review">
            {currentSession ? (
              <div className="space-y-6">
                {/* Session Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Review Upload</CardTitle>
                    <CardDescription>
                      Confirm your images before starting AI analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Session ID:</span>
                        <div className="font-mono text-xs">{currentSession.id}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Images:</span>
                        <div>{currentSession.totalImages}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Batches:</span>
                        <div>{currentSession.batches.length}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Est. Time:</span>
                        <div>{currentSession.batches.length * 2}min</div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={startProcessing}
                        disabled={currentStage === 'processing'}
                      >
                        Start AI Analysis
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={startNewSession}
                        disabled={currentStage === 'processing'}
                      >
                        Upload Different Images
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Image Gallery */}
                <ImageGallery 
                  images={currentSession.batches.flatMap(batch => batch.images)} 
                  title="Uploaded Medical Images"
                  showBatchInfo={true}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📁</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">No Images Uploaded</h3>
                    <p className="text-sm">Upload images in the Upload tab to review them here.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing">
            {currentSession && currentStage === 'processing' ? (
              <ProcessingStatus
                session={currentSession}
                onProcessingComplete={handleProcessingComplete}
                onProcessingError={handleProcessingError}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🧠</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">Processing Not Started</h3>
                    <p className="text-sm">Upload and review images first, then start the AI analysis.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            {currentSession?.finalReport ? (
              <div className="space-y-6">
                <ReportViewer 
                  report={currentSession.finalReport}
                />
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-3 justify-center">
                      <Button onClick={startNewSession}>
                        Analyze New Images
                      </Button>
                      <Button variant="outline">
                        View All Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📋</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">No Report Available</h3>
                    <p className="text-sm">Complete the AI analysis to generate a diagnostic report.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}