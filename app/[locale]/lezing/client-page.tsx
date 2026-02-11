'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, ArrowRight, X, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Lecture } from '@/lib/data/types';

interface LezingClientPageProps {
  lectures: Lecture[];
  locale: string;
}

export default function LezingClientPage({ lectures, locale }: LezingClientPageProps) {
  const t = useTranslations('lecture');
  const router = useRouter();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Determine which language to display
  const getDisplayLocale = () => {
    if (locale === 'nl') return 'nl';
    if (locale === 'en') return 'en';
    // Force English for French and German locales
    if (locale === 'fr' || locale === 'de') return 'en';
    return 'en'; // Fallback to English for other locales
  };

  const displayLocale = getDisplayLocale();

  useEffect(() => {
    // Show disclaimer for all locales
    const dismissed = localStorage.getItem('lecture-disclaimer-dismissed');
    setShowDisclaimer(!dismissed);
  }, []);

  const handleDismissDisclaimer = () => {
    setShowDisclaimer(false);
    localStorage.setItem('lecture-disclaimer-dismissed', 'true');
  };

  const handleBookLecture = (lecture: Lecture) => {
    // Redirect to quote page with lecture ID as query parameter
    router.push(`/${locale}/b2b-offerte?lectureId=${lecture.id}`);
  };

  // Helper function to get localized content
  const getLocalizedContent = (lecture: Lecture, field: keyof Lecture): string => {
    if (displayLocale === 'nl') {
      return (lecture[field] as string) || '';
    }
    // For English, try English field first, fallback to Dutch
    const enField = `${field}_en` as keyof Lecture;
    return (lecture[enField] as string) || (lecture[field] as string) || '';
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Hero Section with Green Background */}
      <div className="bg-[#1BDD95] pt-10 md:pt-14 pb-32 md:pb-40 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="mb-4 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-white">
            {t('title')}
          </h1>
        </div>
      </div>

      {/* Content Section - overlaps the green */}
      <div className="px-4 md:px-8 -mt-24 md:-mt-32 pb-16 md:pb-24">
        <div className="mx-auto max-w-5xl">
          {/* Disclaimer for all locales */}
          {showDisclaimer && (
          <Alert className="mb-8 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-800">{t('disclaimer')}</span>
              <button
                onClick={handleDismissDisclaimer}
                className="ml-4 text-blue-600 hover:text-blue-800 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        )}

        {lectures.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 font-inter">No lectures available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            <Accordion type="single" collapsible className="w-full">
              {lectures.map((lecture) => {
                const title = getLocalizedContent(lecture, 'title');
                const date = getLocalizedContent(lecture, 'date');
                const location = getLocalizedContent(lecture, 'location');
                const groupSize = getLocalizedContent(lecture, 'group_size');
                const description1 = getLocalizedContent(lecture, 'description1');
                const description2 = getLocalizedContent(lecture, 'description2');
                const description = getLocalizedContent(lecture, 'description');
                const primaryImage = lecture.lectureImages?.find(img => img.is_primary) || lecture.lectureImages?.[0];
                const otherImages = lecture.lectureImages?.filter(img => img.id !== primaryImage?.id) || [];
                const hasMoreImages = otherImages.length > 0;

                return (
                  <AccordionItem key={lecture.id} value={lecture.id} className="bg-white rounded-2xl shadow-md border-0 mb-4 px-6">
                    <AccordionTrigger className="hover:no-underline py-6">
                      <div className="flex-1 text-left">
                        <div className="flex items-start gap-4">
                          {/* Primary Image Thumbnail - 24x24 (w-24 h-24 = 96px) in collapsed state */}
                          {primaryImage && (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={primaryImage.image_url}
                                alt={title}
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                              {/* Show count badge if more images exist */}
                              {hasMoreImages && (
                                <div className="absolute top-1 right-1 bg-black/80 text-white text-xs px-2 py-1 rounded-full font-semibold backdrop-blur-sm">
                                  +{otherImages.length}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <h2 className="text-2xl md:text-3xl font-bold font-oswald text-neutral-900 mb-3">
                              {title}
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-3 mt-4">
                              {date && (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
                                    <Calendar className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">{t('date')}</p>
                                    <p className="font-bold text-neutral-900 font-oswald text-base">{date}</p>
                                  </div>
                                </div>
                              )}
                              {location && (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">{t('location')}</p>
                                    <p className="font-bold text-neutral-900 font-oswald text-base">{location}</p>
                                  </div>
                                </div>
                              )}
                              {groupSize && (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#1BDD95] flex items-center justify-center flex-shrink-0">
                                    <Users className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500 font-inter uppercase tracking-wider mb-1">{t('groupSize')}</p>
                                    <p className="font-bold text-neutral-900 font-oswald text-base">{groupSize}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">
                      <div className="space-y-4 pt-4">
                        {/* Images Gallery - Collage layout with all images */}
                        {lecture.lectureImages && lecture.lectureImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {lecture.lectureImages.map((image) => (
                              <div 
                                key={image.id} 
                                className="relative aspect-square rounded-lg overflow-hidden border-2 border-neutral-200"
                              >
                                <Image
                                  src={image.image_url}
                                  alt={title}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {description1 && (
                          <p className="text-lg md:text-xl leading-relaxed text-neutral-700 font-inter">
                            {description1}
                          </p>
                        )}
                        {description2 && (
                          <p className="text-base md:text-lg leading-relaxed text-neutral-600 font-inter">
                            {description2}
                          </p>
                        )}
                        {description && (
                          <p className="text-base md:text-lg leading-relaxed text-neutral-600 font-inter">
                            {description}
                          </p>
                        )}
                        <div className="pt-4">
                          <button
                            onClick={() => handleBookLecture(lecture)}
                            className="group/btn relative inline-flex items-center justify-center gap-2 px-8 py-5 bg-[#1BDD95] hover:bg-[#14BE82] rounded-full text-white font-oswald font-bold text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                          >
                            <span>{t('bookLecture')}</span>
                            <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                          </button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

