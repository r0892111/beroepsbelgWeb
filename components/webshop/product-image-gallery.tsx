'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProductImage } from '@/lib/data/types';

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  fallbackImage?: string;
}

export function ProductImageGallery({ images, productName, fallbackImage }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Sort images by sort_order, primary first
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const currentImage = sortedImages[currentIndex] || (fallbackImage ? { image_url: fallbackImage } : null);

  if (!currentImage && !fallbackImage) {
    return null;
  }
  
  const displayImage = currentImage || (fallbackImage ? { image_url: fallbackImage } : null);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sortedImages.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < sortedImages.length - 1 ? prev + 1 : 0));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <div 
          className="relative w-full min-h-[300px] rounded-lg border border-[#1a3628]/10 bg-gray-100 flex items-center justify-center overflow-hidden cursor-zoom-in group"
          onClick={() => {
            const imageToZoom = displayImage?.image_url;
            if (imageToZoom) {
              setLightboxImage(imageToZoom);
            }
          }}
        >
          {displayImage && (
            <>
              <Image
                src={displayImage.image_url}
                alt={`${productName} - Image ${currentIndex + 1}`}
                width={1200}
                height={1200}
                className="w-full h-auto max-h-[600px] object-contain transition-transform duration-300 group-hover:scale-105"
                unoptimized
                style={{ maxWidth: '100%' }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none">
                <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>
              {sortedImages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevious();
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white z-10 pointer-events-none">
                    {currentIndex + 1} / {sortedImages.length}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {sortedImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sortedImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => handleThumbnailClick(index)}
                className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  index === currentIndex
                    ? 'border-[#1BDD95] ring-2 ring-[#1BDD95]/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Image
                  src={image.image_url}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {image.is_primary && (
                  <div className="absolute top-1 right-1 rounded bg-yellow-500 p-0.5">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox/Zoom Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImage(null);
            }}
            className="fixed top-4 right-4 text-white text-4xl font-light hover:opacity-70 z-10 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Close zoom"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt={`${productName} - Zoomed view`}
              className="max-w-full max-h-[95vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {sortedImages.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white border-white/30 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = currentIndex > 0 ? currentIndex - 1 : sortedImages.length - 1;
                  setCurrentIndex(newIndex);
                  setLightboxImage(sortedImages[newIndex].image_url);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white border-white/30 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = currentIndex < sortedImages.length - 1 ? currentIndex + 1 : 0;
                  setCurrentIndex(newIndex);
                  setLightboxImage(sortedImages[newIndex].image_url);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}

