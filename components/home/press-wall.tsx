import { pressLinks } from '@/lib/data';
import { ExternalLink } from 'lucide-react';

export function PressWall() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">In de pers</h2>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {pressLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex h-16 items-center justify-center text-center">
                <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {link.name}
                </span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
