import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users } from 'lucide-react';

export default function LezingPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Lezing: De Boerentoren</h1>

        <div className="mb-12 grid gap-6 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Datum</p>
              <p className="font-semibold">Op aanvraag</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Locatie</p>
              <p className="font-semibold">Antwerpen</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Groepsgrootte</p>
              <p className="font-semibold">10-50 personen</p>
            </div>
          </div>
        </div>

        <div className="prose prose-lg mb-12 max-w-none">
          <p className="text-lg leading-relaxed text-muted-foreground">
            De Boerentoren, ook bekend als de KBC-toren, is een iconisch gebouw in het Antwerpse stadsbeeld.
            Deze lezing neemt u mee door de fascinerende geschiedenis van wat ooit het hoogste gebouw van
            Europa was.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Van de ambitieuze bouwplannen in de jaren '20 tot de moderne transformatie, u ontdekt de
            architecturale hoogtepunten, de verhalen van de mensen die er werkten, en de rol die het
            gebouw speelde in de ontwikkeling van Antwerpen als moderne metropool.
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg">Boek deze lezing</Button>
          <Button size="lg" variant="outline">
            Meer informatie
          </Button>
        </div>
      </div>
    </div>
  );
}
