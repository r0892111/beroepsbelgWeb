'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Play, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TourImage } from '@/lib/data/types';

interface TourImageGalleryProps {
  images: TourImage[];
  title: string;
  fallbackImage?: string;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  id?: string;
  is_primary?: boolean;
}

export function TourImageGallery({ images, title, fallbackImage }: TourImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxMedia, setLightboxMedia] = useState<MediaItem | null>(null);

  // Sort images by sort_order, primary first
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  // Create media items with type information
  const mediaItems: MediaItem[] = sortedImages.length > 0
    ? sortedImages.map(img => ({
        url: img.image_url,
        type: (img.media_type || 'image') as 'image' | 'video',
        id: img.id,
        is_primary: img.is_primary,
      }))
    : (fallbackImage ? [{ url: fallbackImage, type: 'image' as const }] : []);

  if (mediaItems.length === 0) return null;

  const currentMedia = mediaItems[currentIndex];
  const remainingCount = mediaItems.length - 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleMainMediaClick = () => {
    if (currentMedia.type === 'image') {
      setLightboxMedia(currentMedia);
    }
    // Videos don't open in lightbox, they play inline
  };

  return (
    <>
      <div className="mb-12 space-y-4">
        {/* Main Media */}
          <div
          className={`relative w-full min-h-[300px] rounded-lg border border-[#1a3628]/10 bg-gray-100 flex items-center justify-center overflow-hidden ${
            currentMedia.type === 'image' ? 'cursor-zoom-in group' : ''
          }`}
          onClick={handleMainMediaClick}
            >
          {currentMedia && (
            <>
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  controls
                  preload="metadata"
                  className="w-full h-auto max-h-[600px] object-contain"
                  style={{ maxWidth: '100%' }}
                />
              ) : (
                <>
                    <Image
                      src={currentMedia.url}
                      alt={`${title}${mediaItems.length > 1 ? ` - Image ${currentIndex + 1}` : ''}`}
                      width={1200}
                      height={1200}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1200px"
                      className="w-full h-auto max-h-[600px] object-contain transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                      style={{ maxWidth: '100%' }}
                      priority={currentIndex === 0}
                    />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none">
                    <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </>
              )}
              {mediaItems.length > 1 && (
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
                    {currentIndex + 1} / {mediaItems.length}
            </div>
                </>
              )}
            </>
        )}
      </div>

        {/* Thumbnail Strip */}
        {mediaItems.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {mediaItems.map((media, index) => {
              const image = sortedImages[index];
              return (
          <button
                  key={image?.id || index}
                  onClick={() => handleThumbnailClick(index)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    index === currentIndex
                      ? 'border-[#1BDD95] ring-2 ring-[#1BDD95]/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {media.type === 'video' ? (
                    <>
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <Image
                      src={media.url}
                      alt={`${title}${mediaItems.length > 1 ? ` thumbnail ${index + 1}` : ''}`}
                      fill
                      sizes="(max-width: 768px) 20vw, 100px"
                      className="object-cover"
                      unoptimized
                      loading="lazy"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
        </div>

      {/* Lightbox/Zoom Modal - Only for images */}
      {lightboxMedia && lightboxMedia.type === 'image' && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 cursor-zoom-out"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxMedia(null);
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
            src={lightboxMedia.url}
              alt={title}
              className="max-w-full max-h-[95vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {mediaItems.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white border-white/30 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  // Find previous image (skip videos)
                  let newIndex = currentIndex;
                  do {
                    newIndex = newIndex > 0 ? newIndex - 1 : mediaItems.length - 1;
                  } while (newIndex !== currentIndex && mediaItems[newIndex].type !== 'image');
                  if (mediaItems[newIndex].type === 'image') {
                    setCurrentIndex(newIndex);
                    setLightboxMedia(mediaItems[newIndex]);
                  }
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
                  // Find next image (skip videos)
                  let newIndex = currentIndex;
                  do {
                    newIndex = newIndex < mediaItems.length - 1 ? newIndex + 1 : 0;
                  } while (newIndex !== currentIndex && mediaItems[newIndex].type !== 'image');
                  if (mediaItems[newIndex].type === 'image') {
                    setCurrentIndex(newIndex);
                    setLightboxMedia(mediaItems[newIndex]);
                  }
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
