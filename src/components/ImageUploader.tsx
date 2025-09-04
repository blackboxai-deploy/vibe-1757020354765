'use client';

// Medical image uploader component with drag-and-drop support

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileProcessor } from '@/lib/file-utils';
import { UploadResponse } from '@/types/diagnostic';

interface ImageUploaderProps {
  onUploadComplete: (response: UploadResponse) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

export function ImageUploader({ onUploadComplete, onUploadError, disabled = false }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [patientId, setPatientId] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Handle file selection
  const handleFileSelection = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const validation = FileProcessor.validateFiles(fileArray);
    
    if (validation.valid) {
      setSelectedFiles(fileArray);
      setValidationErrors([]);
    } else {
      setValidationErrors(validation.errors);
      setSelectedFiles([]);
    }
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    handleFileSelection(files);
  }, [handleFileSelection]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files);
  };

  // Upload files to server
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      
      // Add files to form data
      selectedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      // Add session metadata
      const sessionId = FileProcessor.generateId();
      formData.append('sessionId', sessionId);
      
      if (patientId.trim()) {
        formData.append('patientId', patientId.trim());
      }

      // Simulate progress updates (in production, use xhr or fetch with progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (result.success && result.data) {
        onUploadComplete(result.data);
        setSelectedFiles([]);
        setPatientId('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        onUploadError(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Network error during upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Clear selected files
  const clearFiles = () => {
    setSelectedFiles([]);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculate total file size
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const formattedSize = FileProcessor.formatFileSize(totalSize);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          Medical Image Upload
        </CardTitle>
        <CardDescription>
          Upload medical images for diagnostic analysis. Supports JPEG, PNG, BMP, TIFF, WebP, and DICOM formats.
          Maximum 200 images, 50MB per image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient ID Input */}
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="patientId">Patient ID (Optional)</Label>
          <Input
            type="text"
            id="patientId"
            placeholder="Enter patient identifier"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={disabled || uploading}
          />
        </div>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.dcm"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          <div className="space-y-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <div className="w-8 h-8 bg-blue-500 rounded" role="presentation"></div>
            </div>
            
            <h3 className="text-lg font-medium text-gray-700">
              {isDragging ? 'Drop images here' : 'Upload Medical Images'}
            </h3>
            
            <p className="text-sm text-gray-500">
              Drag and drop your medical images here, or click to browse files
            </p>
            
            <p className="text-xs text-gray-400">
              Supports: JPEG, PNG, BMP, TIFF, WebP, DICOM • Max 200 files • 50MB per file
            </p>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Selected Files Summary */}
        {selectedFiles.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-700">Selected Files</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFiles}
                disabled={uploading}
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Count:</span> {selectedFiles.length} files
              </div>
              <div>
                <span className="font-medium">Total Size:</span> {formattedSize}
              </div>
              <div>
                <span className="font-medium">Batches:</span> {Math.ceil(selectedFiles.length / 20)}
              </div>
              <div>
                <span className="font-medium">Est. Processing:</span> {Math.ceil(selectedFiles.length / 20) * 2}min
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading images...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Upload Button */}
        <div className="flex gap-2">
          <Button 
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading || disabled}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Images`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}