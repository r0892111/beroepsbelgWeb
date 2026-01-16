'use client';

import { Heart } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTourFavoritesContext } from '@/lib/contexts/tour-favorites-context';
import { cn } from '@/lib/utils';

interface TourFavoriteButtonProps {
  tourId: string | number;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function TourFavoriteButton({ tourId, className, size = 'icon' }: TourFavoriteButtonProps) {
  const { user } = useAuth();
  const { isTourFavorite, addTourFavorite, removeTourFavorite, loading } = useTourFavoritesContext();
  const router = useRouter();
  const pathname = usePathname();

  const isFavorited = isTourFavorite(tourId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to sign-in with current path as redirect
      const locale = pathname.split('/')[1] || 'nl';
      router.push(`/${locale}/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isFavorited) {
      await removeTourFavorite(tourId);
    } else {
      await addTourFavorite(tourId);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'rounded-full bg-white/90 hover:bg-white shadow-md transition-all',
        className
      )}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn(
          'h-5 w-5 transition-colors',
          isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
        )}
      />
    </Button>
  );
}
