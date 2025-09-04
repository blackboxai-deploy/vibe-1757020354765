'use client';

// Image gallery component for previewing uploaded medical images

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UploadedImage } from '@/types/diagnostic';
import { FileProcessor } from '@/lib/file-utils';

interface ImageGalleryProps {
  images: UploadedImage[];
  title?: string;
  showBatchInfo?: boolean;
}

export function ImageGallery({ images, title = 'Medical Images', showBatchInfo = true }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const imagesPerPage = 20;
  const totalPages = Math.ceil(images.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const currentImages = images.slice(startIndex, endIndex);
  
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  const batches = Math.ceil(images.length / 20);

  // Handle image click for preview
  const handleImageClick = (image: UploadedImage) => {
    setSelectedImage(image);
  };

  // Close preview modal
  const closePreview = () => {
    setSelectedImage(null);
  };

  // Navigation handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (images.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-gray-300 rounded" role="presentation"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-700">No Images</h3>
            <p className="text-sm">Upload medical images to view them here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-blue-700">{title}</CardTitle>
              <CardDescription>
                {images.length} images • {FileProcessor.formatFileSize(totalSize)}
                {showBatchInfo && ` • ${batches} processing batches`}
              </CardDescription>
            </div>
            
            {showBatchInfo && (
              <Badge variant="outline" className="text-blue-600">
                {batches} Batches
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            {/* Image Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 mb-6">
              {currentImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleImageClick(image)}
                >
                  {/* Thumbnail - Using placeholder for medical images */}
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 rounded mx-auto mb-2" role="presentation"></div>
                      <span className="text-xs text-blue-700 font-medium">
                        {image.filename.split('.')[1]?.toUpperCase() || 'IMG'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Preview
                    </Button>
                  </div>
                  
                  {/* Image Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="text-white text-xs truncate">
                      {image.filename.length > 15 
                        ? `${image.filename.substring(0, 12)}...${image.filename.split('.').pop()}` 
                        : image.filename
                      }
                    </div>
                    <div className="text-white/80 text-xs">
                      {FileProcessor.formatFileSize(image.size)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, images.length)} of {images.length} images
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + Math.max(1, currentPage - 2);
                      if (page > totalPages) return null;
                      
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      <Dialog open={selectedImage !== null} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedImage.filename}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="bg-gray-100 rounded-lg flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-blue-500 rounded-lg mx-auto mb-4" role="presentation"></div>
                    <h3 className="text-xl font-medium text-gray-700 mb-2">Medical Image Preview</h3>
                    <p className="text-gray-500 text-sm">
                      Full image preview requires specialized medical imaging software
                    </p>
                    <div className="mt-4 text-sm text-gray-600">
                      <div>File: {selectedImage.filename}</div>
                      <div>Type: {selectedImage.type}</div>
                      <div>Size: {FileProcessor.formatFileSize(selectedImage.size)}</div>
                      <div>Uploaded: {selectedImage.uploadedAt.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                
                {/* Image Metadata */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Image Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Filename:</span>
                      <div className="break-all">{selectedImage.filename}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">File Type:</span>
                      <div>{selectedImage.type}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">File Size:</span>
                      <div>{FileProcessor.formatFileSize(selectedImage.size)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Upload Time:</span>
                      <div>{selectedImage.uploadedAt.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Image ID:</span>
                      <div className="font-mono text-xs">{selectedImage.id}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <Badge variant="outline" className="ml-2">Ready for Processing</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}