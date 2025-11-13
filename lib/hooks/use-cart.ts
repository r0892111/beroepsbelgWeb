import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CartItem } from '@/lib/supabase/types';
import { useAuth } from '@/lib/contexts/auth-context';

export function useCart() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setCartItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();

    if (!user) return;

    const channel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCart();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) return { error: new Error('Not authenticated') };

    const existingItem = cartItems.find((item) => item.product_id === productId);

    if (existingItem) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);

      if (!error) {
        await fetchCart();
      }
      return { error };
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity });

      if (!error) {
        await fetchCart();
      }
      return { error };
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return { error: new Error('Not authenticated') };

    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (!error) {
      await fetchCart();
    }
    return { error };
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (!error) {
      await fetchCart();
    }
    return { error };
  };

  const clearCart = async () => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      await fetchCart();
    }
    return { error };
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartCount,
    refetch: fetchCart,
  };
}
