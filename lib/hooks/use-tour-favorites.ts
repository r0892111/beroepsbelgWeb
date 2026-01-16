import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { TourFavorite } from '@/lib/supabase/types';
import { useAuth } from '@/lib/contexts/auth-context';

export function useTourFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<TourFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTourFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tour_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setFavorites(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTourFavorites();

    if (!user) return;

    const channel = supabase
      .channel(`tour-favorites-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tour_favorites',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTourFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTourFavorites]);

  const addTourFavorite = async (tourId: string | number) => {
    if (!user) return { error: new Error('Not authenticated') };

    const tourIdStr = String(tourId);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setFavorites((prev) => [
      {
        id: tempId,
        user_id: user.id,
        tour_id: tourIdStr,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    // Sync with database
    const { error, data } = await supabase
      .from('tour_favorites')
      .insert({ user_id: user.id, tour_id: tourIdStr })
      .select()
      .single();

    if (error) {
      // Revert on error
      await fetchTourFavorites();
      return { error };
    }

    // Replace temp item with real item
    if (data) {
      setFavorites((prev) =>
        prev.map((item) => (item.id === tempId ? data : item))
      );
    }

    return { error: null };
  };

  const removeTourFavorite = async (tourId: string | number) => {
    if (!user) return { error: new Error('Not authenticated') };

    const tourIdStr = String(tourId);

    // Optimistic update
    const itemToRemove = favorites.find((item) => String(item.tour_id) === tourIdStr);
    setFavorites((prev) => prev.filter((item) => String(item.tour_id) !== tourIdStr));

    // Sync with database
    const { error } = await supabase
      .from('tour_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('tour_id', tourIdStr);

    if (error) {
      // Revert on error
      if (itemToRemove) {
        setFavorites((prev) => [...prev, itemToRemove]);
      }
      return { error };
    }

    return { error: null };
  };

  const isTourFavorite = (tourId: string | number) => {
    return favorites.some((fav) => String(fav.tour_id) === String(tourId));
  };

  const tourFavoritesCount = useMemo(() => favorites.length, [favorites]);

  return {
    favorites,
    tourFavoritesCount,
    loading,
    addTourFavorite,
    removeTourFavorite,
    isTourFavorite,
    refetch: fetchTourFavorites,
  };
}
