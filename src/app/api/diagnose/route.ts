// API route for processing images through Claude Sonnet 4 in batches

import { NextRequest, NextResponse } from 'next/server';
import { DiagnosticAI } from '@/lib/diagnostic-ai';
import { FileProcessor } from '@/lib/file-utils';
import { 
  ImageBatch, 
  DiagnosticSession, 
  DiagnosticReport,
  ApiResponse, 
  DiagnoseResponse 
} from '@/types/diagnostic';

// Configure processing limits
export const maxDuration = 900; // 15 minutes for batch processing

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, images, patientId, customPrompt } = body;

    if (!sessionId || !images || !Array.isArray(images)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required fields: sessionId and images array'
      }, { status: 400 });
    }

    if (images.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'No images provided for processing'
      }, { status: 400 });
    }

    // Create image batches (20 images per batch)
    const imageBatches = FileProcessor.createBatches(images, 20);
    const batches: ImageBatch[] = [];

    // Initialize batch objects
    imageBatches.forEach((batchImages, index) => {
      batches.push({
        id: `batch-${sessionId}-${index}`,
        images: batchImages,
        status: 'pending',
        batchNumber: index + 1,
        totalBatches: imageBatches.length
      });
    });

    // Create diagnostic session
    const session: DiagnosticSession = {
      id: sessionId,
      patientId,
      totalImages: images.length,
      batches,
      status: 'processing',
      createdAt: new Date()
    };

    // Process each batch sequentially
    console.log(`Starting processing of ${imageBatches.length} batches for session ${sessionId}`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        batch.status = 'processing';
        console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.images.length} images`);
        
        // Process batch through Claude Sonnet 4
        const result = await DiagnosticAI.processBatch(
          batch.images,
          batch.batchNumber,
          batch.totalBatches,
          customPrompt
        );

        if (result.success) {
          batch.status = 'completed';
          batch.result = result.result;
          batch.processedAt = new Date();
          console.log(`Batch ${i + 1} completed successfully`);
        } else {
          batch.status = 'error';
          batch.error = result.error;
          console.error(`Batch ${i + 1} failed:`, result.error);
        }

      } catch (error) {
        console.error(`Batch ${i + 1} processing error:`, error);
        batch.status = 'error';
        batch.error = error instanceof Error ? error.message : 'Unknown processing error';
      }

      // Small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Check if all batches completed successfully
    const completedBatches = batches.filter(b => b.status === 'completed');
    const errorBatches = batches.filter(b => b.status === 'error');

    if (completedBatches.length === 0) {
      session.status = 'error';
      return NextResponse.json<ApiResponse<DiagnoseResponse>>({
        success: false,
        error: `All batches failed to process. Errors: ${errorBatches.map(b => b.error).join('; ')}`,
        data: {
          sessionId,
          batchResults: batches,
          isComplete: false
        }
      }, { status: 500 });
    }

    // Generate final diagnostic report
    let finalReport: DiagnosticReport | undefined;
    
    if (completedBatches.length > 0) {
      try {
        finalReport = DiagnosticAI.compileFinalReport(sessionId, batches, patientId);
        session.finalReport = finalReport;
        session.status = 'completed';
        session.completedAt = new Date();
        
        console.log(`Session ${sessionId} completed with final report generated`);
      } catch (error) {
        console.error('Failed to generate final report:', error);
        session.status = 'error';
      }
    }

    const response: DiagnoseResponse = {
      sessionId,
      batchResults: batches,
      finalReport,
      isComplete: session.status === 'completed'
    };

    const statusMessage = errorBatches.length > 0 
      ? `Processing completed with ${errorBatches.length} batch(es) failed out of ${batches.length}`
      : `Successfully processed all ${batches.length} batches`;

    return NextResponse.json<ApiResponse<DiagnoseResponse>>({
      success: true,
      data: response,
      message: statusMessage
    });

  } catch (error) {
    console.error('Diagnose API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error during diagnosis processing'
    }, { status: 500 });
  }
}

// Get processing status for a session
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Session ID is required'
    }, { status: 400 });
  }

  // In a production environment, you would retrieve this from a database
  // For now, return a placeholder response
  return NextResponse.json({
    success: true,
    data: {
      sessionId,
      status: 'In development - status tracking will be implemented with database integration',
      message: 'Use POST method to start processing'
    }
  });
}