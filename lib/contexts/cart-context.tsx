'use client';

import { createContext, useContext } from 'react';
import { useCart } from '@/lib/hooks/use-cart';

interface CartContextType {
  cartItems: ReturnType<typeof useCart>['cartItems'];
  cartCount: ReturnType<typeof useCart>['cartCount'];
  loading: ReturnType<typeof useCart>['loading'];
  addToCart: ReturnType<typeof useCart>['addToCart'];
  updateQuantity: ReturnType<typeof useCart>['updateQuantity'];
  removeFromCart: ReturnType<typeof useCart>['removeFromCart'];
  clearCart: ReturnType<typeof useCart>['clearCart'];
  getCartCount: ReturnType<typeof useCart>['getCartCount'];
  refetch: ReturnType<typeof useCart>['refetch'];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCart();

  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
}

