'use client';

// Real-time processing status component for batch diagnostic processing

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageBatch, ProcessingStatus as ProcessingStatusType, DiagnosticSession } from '@/types/diagnostic';

interface ProcessingStatusProps {
  session: DiagnosticSession;
  onProcessingComplete: (session: DiagnosticSession) => void;
  onProcessingError: (error: string) => void;
}

export function ProcessingStatus({ session, onProcessingComplete, onProcessingError }: ProcessingStatusProps) {
  const [currentStatus, setCurrentStatus] = useState<ProcessingStatusType>({
    sessionId: session.id,
    currentBatch: 0,
    totalBatches: session.batches.length,
    completedBatches: 0,
    isProcessing: session.status === 'processing',
    currentStatus: 'Preparing to start processing...'
  });

  const [processingStarted, setProcessingStarted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update status based on session changes
  useEffect(() => {
    const completedBatches = session.batches.filter(b => b.status === 'completed').length;
    const currentBatch = session.batches.findIndex(b => b.status === 'processing') + 1;
    const processingBatch = session.batches.find(b => b.status === 'processing');
    
    let statusText = 'Preparing to start processing...';
    
    if (session.status === 'completed') {
      statusText = 'Diagnostic analysis completed successfully';
    } else if (session.status === 'error') {
      statusText = 'Processing encountered errors';
    } else if (processingBatch) {
      statusText = `Analyzing batch ${processingBatch.batchNumber} of ${processingBatch.totalBatches} (${processingBatch.images.length} images)`;
    } else if (completedBatches > 0 && completedBatches < session.batches.length) {
      statusText = `Completed ${completedBatches} batches, preparing next batch...`;
    }

    setCurrentStatus({
      sessionId: session.id,
      currentBatch: currentBatch || 0,
      totalBatches: session.batches.length,
      completedBatches,
      isProcessing: session.status === 'processing',
      currentStatus: statusText
    });
  }, [session]);

  // Track elapsed time during processing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (currentStatus.isProcessing && processingStarted) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStatus.isProcessing, processingStarted]);

  // Start processing
  const startProcessing = async () => {
    if (processingStarted) return;
    
    setProcessingStarted(true);
    setElapsedTime(0);
    
    try {
      // Start processing session
      const sessionData = {
        sessionId: session.id,
        images: session.batches.flatMap(batch => batch.images),
        patientId: session.patientId
      };

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Update session with results
        const updatedSession: DiagnosticSession = {
          ...session,
          batches: result.data.batchResults,
          status: result.data.isComplete ? 'completed' : 'error',
          finalReport: result.data.finalReport,
          completedAt: result.data.isComplete ? new Date() : undefined
        };

        onProcessingComplete(updatedSession);
      } else {
        onProcessingError(result.error || 'Processing failed');
      }

    } catch (error) {
      console.error('Processing error:', error);
      onProcessingError('Network error during processing');
    }
  };

  // Calculate progress percentage
  const progressPercentage = currentStatus.totalBatches > 0 
    ? (currentStatus.completedBatches / currentStatus.totalBatches) * 100 
    : 0;

  // Format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = (status: ImageBatch['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  // Calculate estimated time remaining
  const estimateTimeRemaining = (): string => {
    if (currentStatus.completedBatches === 0) return 'Calculating...';
    
    const avgTimePerBatch = elapsedTime / currentStatus.completedBatches;
    const remainingBatches = currentStatus.totalBatches - currentStatus.completedBatches;
    const estimatedSeconds = Math.round(avgTimePerBatch * remainingBatches);
    
    return formatElapsedTime(estimatedSeconds);
  };

  const errorBatches = session.batches.filter(b => b.status === 'error');
  const hasErrors = errorBatches.length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-blue-700">Processing Status</span>
          <Badge variant={session.status === 'completed' ? 'default' : session.status === 'error' ? 'destructive' : 'secondary'}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time diagnostic analysis progress for {session.totalImages} medical images
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(progressPercentage)}% ({currentStatus.completedBatches}/{currentStatus.totalBatches} batches)</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">Current Status</h4>
          <p className="text-sm text-gray-600">{currentStatus.currentStatus}</p>
        </div>

        {/* Processing Stats */}
        {processingStarted && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Elapsed Time:</span>
              <div className="text-blue-600 font-mono">{formatElapsedTime(elapsedTime)}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Remaining:</span>
              <div className="text-blue-600 font-mono">
                {currentStatus.isProcessing ? estimateTimeRemaining() : '0:00'}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Images:</span>
              <div className="text-gray-600">{session.totalImages} total</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Batches:</span>
              <div className="text-gray-600">{currentStatus.totalBatches} batches</div>
            </div>
          </div>
        )}

        {/* Batch Status Grid */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Batch Status</h4>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {session.batches.map((batch) => (
              <div
                key={batch.id}
                className={`w-8 h-8 rounded flex items-center justify-center text-xs text-white font-medium ${getStatusColor(batch.status)}`}
                title={`Batch ${batch.batchNumber}: ${batch.status} (${batch.images.length} images)`}
              >
                {batch.batchNumber}
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded" role="presentation"></div>
              Pending
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" role="presentation"></div>
              Processing
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" role="presentation"></div>
              Completed
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" role="presentation"></div>
              Error
            </div>
          </div>
        </div>

        {/* Error Summary */}
        {hasErrors && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-1">
                <strong>{errorBatches.length} batch(es) encountered errors:</strong>
                {errorBatches.slice(0, 3).map(batch => (
                  <div key={batch.id} className="text-sm">
                    • Batch {batch.batchNumber}: {batch.error || 'Unknown error'}
                  </div>
                ))}
                {errorBatches.length > 3 && (
                  <div className="text-sm">• And {errorBatches.length - 3} more errors...</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        {!processingStarted && session.status !== 'completed' && (
          <Button 
            onClick={startProcessing}
            disabled={currentStatus.isProcessing}
            className="w-full"
          >
            Start Diagnostic Analysis
          </Button>
        )}

        {session.status === 'completed' && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-green-700 font-medium">✓ Analysis Complete!</div>
            <div className="text-sm text-green-600 mt-1">
              Diagnostic report generated successfully
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}