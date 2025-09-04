// API route for handling medical image uploads

import { NextRequest, NextResponse } from 'next/server';
import { FileProcessor } from '@/lib/file-utils';
import { UploadedImage, ApiResponse, UploadResponse } from '@/types/diagnostic';

// Configure upload limits
export const maxDuration = 300; // 5 minutes for large uploads

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const data = await request.formData();
    const files: File[] = [];
    const sessionId = data.get('sessionId') as string || FileProcessor.generateId();
    const patientId = data.get('patientId') as string || undefined;

    // Extract files from form data
    for (const [key, value] of data.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'No files provided'
      }, { status: 400 });
    }

    // Validate files
    const validation = FileProcessor.validateFiles(files);
    if (!validation.valid) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: validation.errors.join('; ')
      }, { status: 400 });
    }

    // Process files directly to base64 (simplified approach for development)
    const uploadedImages: UploadedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Convert file to base64 for API processing
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');

        const uploadedImage: UploadedImage = {
          id: FileProcessor.generateId(),
          filename: file.name,
          size: file.size,
          type: file.type,
          base64,
          uploadedAt: new Date()
        };

        uploadedImages.push(uploadedImage);

      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: `Failed to process file: ${file.name}`
        }, { status: 500 });
      }
    }

    // Calculate number of batches needed (20 images per batch)
    const totalBatches = Math.ceil(uploadedImages.length / 20);

    // In a production environment, you would store this in a database
    // For now, we'll just return the data for the frontend to handle
    console.log(`Session ${sessionId}: Processed ${uploadedImages.length} images into ${totalBatches} batches`);

    const response: UploadResponse = {
      sessionId,
      uploadedImages,
      totalBatches
    };

    return NextResponse.json<ApiResponse<UploadResponse>>({
      success: true,
      data: response,
      message: `Successfully uploaded ${uploadedImages.length} images`
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error during upload'
    }, { status: 500 });
  }
}

// Handle file size limits
export async function GET() {
  return NextResponse.json({
    maxFiles: 200,
    maxFileSize: 50 * 1024 * 1024, // 50MB per file
    maxTotalSize: 2 * 1024 * 1024 * 1024, // 2GB total
    supportedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/bmp',
      'image/tiff',
      'image/webp',
      'image/dicom'
    ]
  });
}