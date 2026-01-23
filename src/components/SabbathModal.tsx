import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

interface SabbathModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SabbathModal({ isOpen, onClose }: SabbathModalProps) {
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
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <Moon className="w-10 h-10 text-indigo-400 absolute" />
                            <Sun className="w-4 h-4 text-amber-400 absolute top-4 right-4 animate-pulse" />
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
                            Shh... Estamos em Descanso! 🛑
                        </h2>
                        
                        <div className="space-y-4 text-zinc-300 text-sm md:text-base leading-relaxed">
                            <p>
                                <strong className="text-indigo-400">Olá! Hoje é Sábado.</strong>
                            </p>
                            <p>
                                Este é um site adventista e, do pôr do sol de sexta até o pôr do sol de sábado, nós pausamos nossas atividades comerciais para nos conectar com o que realmente importa: Deus, família e descanso. 👐
                            </p>
                            <p className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 text-zinc-400 text-xs md:text-sm italic">
                                "Lembra-te do dia de sábado, para o santificar." — Êxodo 20:8
                            </p>
                            <p>
                                Nossas vendas retornarão automaticamente <span className="text-white font-bold">após as 18:00 de sábado</span>.
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full mt-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 border border-zinc-700"
                        >
                            Entendido, bom descanso!
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
