import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Favorite } from '@/lib/supabase/types';
import { useAuth } from '@/lib/contexts/auth-context';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setFavorites(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();

    if (!user) return;

    const channel = supabase
      .channel(`favorites-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFavorites]);

  const addFavorite = async (productId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setFavorites((prev) => [
      {
        id: tempId,
        user_id: user.id,
        product_id: productId,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    // Sync with database
    const { error, data } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, product_id: productId })
      .select()
      .single();

    if (error) {
      // Revert on error
      await fetchFavorites();
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

  const removeFavorite = async (productId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Optimistic update
    const itemToRemove = favorites.find((item) => item.product_id === productId);
    setFavorites((prev) => prev.filter((item) => item.product_id !== productId));

    // Sync with database
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      // Revert on error
      if (itemToRemove) {
        setFavorites((prev) => [...prev, itemToRemove]);
      }
      return { error };
    }

    return { error: null };
  };

  const isFavorite = (productId: string) => {
    return favorites.some((fav) => fav.product_id === productId);
  };

  const favoritesCount = useMemo(() => favorites.length, [favorites]);

  return {
    favorites,
    favoritesCount,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
