import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Ruler } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { SizeGuide } from './SizeGuide';

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    model: string;
    price: number;
}

const SIZES = ['P', 'M', 'G', 'GG', 'XG'];
const COLORS = [
    { id: 'preta', label: 'Preta', bg: 'bg-zinc-900', ring: 'ring-zinc-500' },
    { id: 'branca', label: 'Branca', bg: 'bg-white', ring: 'ring-white' },
    { id: 'marrom', label: 'Marrom', bg: 'bg-[#5D4037]', ring: 'ring-[#5D4037]' }
];

export function PurchaseModal({ isOpen, onClose, model, price }: PurchaseModalProps) {
    const { addItem, savedName } = useCart();
    const [name, setName] = useState(savedName);
    const [size, setSize] = useState<string | null>(null);
    const [color, setColor] = useState<string | null>(null);
    const [gender, setGender] = useState<'masculino' | 'feminino' | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSizeGuide, setShowSizeGuide] = useState(false);

    // Update name if savedName changes or modal opens
    useEffect(() => {
        if (isOpen && savedName && !name) {
            setName(savedName);
        }
    }, [isOpen, savedName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Add to cart
        addItem({
            name,
            model,
            size: size!,
            color: color!,
            gender: gender!,
            quantity,
            price
        });

        // Reset form (except name)
        setSize(null);
        setColor(null);
        setGender(null);
        setQuantity(1);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-zinc-900 border border-zinc-800 p-5 md:p-8 rounded-3xl w-full max-w-md shadow-2xl max-h-[95vh] overflow-y-auto"
                    >
                        <button 
                            onClick={onClose}
                            className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Garantir {model}</h2>
                        <p className="text-zinc-400 text-sm mb-6">Preencha seus dados para reservar.</p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Seu Nome Completo</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-zinc-600"
                                    placeholder="Ex: Felipe Silva"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Cor</label>
                                <div className="flex gap-3">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setColor(c.id)}
                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all touch-manipulation font-bold text-sm ${
                                                color === c.id 
                                                ? `border-primary ${c.bg} ${c.id === 'branca' ? 'text-zinc-900' : 'text-white'}` 
                                                : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                                            }`}
                                        >
                                            <span className={`w-6 h-6 rounded-full ${c.bg} border border-zinc-600`}></span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Gênero</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setGender('masculino')}
                                        className={`flex-1 flex items-center justify-center py-3 rounded-xl border-2 transition-all touch-manipulation font-bold text-sm ${
                                            gender === 'masculino' 
                                            ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' 
                                            : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                                        }`}
                                    >
                                        Masculino
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGender('feminino')}
                                        className={`flex-1 flex items-center justify-center py-3 rounded-xl border-2 transition-all touch-manipulation font-bold text-sm ${
                                            gender === 'feminino' 
                                            ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' 
                                            : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                                        }`}
                                    >
                                        Feminino
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <div className="flex items-center justify-between mb-2 ml-1">
                                        <label className="block text-xs font-bold text-zinc-500 uppercase">Tamanho</label>
                                        <button 
                                            type="button"
                                            onClick={() => setShowSizeGuide(!showSizeGuide)}
                                            className="flex items-center gap-1.5 text-[10px] font-black text-primary hover:text-orange-400 transition-colors uppercase tracking-wider"
                                        >
                                            <Ruler size={12} />
                                            Guia
                                        </button>
                                    </div>
                                    <div className="flex gap-2 flex-wrap sm:grid sm:grid-cols-3">
                                        {SIZES.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setSize(s)}
                                                className={`w-11 h-11 sm:w-full rounded-xl text-sm font-black transition-all touch-manipulation ${
                                                    size === s 
                                                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-zinc-900 shadow-lg shadow-primary/20' 
                                                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Quantidade</label>
                                    <div className="flex items-center justify-between bg-zinc-800 rounded-xl border border-zinc-700 p-1 w-full sm:w-fit">
                                        <button 
                                            type="button"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center text-white font-black text-lg">{quantity}</span>
                                        <button 
                                            type="button"
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting || !name.trim() || !gender || !size || !color}
                                className="w-full bg-primary hover:bg-orange-600 text-white font-black py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20"
                            >
                                {isSubmitting ? (
                                    <>Adicionando...</>
                                ) : (
                                    <>
                                        <ShoppingCart size={20} />
                                        Confirmar Peça
                                    </>
                                )}
                            </button>

                            <AnimatePresence>
                                {showSizeGuide && (
                                    <SizeGuide 
                                        model={model}
                                        gender={gender}
                                        onClose={() => setShowSizeGuide(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
