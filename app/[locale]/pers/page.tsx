import { pressLinks } from '@/lib/data';
import { ExternalLink } from 'lucide-react';

export default function PersPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">In de Pers</h1>
      <div className="mx-auto max-w-4xl">
        <p className="mb-12 text-center text-lg text-muted-foreground">
          BeroepsBelg in de media
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {pressLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border border-border p-6 transition-all hover:border-primary hover:shadow-md"
            >
              <span className="text-lg font-medium text-foreground">
                {link.name}
              </span>
              <ExternalLink className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
