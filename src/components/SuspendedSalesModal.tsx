import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, XCircle, MessageCircle } from 'lucide-react';

interface SuspendedSalesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SuspendedSalesModal({ isOpen, onClose }: SuspendedSalesModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-zinc-900 border border-zinc-800 p-6 md:p-10 rounded-3xl w-full max-w-lg shadow-2xl text-center"
                    >
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <ShoppingBag className="w-10 h-10 text-red-400 absolute opacity-20" />
                            <XCircle className="w-8 h-8 text-red-500 absolute" />
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
                            Vendas Suspensas no Site! 🛑
                        </h2>
                        
                        <div className="space-y-4 text-zinc-300 text-sm md:text-base leading-relaxed">
                            <p className="font-bold text-red-400">
                                O canal de venda das Camisas OFICIAIS do Umarizal não é mais o site.
                            </p>
                            <p>
                                Para garantir as camisas oficiais da coleção 2026, por favor, entre em contato diretamente com a organização ou procure os pontos de venda físicos autorizados.
                            </p>
                            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 text-zinc-400 text-xs md:text-sm">
                                <p className="flex items-center justify-center gap-2 mb-2">
                                    <MessageCircle size={16} className="text-primary" />
                                    <span>As vendas agora são realizadas offline</span>
                                </p>
                                <p className="italic">
                                    "Agradecemos o interesse pela nossa comunidade!"
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full mt-8 py-4 bg-primary hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 border border-primary/20"
                        >
                            Entendido
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
