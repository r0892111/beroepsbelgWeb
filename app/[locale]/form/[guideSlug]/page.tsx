'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, CheckCircle, Loader2, Instagram, Facebook, Youtube, MessageCircle, Linkedin, Users, Newspaper, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Source options for "How did you find us?"
// Labels use translation keys that will be looked up via t()
const SOURCE_OPTIONS = [
  { id: 'instagram', icon: Instagram, labelKey: 'sourceInstagram' },
  { id: 'tiktok', icon: null, labelKey: 'sourceTiktok' },
  { id: 'facebook', icon: Facebook, labelKey: 'sourceFacebook' },
  { id: 'youtube', icon: Youtube, labelKey: 'sourceYoutube' },
  { id: 'linkedin', icon: Linkedin, labelKey: 'sourceLinkedin' },
  { id: 'whatsapp', icon: MessageCircle, labelKey: 'sourceWhatsapp' },
  { id: 'tripadvisor', icon: null, labelKey: 'sourceTripadvisor' },
  { id: 'word-of-mouth', icon: Users, labelKey: 'sourceWordOfMouth' },
  { id: 'press', icon: Newspaper, labelKey: 'sourcePress' },
  { id: 'other', icon: HelpCircle, labelKey: 'sourceOther' },
] as const;

// TikTok icon (not in Lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

// TripAdvisor icon (not in Lucide)
function TripAdvisorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zm4-7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4 7c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
    </svg>
  );
}

// Source selector component - brick-styled cards
function SourceSelector({
  selected,
  onSelect,
  customValue,
  onCustomValueChange,
  label,
  t,
}: {
  selected: string | null;
  onSelect: (source: string) => void;
  customValue: string;
  onCustomValueChange: (value: string) => void;
  label: string;
  t: (key: string) => string;
}) {
  const getIcon = (id: string) => {
    const option = SOURCE_OPTIONS.find(o => o.id === id);
    if (!option) return null;

    if (id === 'tiktok') return <TikTokIcon className="h-5 w-5" />;
    if (id === 'tripadvisor') return <TripAdvisorIcon className="h-5 w-5" />;
    if (option.icon) {
      const IconComponent = option.icon;
      return <IconComponent className="h-5 w-5" />;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <Label className="text-navy font-semibold">{label}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {SOURCE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
              selected === option.id
                ? 'border-brass bg-brass/10 text-brass'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {getIcon(option.id)}
            <span className="text-xs font-medium text-center">{t(option.labelKey)}</span>
          </button>
        ))}
      </div>
      {selected === 'other' && (
        <Input
          type="text"
          value={customValue}
          onChange={(e) => onCustomValueChange(e.target.value)}
          placeholder={t('foundUsOtherPlaceholder')}
          className="mt-2 bg-white"
          autoFocus
        />
      )}
    </div>
  );
}

interface Guide {
  id: number;
  name: string;
  profile_picture: string | null;
}

