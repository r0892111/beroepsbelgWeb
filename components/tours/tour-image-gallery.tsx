'use client';

import Image from 'next/image';
import { useState } from 'react';

interface TourImageGalleryProps {
  images: string[];
  title: string;
}

export function TourImageGallery({ images, title }: TourImageGalleryProps) {
  const [showAllImages, setShowAllImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (images.length === 0) return null;

  const remainingCount = images.length - 1;

  return (
    <>
      <div className="mb-8">
        {images.length === 1 ? (
          <div
            className="group relative cursor-zoom-in overflow-hidden rounded-lg"
            onClick={() => setLightboxImage(images[0])}
          >
            <Image
              src={images[0]}
              alt={title}
              width={1200}
              height={800}
              className="w-full h-auto max-h-[600px] object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="group relative cursor-zoom-in overflow-hidden rounded-lg"
              onClick={() => setLightboxImage(images[0])}
            >
              <Image
                src={images[0]}
                alt={title}
                width={1200}
                height={800}
                className="w-full h-auto max-h-[600px] object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <div
              className="group relative cursor-pointer overflow-hidden rounded-lg bg-muted/50 p-4 transition-all hover:bg-muted"
              onClick={() => setShowAllImages(true)}
            >
              <div className="flex items-center justify-center gap-3">
                <div className="grid grid-cols-3 gap-2">
                  {images.slice(1, Math.min(4, images.length)).map((image, idx) => (
                    <div key={idx} className="relative h-20 w-20 overflow-hidden rounded">
                      <Image
                        src={image}
                        alt={`${title} ${idx + 2}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">+{remainingCount}</p>
                  <p className="text-sm text-muted-foreground">Bekijk alle foto's</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAllImages && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 p-4">
          <button
            onClick={() => setShowAllImages(false)}
            className="fixed top-4 right-4 text-white text-4xl font-light hover:opacity-70 z-10"
          >
            ×
          </button>
          <div className="container mx-auto py-8">
            <div className="grid gap-4 md:grid-cols-2">
              {images.map((image, idx) => (
                <div
                  key={idx}
                  className="cursor-zoom-in overflow-hidden rounded-lg"
                  onClick={() => setLightboxImage(image)}
                >
                  <img
                    src={image}
                    alt={`${title} ${idx + 1}`}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="fixed top-4 right-4 text-white text-4xl font-light hover:opacity-70"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt={title}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}
