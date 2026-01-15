'use client';

import { createContext, useContext } from 'react';
import { useTourFavorites } from '@/lib/hooks/use-tour-favorites';

interface TourFavoritesContextType {
  favorites: ReturnType<typeof useTourFavorites>['favorites'];
  tourFavoritesCount: ReturnType<typeof useTourFavorites>['tourFavoritesCount'];
  loading: ReturnType<typeof useTourFavorites>['loading'];
  addTourFavorite: ReturnType<typeof useTourFavorites>['addTourFavorite'];
  removeTourFavorite: ReturnType<typeof useTourFavorites>['removeTourFavorite'];
  isTourFavorite: ReturnType<typeof useTourFavorites>['isTourFavorite'];
  refetch: ReturnType<typeof useTourFavorites>['refetch'];
}

const TourFavoritesContext = createContext<TourFavoritesContextType | undefined>(undefined);

export function TourFavoritesProvider({ children }: { children: React.ReactNode }) {
  const tourFavorites = useTourFavorites();

  return (
    <TourFavoritesContext.Provider value={tourFavorites}>
      {children}
    </TourFavoritesContext.Provider>
  );
}

export function useTourFavoritesContext() {
  const context = useContext(TourFavoritesContext);
  if (context === undefined) {
    throw new Error('useTourFavoritesContext must be used within a TourFavoritesProvider');
  }
  return context;
}
