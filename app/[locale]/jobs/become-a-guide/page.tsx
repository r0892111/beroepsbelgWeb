'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CheckCircle, Users, MapPin, Heart, Sparkles, Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

const jobApplicationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  city: z.string(),
  motivation: z.string().min(50),
  consent: z.boolean().refine((val) => val === true),
});

type JobApplicationData = z.infer<typeof jobApplicationSchema>;

const STORAGE_BUCKET = 'job-applications';
const MAX_CV_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export default function BecomeAGuidePage() {
  const t = useTranslations('jobs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cvPreview, setCvPreview] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<JobApplicationData>({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: {
      consent: false,
    },
  });

  const consent = watch('consent');

  const handleCvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file for your CV');
      return;
    }

    if (file.size > MAX_CV_SIZE) {
      toast.error('CV file size must be less than 10MB');
      return;
    }

    setCvFile(file);
    setCvPreview(file.name);
  };

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file for your photo');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      toast.error('Photo file size must be less than 5MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeCvFile = () => {
    setCvFile(null);
    setCvPreview(null);
  };

  const removePhotoFile = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadFile = async (file: File, fileName: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${fileName}_${Date.now()}.${fileExt}`;
      const filePath = `${uniqueFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Failed to upload file:', err);
      throw err;
    }
  };

  const onSubmit = async (data: JobApplicationData) => {
    setIsSubmitting(true);

    try {
      let cvUrl: string | null = null;
      let photoUrl: string | null = null;

      // Upload CV if provided
      if (cvFile) {
        try {
          cvUrl = await uploadFile(cvFile, `cv_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`);
        } catch (err: any) {
          toast.error('Failed to upload CV. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Upload photo if provided
      if (photoFile) {
        try {
          photoUrl = await uploadFile(photoFile, `photo_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`);
        } catch (err: any) {
          toast.error('Failed to upload photo. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('job_applications')
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          city: data.city || null,
          motivation: data.motivation,
          cv_url: cvUrl,
          photo_url: photoUrl,
          consent: data.consent,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Failed to submit application. Please try again.');
        setIsSubmitting(false);
        return;
      }

      toast.success(t('successMessage'));
      reset();
      setCvFile(null);
      setPhotoFile(null);
      setCvPreview(null);
      setPhotoPreview(null);
    } catch (err: any) {
      console.error('Failed to submit application:', err);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Hero Section */}
      <div className="bg-[#1BDD95] py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-oswald text-5xl md:text-7xl text-white uppercase tracking-tight mb-4">
            {t('becomeGuide')}
          </h1>
          <p className="font-inter text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            {t('joinTeam')}
          </p>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Benefits & Info */}
          <div className="space-y-8">
            {/* Introduction */}
            <div>
              <h2 className="font-oswald text-3xl font-bold text-neutral-900 mb-4">
                {t('whyJoinUs')}
              </h2>
              <p className="font-inter text-base text-neutral-700 leading-relaxed mb-4">
                {t('introduction1')}
              </p>
              <p className="font-inter text-base text-neutral-700 leading-relaxed">
                {t('introduction2')}
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald font-bold text-lg text-neutral-900 mb-1">{t('sharePassion.title')}</h3>
                  <p className="font-inter text-neutral-600">
                    {t('sharePassion.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald font-bold text-lg text-neutral-900 mb-1">{t('dynamicTeam.title')}</h3>
                  <p className="font-inter text-neutral-600">
                    {t('dynamicTeam.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald font-bold text-lg text-neutral-900 mb-1">{t('flexibleLocations.title')}</h3>
                  <p className="font-inter text-neutral-600">
                    {t('flexibleLocations.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-oswald font-bold text-lg text-neutral-900 mb-1">{t('unforgettableMoments.title')}</h3>
                  <p className="font-inter text-neutral-600">
                    {t('unforgettableMoments.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Application Form */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl">
            <h2 className="font-oswald text-2xl font-bold text-neutral-900 mb-6 uppercase tracking-tight">
              {t('applyNow')}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="name"
                  className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                >
                  {t('nameLabel')}*
                </label>
                <Input
                  id="name"
                  {...register('name')}
                  className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors"
                />
                {errors.name && <p className="mt-2 text-sm text-red-600">{t('required')}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                >
                  {t('emailLabel')}*
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors"
                />
                {errors.email && <p className="mt-2 text-sm text-red-600">{t('invalidEmail')}</p>}
              </div>

              {/* Phone Field */}
              <div>
                <label
                  htmlFor="phone"
                  className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                >
                  {t('phoneLabel')}*
                </label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors"
                />
                {errors.phone && <p className="mt-2 text-sm text-red-600">{t('required')}</p>}
              </div>

              {/* City Field */}
              <div>
                <label
                  htmlFor="city"
                  className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                >
                  {t('cityLabel')}*
                </label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder={t('cityPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors"
                />
                {errors.city && <p className="mt-2 text-sm text-red-600">{t('required')}</p>}
              </div>

              {/* Motivation Field */}
              <div>
                <label
                  htmlFor="motivation"
                  className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                >
                  {t('motivationLabel')}*
                </label>
                <Textarea
                  id="motivation"
                  rows={6}
                  {...register('motivation')}
                  className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors min-h-[150px] resize-none"
                />
                {errors.motivation && (
                  <p className="mt-2 text-sm text-red-600">{t('minimumCharacters')}</p>
                )}
              </div>

              {/* CV Upload Field */}
              <div>
                <label
                  htmlFor="cv"
                  className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                >
                  {t('cvLabel') || 'CV (PDF)'}
                </label>
                {!cvFile ? (
                  <div className="relative">
                    <Input
                      id="cv"
                      type="file"
                      accept="application/pdf"
                      onChange={handleCvFileSelect}
                      className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1BDD95] file:text-white hover:file:bg-[#14BE82]"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border-2 border-[#1BDD95] rounded-lg bg-green-50">
                    <FileText className="h-5 w-5 text-[#1BDD95]" />
                    <span className="flex-1 font-inter text-sm text-neutral-700 truncate">{cvPreview}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeCvFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="mt-1 text-xs text-neutral-500 font-inter">Maximum file size: 10MB</p>
              </div>

              {/* Photo Upload Field */}
              <div>
                <label
                  htmlFor="photo"
                  className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                >
                  {t('photoLabel') || 'Photo'}
                </label>
                {!photoFile ? (
                  <div className="relative">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileSelect}
                      className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1BDD95] file:text-white hover:file:bg-[#14BE82]"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-[#1BDD95]">
                      {photoPreview && (
                        <Image
                          src={photoPreview}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removePhotoFile}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Photo
                    </Button>
                  </div>
                )}
                <p className="mt-1 text-xs text-neutral-500 font-inter">Maximum file size: 5MB</p>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setValue('consent', checked as boolean)}
                  className="mt-1 data-[state=checked]:bg-[#1BDD95] data-[state=checked]:border-[#1BDD95]"
                />
                <label htmlFor="consent" className="font-inter text-sm text-neutral-700 cursor-pointer">
                  {t('consentText')}
                </label>
              </div>
              {errors.consent && <p className="text-sm text-red-600">{t('required')}</p>}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1BDD95] hover:bg-[#14BE82] text-white font-oswald font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
              >
                {isSubmitting ? t('submitting') : t('submitApplication')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
