'use client';

import { createContext, useContext } from 'react';
import { useFavorites } from '@/lib/hooks/use-favorites';

interface FavoritesContextType {
  favorites: ReturnType<typeof useFavorites>['favorites'];
  favoritesCount: ReturnType<typeof useFavorites>['favoritesCount'];
  loading: ReturnType<typeof useFavorites>['loading'];
  addFavorite: ReturnType<typeof useFavorites>['addFavorite'];
  removeFavorite: ReturnType<typeof useFavorites>['removeFavorite'];
  isFavorite: ReturnType<typeof useFavorites>['isFavorite'];
  refetch: ReturnType<typeof useFavorites>['refetch'];
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const favorites = useFavorites();

  return (
    <FavoritesContext.Provider value={favorites}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}

