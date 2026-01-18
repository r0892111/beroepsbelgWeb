'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProductImage } from '@/lib/data/types';

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  fallbackImage?: string;
}

// Helper to detect if media is a video
function isVideoMedia(media: ProductImage): boolean {
  if (media.media_type === 'video') return true;
  if (media.image_url && /\.(mp4|webm|mov|ogg)$/i.test(media.image_url)) return true;
  return false;
}

export function ProductImageGallery({ images, productName, fallbackImage }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; isVideo: boolean } | null>(null);

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
        {/* Main Image/Video */}
        <div
          className={`relative w-full min-h-[300px] rounded-lg border border-[#1a3628]/10 bg-gray-100 flex items-center justify-center overflow-hidden group ${currentImage && !isVideoMedia(currentImage as ProductImage) ? 'cursor-zoom-in' : ''}`}
          onClick={() => {
            if (displayImage && displayImage.image_url) {
              const isVideo = currentImage ? isVideoMedia(currentImage as ProductImage) : false;
              setLightboxMedia({ url: displayImage.image_url, isVideo });
            }
          }}
        >
          {displayImage && (
            <>
              {currentImage && isVideoMedia(currentImage as ProductImage) ? (
                <video
                  src={displayImage.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="w-full h-auto max-h-[600px] object-contain"
                  style={{ maxWidth: '100%' }}
                />
              ) : (
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
                </>
              )}
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
            {sortedImages.map((image, index) => {
              const isVideo = isVideoMedia(image);
              return (
                <button
                  key={image.id}
                  onClick={() => handleThumbnailClick(index)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    index === currentIndex
                      ? 'border-[#1BDD95] ring-2 ring-[#1BDD95]/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isVideo ? (
                    <video
                      src={image.image_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={image.image_url}
                      alt={`${productName} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  )}
                  {image.is_primary && (
                    <div className="absolute top-1 right-1 rounded bg-yellow-500 p-0.5">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox/Zoom Modal */}
      {lightboxMedia && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 ${!lightboxMedia.isVideo ? 'cursor-zoom-out' : ''}`}
          onClick={() => setLightboxMedia(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxMedia(null);
            }}
            className="fixed top-4 right-4 text-white text-4xl font-light hover:opacity-70 z-10 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.isVideo ? (
              <video
                src={lightboxMedia.url}
                autoPlay
                loop
                controls
                playsInline
                className="max-w-full max-h-[95vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={lightboxMedia.url}
                alt={`${productName} - Zoomed view`}
                className="max-w-full max-h-[95vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
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
                  const nextMedia = sortedImages[newIndex];
                  setLightboxMedia({ url: nextMedia.image_url, isVideo: isVideoMedia(nextMedia) });
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
                  const nextMedia = sortedImages[newIndex];
                  setLightboxMedia({ url: nextMedia.image_url, isVideo: isVideoMedia(nextMedia) });
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

