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
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

const signUpSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const t = useTranslations('auth');
  const tForms = useTranslations('forms');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await signUp(data.email, data.password, data.fullName);

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error(t('emailExists'));
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(t('signUpSuccess'));
        router.push(`/${locale}/account`);
      }
    } catch (error) {
      toast.error(t('emailExists'));
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
              <UserPlus className="h-8 w-8 text-[#0d1117]" />
            </div>
            <h1 className="mb-3 text-4xl font-bold text-[#0d1117]">{t('createAccount')}</h1>
            <p className="text-lg text-[#6b7280]">{t('signUpSubtitle')}</p>
          </div>

          <div className="space-y-6 rounded-2xl bg-white p-8 shadow-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="fullName" className="flex items-center gap-2 text-base font-semibold">
                  <User className="h-4 w-4 text-[#92F0B1]" />
                  {t('fullName')}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  {...register('fullName')}
                  className="mt-2"
                  placeholder="Jan Janssen"
                />
                {errors.fullName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
              </div>

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
                className="w-full bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]"
              >
                {t('signUp')}
              </Button>
            </form>

            <div className="text-center text-sm text-[#6b7280]">
              {t('alreadyHaveAccount')}{' '}
              <Link href={`/${locale}/auth/sign-in`} className="font-medium text-[#0d1117] hover:underline">
                {t('signInLink')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
