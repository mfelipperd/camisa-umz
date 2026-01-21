import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface CartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckout: () => void;
    isProcessing?: boolean;
}

export function CartModal({ isOpen, onClose, onCheckout, isProcessing = false }: CartModalProps) {
    const { items, removeItem, updateQuantity, total, itemCount } = useCart();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isProcessing ? onClose : undefined}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-zinc-900 border border-zinc-800 p-5 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        {!isProcessing && (
                            <button 
                                onClick={onClose}
                                className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2"
                            >
                                <X size={20} />
                            </button>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <ShoppingBag className="text-primary" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">Seu Carrinho</h2>
                                <p className="text-zinc-500 text-sm font-medium">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</p>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                                    <ShoppingBag className="text-zinc-700" size={40} />
                                </div>
                                <p className="text-zinc-400 font-bold">Seu carrinho está vazio</p>
                                <p className="text-zinc-500 text-sm mt-1">Navegue pelos modelos e escolha o seu!</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                                    {items.map(item => (
                                        <div 
                                            key={item.id}
                                            className="bg-zinc-800/30 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 transition-colors hover:bg-zinc-800/50"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold truncate">{item.model}</p>
                                                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">
                                                    {item.gender} • {item.color} • {item.size} • {item.name.split(' ')[0]}
                                                </p>
                                                <p className="text-primary font-black text-lg">
                                                    R$ {(item.price * item.quantity).toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="flex flex-col items-end gap-3">
                                                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors touch-manipulation"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-6 text-center text-white text-sm font-black">
                                                        {item.quantity}
                                                    </span>
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors touch-manipulation"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors touch-manipulation"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-zinc-800 pt-6 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-zinc-500 font-bold uppercase">Subtotal</span>
                                            <span className="text-3xl font-black text-white tracking-tight">
                                                R$ {total.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase">Pagamento via</p>
                                            <p className="text-xs text-zinc-400 font-bold">Mercado Pago</p>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={onCheckout}
                                        disabled={isProcessing}
                                        className="w-full bg-primary hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isProcessing ? 'Processando...' : 'Pagar Agora'}
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
