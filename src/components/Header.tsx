import { ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
    onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
    const { itemCount } = useCart();

    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
            <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-lg md:text-xl font-bold text-white tracking-tighter">UMZ</span>
                    <span className="hidden xs:inline-block text-xs md:text-sm text-zinc-400 font-medium">Umarizal</span>
                </div>

                <button
                    onClick={onCartClick}
                    className="relative p-2 text-zinc-400 hover:text-white transition-colors touch-manipulation"
                >
                    <ShoppingCart size={22} className="md:w-6 md:h-6" />
                    <AnimatePresence>
                        {itemCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute top-0 right-0 bg-primary text-white text-[10px] md:text-xs font-bold w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-zinc-950"
                            >
                                {itemCount}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </header>
    );
}
