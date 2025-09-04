// TypeScript interfaces for radiology diagnostic system

export interface UploadedImage {
  id: string;
  filename: string;
  size: number;
  type: string;
  base64: string;
  uploadedAt: Date;
}

export interface ImageBatch {
  id: string;
  images: UploadedImage[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  batchNumber: number;
  totalBatches: number;
  processedAt?: Date;
  result?: string;
  error?: string;
}

export interface DiagnosticSession {
  id: string;
  patientId?: string;
  totalImages: number;
  batches: ImageBatch[];
  status: 'uploading' | 'processing' | 'completed' | 'error';
  createdAt: Date;
  completedAt?: Date;
  finalReport?: DiagnosticReport;
}

export interface DiagnosticReport {
  id: string;
  sessionId: string;
  patientId?: string;
  summary: string;
  findings: Finding[];
  recommendations: string[];
  confidence: number;
  processingTime: number;
  imageCount: number;
  generatedAt: Date;
}

export interface Finding {
  id: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  location?: string;
  confidence: number;
  relatedImages?: string[];
}

export interface ProcessingStatus {
  sessionId: string;
  currentBatch: number;
  totalBatches: number;
  completedBatches: number;
  isProcessing: boolean;
  currentStatus: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface AIConfig {
  model: string;
  systemPrompt: string;
  maxImagesPerBatch: number;
  timeout: number;
}

export interface UploadConfig {
  maxFiles: number;
  maxFileSize: number;
  acceptedTypes: string[];
  maxTotalSize: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  sessionId: string;
  uploadedImages: UploadedImage[];
  totalBatches: number;
}

export interface DiagnoseResponse {
  sessionId: string;
  batchResults: ImageBatch[];
  finalReport?: DiagnosticReport;
  isComplete: boolean;
}