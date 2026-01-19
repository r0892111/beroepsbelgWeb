'use client';

import Link from 'next/link';
import { CheckCircle2, Mic2, Calendar, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export default function LecturePaymentSuccessPage() {
  const t = useTranslations('lecturePaymentSuccess');
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Hero Section */}
      <div className="relative w-full h-[280px] md:h-[360px]">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #1BDD95 0%, #17C683 50%, #14A86E 100%)' }}
          />

          {/* Decorative pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Success badge at bottom edge of hero */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-4 translate-y-1/2 z-20">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(27, 221, 149, 0.9)', boxShadow: '0 0 30px rgba(27, 221, 149, 0.5)' }}
          >
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <div className="bg-white rounded-xl px-8 py-6 shadow-lg">
            <h1
              className="text-3xl md:text-4xl font-bold text-center text-black"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {t('title')}
            </h1>
            <p className="mt-2 text-lg text-neutral-700 text-center max-w-md">
              {t('description')}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-32 md:mt-40 relative z-10 pb-16">
        {/* Main Content Card */}
        <Card
          className="max-w-xl mx-auto overflow-hidden"
          style={{ boxShadow: 'var(--shadow-large)' }}
        >
          <CardContent className="p-0">
            {/* Lecture Icon Banner */}
            <div
              className="px-6 py-6 flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)' }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(27, 221, 149, 0.15)' }}
              >
                <Mic2 className="h-8 w-8" style={{ color: 'var(--primary-base)' }} />
              </div>
            </div>

            {/* Confirmation Details */}
            <div className="px-6 py-6 space-y-4">
              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Status</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--primary-base)' }}>Confirmed</p>
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Email</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Sent</p>
                </div>
              </div>

              {/* What's next section */}
              <div
                className="rounded-lg p-4 mt-4"
                style={{ backgroundColor: 'rgba(27, 221, 149, 0.1)', border: '1px solid rgba(27, 221, 149, 0.2)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  <strong style={{ color: 'var(--primary-dark)' }}>{t('whatsNext')}</strong>
                  <br />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('nextSteps')}</span>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div
              className="px-6 py-5 flex gap-3"
              style={{ backgroundColor: 'var(--bg-light)', borderTop: '1px solid var(--border-light)' }}
            >
              <Button
                asChild
                className="flex-1"
                style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}
              >
                <Link href={`/${locale}`}>{t('returnHome')}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1"
                style={{ borderColor: 'var(--primary-base)', color: 'var(--primary-base)' }}
              >
                <Link href={`/${locale}/lezing`}>{t('viewLecture')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
