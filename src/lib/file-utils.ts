// File processing utilities for medical image handling

import { UploadedImage } from '@/types/diagnostic';

export class FileProcessor {
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/bmp',
    'image/tiff',
    'image/webp',
    'image/dicom'
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per image
  private static readonly MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024; // 2GB total

  /**
   * Validate uploaded files for medical imaging requirements
   */
  static validateFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (files.length === 0) {
      errors.push('No files selected');
      return { valid: false, errors };
    }

    if (files.length > 200) {
      errors.push('Maximum 200 images allowed');
    }

    let totalSize = 0;
    files.forEach((file, index) => {
      // Check file type
      if (!this.SUPPORTED_FORMATS.includes(file.type.toLowerCase())) {
        errors.push(`File ${index + 1} (${file.name}): Unsupported format. Supported: JPEG, PNG, BMP, TIFF, WebP, DICOM`);
      }

      // Check individual file size
      if (file.size > this.MAX_FILE_SIZE) {
        errors.push(`File ${index + 1} (${file.name}): Size exceeds 50MB limit`);
      }

      totalSize += file.size;
    });

    // Check total size
    if (totalSize > this.MAX_TOTAL_SIZE) {
      errors.push(`Total upload size exceeds 2GB limit`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Convert file to base64 for API transmission
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Process multiple files into UploadedImage objects
   */
  static async processFiles(files: File[]): Promise<UploadedImage[]> {
    const processed: UploadedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await this.fileToBase64(file);
        const uploadedImage: UploadedImage = {
          id: this.generateId(),
          filename: file.name,
          size: file.size,
          type: file.type,
          base64,
          uploadedAt: new Date()
        };
        processed.push(uploadedImage);
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        throw new Error(`Failed to process file: ${file.name}`);
      }
    }

    return processed;
  }

  /**
   * Split images into batches for API processing
   */
  static createBatches(images: UploadedImage[], batchSize: number = 20): UploadedImage[][] {
    const batches: UploadedImage[][] = [];
    
    for (let i = 0; i < images.length; i += batchSize) {
      batches.push(images.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Generate unique ID for images and sessions
   */
  static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Validate image file extension
   */
  static isValidImageExtension(filename: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.dcm'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return validExtensions.includes(ext);
  }

  /**
   * Generate thumbnail URL for preview (placeholder for now)
   */
  static generateThumbnailUrl(imageId: string): string {
    return `https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/d98520bd-4747-4aa6-a900-6e36c16ca2fe.png 4)}`;
  }
}