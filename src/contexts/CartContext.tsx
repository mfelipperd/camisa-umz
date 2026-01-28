import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const CART_STORAGE_KEY = 'umz_cart';
const CUSTOMER_NAME_KEY = 'umz_customer_name';

export interface CartItem {
    id: string;
    name: string;
    model: string;
    size: string;
    color: string;
    gender: 'masculino' | 'feminino';
    phone: string;
    quantity: number;
    price: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'id'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    total: number;
    itemCount: number;
    savedName: string;
    setSavedName: (name: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Load cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validation: filter out items without gender (legacy data)
            if (Array.isArray(parsed)) {
                return parsed.filter(item => item.gender === 'masculino' || item.gender === 'feminino');
            }
        }
    } catch (error) {
        console.error('Error loading cart from localStorage:', error);
    }
    return [];
};

// Load saved customer name from localStorage
const loadNameFromStorage = (): string => {
    try {
        return localStorage.getItem(CUSTOMER_NAME_KEY) || '';
    } catch (error) {
        console.error('Error loading name from localStorage:', error);
        return '';
    }
};

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
    const [savedName, setSavedNameState] = useState<string>(() => loadNameFromStorage());

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }, [items]);

    const setSavedName = (name: string) => {
        setSavedNameState(name);
        try {
            localStorage.setItem(CUSTOMER_NAME_KEY, name);
        } catch (error) {
            console.error('Error saving name to localStorage:', error);
        }
    };

    const addItem = (item: Omit<CartItem, 'id'>) => {
        // Save the customer name
        if (item.name && item.name.trim()) {
            setSavedName(item.name);
        }

        // Check if same item (model + size + color) already exists
        const existingIndex = items.findIndex(
            i => i.model === item.model && i.size === item.size && i.color === item.color && i.gender === item.gender && i.name === item.name
        );

        if (existingIndex >= 0) {
            // Update quantity of existing item
            const updated = [...items];
            updated[existingIndex].quantity += item.quantity;
            setItems(updated);
        } else {
            // Add new item
            const newItem: CartItem = {
                ...item,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            setItems([...items, newItem]);
        }
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id);
            return;
        }
        setItems(items.map(i => i.id === id ? { ...i, quantity } : i));
    };

    const clearCart = () => {
        setItems([]);
    };

    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ 
            items, 
            addItem, 
            removeItem, 
            updateQuantity, 
            clearCart, 
            total, 
            itemCount,
            savedName,
            setSavedName
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
