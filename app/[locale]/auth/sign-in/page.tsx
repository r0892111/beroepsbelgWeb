'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const t = useTranslations('auth');
  const tForms = useTranslations('forms');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        toast.error(t('invalidCredentials'));
      } else {
        toast.success(t('signInSuccess'));
        // Check for redirect parameter in URL
        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect');
        // Redirect to the specified URL or default to account page
        router.push(redirect || `/${locale}/account`);
      }
    } catch (error) {
      toast.error(t('invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#92F0B1]/20">
              <LogIn className="h-8 w-8 text-[#0d1117]" />
            </div>
            <h1 className="mb-3 text-4xl font-bold text-[#0d1117]">{t('welcome')}</h1>
            <p className="text-lg text-[#6b7280]">{t('signInSubtitle')}</p>
          </div>

          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="email" className="flex items-center gap-2 text-base font-semibold">
                  <Mail className="h-4 w-4 text-[#92F0B1]" />
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="mt-2"
                  placeholder="naam@voorbeeld.be"
                />
                {errors.email && <p className="mt-1 text-sm text-destructive">{tForms('invalidEmail')}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center gap-2 text-base font-semibold">
                  <Lock className="h-4 w-4 text-[#92F0B1]" />
                  {t('password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="mt-2"
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-sm text-destructive">{t('weakPassword')}</p>}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0d1117] hover:bg-[#0d1117]/90"
              >
                {t('signIn')}
              </Button>
            </form>

            <div className="text-center text-sm text-[#6b7280]">
              {t('noAccount')}{' '}
              <Link href={`/${locale}/auth/sign-up`} className="font-medium text-[#0d1117] hover:underline">
                {t('signUpLink')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