// Star rating component
function StarRating({
  rating,
  onRatingChange,
  label
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-navy font-semibold">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hovered || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GuideFeedbackPage() {
  const params = useParams();
  const guideSlug = params.guideSlug as string;
  const t = useTranslations('feedbackForm');

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [guideRating, setGuideRating] = useState(0);
  const [guideFeedback, setGuideFeedback] = useState('');
  const [tourRating, setTourRating] = useState(0);
  const [tourFeedback, setTourFeedback] = useState('');
  const [bookingRating, setBookingRating] = useState(0);
  const [foundUsSource, setFoundUsSource] = useState<string | null>(null);
  const [foundUsOther, setFoundUsOther] = useState('');
  const [email, setEmail] = useState('');

  // Fetch guide by slug
  useEffect(() => {
    async function fetchGuide() {
      try {
        // Get all guides and find by slugified name
        const { data, error: fetchError } = await supabase
          .from('guides_temp')
          .select('id, name, profile_picture');

        if (fetchError) throw fetchError;

        // Find guide whose slugified name matches the URL slug
        const foundGuide = data?.find((g) => {
          if (!g.name) return false;
          const slug = g.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
          return slug === guideSlug;
        });

        if (foundGuide) {
          setGuide(foundGuide);
        } else {
          setError(t('errorGuideNotFound'));
        }
      } catch (err) {
        console.error('Error fetching guide:', err);
        setError(t('errorLoadGuide'));
      } finally {
        setLoading(false);
      }
    }

    if (guideSlug) {
      fetchGuide();
    }
  }, [guideSlug, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (guideRating === 0 || tourRating === 0) {
      toast.error(t('errorRatingsRequired'));
      return;
    }

    if (bookingRating === 0) {
      toast.error(t('errorBookingRatingRequired'));
      return;
    }

    if (!foundUsSource) {
      toast.error(t('errorSourceRequired'));
      return;
    }

    if (foundUsSource === 'other' && !foundUsOther.trim()) {
      toast.error(t('errorSourceOtherRequired'));
      return;
    }

    if (!email.trim()) {
      toast.error(t('errorEmailRequired'));
      return;
    }

    if (!guide) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/guide-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guideId: guide.id,
          guideRating,
          guideFeedback: guideFeedback.trim() || null,
          tourRating,
          tourFeedback: tourFeedback.trim() || null,
          bookingRating,
          foundUsSource: foundUsSource === 'other' ? foundUsOther.trim() : foundUsSource,
          email: email.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      toast.success(t('thankYou'));
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brass" />
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">{error || t('errorGuideNotFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-serif font-bold text-navy">{t('thankYou')}</h2>
            <p className="text-slate-600">{t('successMessage')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand py-8 md:py-16 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            {guide.profile_picture && (
              <div className="mx-auto mb-4 w-24 h-24 rounded-full overflow-hidden">
                <img
                  src={guide.profile_picture}
                  alt={guide.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardTitle className="text-2xl font-serif text-navy">
              {t('title', { guideName: guide.name })}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Guide Rating */}
              <StarRating
                rating={guideRating}
                onRatingChange={setGuideRating}
                label={`${t('guideRating')} *`}
              />

              {/* Guide Feedback */}
              <div className="space-y-2">
                <Label htmlFor="guideFeedback" className="text-navy font-semibold">
                  {t('guideFeedback')}
                </Label>
                <Textarea
                  id="guideFeedback"
                  value={guideFeedback}
                  onChange={(e) => setGuideFeedback(e.target.value)}
                  placeholder={t('guideFeedbackPlaceholder')}
                  rows={3}
                  className="bg-white"
                />
              </div>

              {/* Tour Rating */}
              <StarRating
                rating={tourRating}
                onRatingChange={setTourRating}
                label={`${t('tourRating')} *`}
              />

              {/* Tour Feedback */}
              <div className="space-y-2">
                <Label htmlFor="tourFeedback" className="text-navy font-semibold">
                  {t('tourFeedback')}
                </Label>
                <Textarea
                  id="tourFeedback"
                  value={tourFeedback}
                  onChange={(e) => setTourFeedback(e.target.value)}
                  placeholder={t('tourFeedbackPlaceholder')}
                  rows={3}
                  className="bg-white"
                />
              </div>

              {/* Booking Experience Rating */}
              <StarRating
                rating={bookingRating}
                onRatingChange={setBookingRating}
                label={`${t('bookingRating')} *`}
              />

              {/* How did you find us? */}
              <SourceSelector
                selected={foundUsSource}
                onSelect={setFoundUsSource}
                customValue={foundUsOther}
                onCustomValueChange={setFoundUsOther}
                label={`${t('foundUs')} *`}
                t={t}
              />

              {/* Email for discount */}
              <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <Label htmlFor="email" className="text-navy font-semibold flex items-center gap-2">
                  🎁 {t('discountTitle')} *
                </Label>
                <p className="text-sm text-slate-600 mb-2">{t('discountDescription')}</p>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="bg-white"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || guideRating === 0 || tourRating === 0 || bookingRating === 0 || !foundUsSource || (foundUsSource === 'other' && !foundUsOther.trim()) || !email.trim()}
                className="w-full btn-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('submit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
