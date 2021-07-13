import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const savedCard = localStorage.getItem('@RocketShoes:cart');
    if (!savedCard) return [];

    const parsedCart = JSON.parse(savedCard);
    return parsedCart;
  });

  const setCartAndSave = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  };

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`stock/${productId}`);
      const productStock: Stock = stockResponse.data;

      const productInCart = cart.find((product) => product.id === productId);
      if (productInCart) {
        const hasAvailableStock = productStock.amount > productInCart.amount;
        if (!hasAvailableStock) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedCart = [...cart].map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product
        );

        return setCartAndSave(updatedCart);
      }

      const productResponse = await api.get(`products/${productId}`);
      const newCartProduct: Product = { ...productResponse.data, amount: 1 };

      const updatedCart = [...cart, newCartProduct];
      setCartAndSave(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);
      if (!productInCart) throw new Error();

      setCartAndSave(cart.filter((product) => product.id !== productId));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get(`stock/${productId}`);
      const productStock: Stock = stockResponse.data;

      const hasAvailableStock = productStock.amount >= amount;
      if (!hasAvailableStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productInCart = cart.find((product) => product.id === productId);
      if (productInCart) {
        const updatedCart = [...cart].map((product) =>
          product.id === productId ? { ...product, amount } : product
        );

        return setCartAndSave(updatedCart);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
