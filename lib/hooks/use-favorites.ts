import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Favorite } from '@/lib/supabase/types';
import { useAuth } from '@/lib/contexts/auth-context';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
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
  };

  useEffect(() => {
    fetchFavorites();

    if (!user) return;

    const channel = supabase
      .channel('favorites-changes')
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
  }, [user]);

  const addFavorite = async (productId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, product_id: productId });

    if (!error) {
      await fetchFavorites();
    }
    return { error };
  };

  const removeFavorite = async (productId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (!error) {
      await fetchFavorites();
    }
    return { error };
  };

  const isFavorite = (productId: string) => {
    return favorites.some((fav) => fav.product_id === productId);
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
