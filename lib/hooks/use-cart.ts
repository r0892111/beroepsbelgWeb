import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CartItem } from '@/lib/supabase/types';
import { useAuth } from '@/lib/contexts/auth-context';

export function useCart() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
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

    console.log('Cart items fetched:', data);
    console.log('Cart error:', error);

    if (data && !error) {
      // Fetch product details for each cart item
      const productIds = data.map((item: any) => item.product_id).filter(Boolean);
      
      console.log('Cart items product IDs:', productIds);
      
      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('webshop_data')
          .select('uuid, "Name", "Category", "Price (EUR)", "Description", "Additional Info"')
          .in('uuid', productIds);

        console.log('Products fetched from webshop_data:', productsData);
        console.log('Products fetch error:', productsError);

        if (productsData && !productsError) {
          // Map products by UUID
          const productsMap = new Map(productsData.map((p: any) => [p.uuid, p]));
          
          // Attach product data to cart items
          const cartItemsWithProducts = data.map((item: any) => {
            const product = productsMap.get(item.product_id);
            console.log(`Mapping product for item ${item.id}:`, { product_id: item.product_id, product });
            
            if (product) {
              // Transform webshop_data format to match expected product format
              const priceStr = product['Price (EUR)']?.toString() || '0';
              const price = parseFloat(priceStr.replace(',', '.')) || 0;
              
              return {
                ...item,
                products: {
                  id: product.uuid,
                  uuid: product.uuid,
                  slug: product.Name ? product.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : product.uuid,
                  Name: product.Name || '',
                  title_nl: product.Name || '',
                  title_en: product.Name || '',
                  title_fr: product.Name || '',
                  title_de: product.Name || '',
                  price: price,
                  category: product.Category || 'Book',
                  Category: product.Category || 'Book',
                  description_nl: product.Description || '',
                  description_en: product.Description || '',
                  description_fr: product.Description || '',
                  description_de: product.Description || '',
                  Description: product.Description || '',
                  image: null,
                }
              };
            }
            
            // Return item without product if not found
            console.warn(`Product not found for product_id: ${item.product_id}`);
            return {
              ...item,
              products: null
            };
          });
          
          console.log('Cart items with products:', cartItemsWithProducts);
          setCartItems(cartItemsWithProducts);
        } else {
          console.error('Error fetching products:', productsError);
          // Set items without products
          setCartItems(data.map((item: any) => ({ ...item, products: null })));
        }
      } else {
        console.log('No product IDs found in cart items');
        setCartItems(data);
      }
    } else if (error) {
      console.error('Error fetching cart:', error);
      setCartItems([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCart();

    if (!user) return;

    const channel = supabase
      .channel(`cart-changes-${user.id}`)
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
  }, [user, fetchCart]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) return { error: new Error('Not authenticated') };

    const existingItem = cartItems.find((item) => item.product_id === productId);
    let tempId: string | null = null;

    // Optimistic update
    if (existingItem) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      tempId = `temp-${Date.now()}`;
      setCartItems((prev) => [
        {
          id: tempId as string,
          user_id: user.id,
          product_id: productId,
          quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    // Sync with database
    if (existingItem) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);

      if (error) {
        // Revert on error
        await fetchCart();
        return { error };
      }
    } else {
      const { error, data } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity })
        .select()
        .single();

      if (error) {
        // Revert on error
        await fetchCart();
        return { error };
      }

      // Replace temp item with real item
      if (data && tempId) {
        setCartItems((prev) =>
          prev.map((item) => (item.id === tempId ? data : item))
        );
      }
    }

    return { error: null };
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return { error: new Error('Not authenticated') };

    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    // Optimistic update
    setCartItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    );

    // Sync with database
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      // Revert on error
      await fetchCart();
      return { error };
    }

    return { error: null };
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Optimistic update
    const itemToRemove = cartItems.find((item) => item.product_id === productId);
    setCartItems((prev) => prev.filter((item) => item.product_id !== productId));

    // Sync with database
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      // Revert on error
      if (itemToRemove) {
        setCartItems((prev) => [...prev, itemToRemove]);
      }
      return { error };
    }

    return { error: null };
  };

  const clearCart = async () => {
    if (!user) return { error: new Error('Not authenticated') };

    // Optimistic update
    const previousItems = [...cartItems];
    setCartItems([]);

    // Sync with database
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      // Revert on error
      setCartItems(previousItems);
      return { error };
    }

    return { error: null };
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const cartCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  return {
    cartItems,
    cartCount,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartCount,
    refetch: fetchCart,
  };
}
