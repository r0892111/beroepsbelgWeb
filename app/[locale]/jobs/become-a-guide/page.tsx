'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const jobApplicationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  city: z.string(),
  motivation: z.string().min(50),
  consent: z.boolean().refine((val) => val === true),
});

type JobApplicationData = z.infer<typeof jobApplicationSchema>;

export default function BecomeAGuidePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (data: JobApplicationData) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Job application:', data);
    toast.success('Sollicitatie verzonden!');
    reset();
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-bold">Word een BeroepsBelg gids</h1>

        <div className="prose prose-lg mb-12">
          <p className="text-lg leading-relaxed text-muted-foreground">
            Ben je gepassioneerd door geschiedenis, architectuur en het vertellen van verhalen? Wil je deel
            uitmaken van een dynamisch team dat België op een unieke manier in de schijnwerpers zet?
          </p>
          <p className="leading-relaxed text-muted-foreground">
            We zijn altijd op zoek naar enthousiaste gidsen die onze missie delen om bezoekers en locals een
            verrijkende ervaring te bieden. Als BeroepsBelg gids krijg je de kans om je kennis te delen,
            nieuwe mensen te ontmoeten en bij te dragen aan onvergetelijke momenten.
          </p>
        </div>

        <h2 className="mb-6 text-2xl font-bold">Solliciteer nu</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Naam*</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="mt-1 text-sm text-destructive">Dit veld is verplicht</p>}
          </div>
          <div>
            <Label htmlFor="email">E-mail*</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">Ongeldig e-mailadres</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Telefoon*</Label>
            <Input id="phone" type="tel" {...register('phone')} />
            {errors.phone && <p className="mt-1 text-sm text-destructive">Dit veld is verplicht</p>}
          </div>
          <div>
            <Label htmlFor="city">In welke stad(en) wil je rondleidingen geven?*</Label>
            <Input id="city" {...register('city')} placeholder="bijv. Antwerpen, Brussel" />
            {errors.city && <p className="mt-1 text-sm text-destructive">Dit veld is verplicht</p>}
          </div>
          <div>
            <Label htmlFor="motivation">Waarom wil je BeroepsBelg gids worden?*</Label>
            <Textarea id="motivation" rows={6} {...register('motivation')} />
            {errors.motivation && (
              <p className="mt-1 text-sm text-destructive">Minimaal 50 karakters vereist</p>
            )}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(checked) => setValue('consent', checked as boolean)}
              className="mt-0.5"
            />
            <Label htmlFor="consent" className="text-sm">
              Ik ga akkoord met de privacy policy en de verwerking van mijn gegevens
            </Label>
          </div>
          {errors.consent && <p className="text-sm text-destructive">Dit veld is verplicht</p>}
          <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
            Verstuur sollicitatie
          </Button>
        </form>
      </div>
    </div>
  );
}
