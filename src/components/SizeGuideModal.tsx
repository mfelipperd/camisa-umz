import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler, BookOpen, Check } from 'lucide-react';
import { SizeTable, OVERSIZED_DATA, NORMAL_DATA, BABYLOOK_DATA } from './SizeGuide';

interface SizeGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'tabelas' | 'tecido';

export function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('tabelas');

    if (!isOpen) return null;

    return (
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
                className="relative bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 md:p-8 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl">
                            <Ruler className="text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Guia de Experiência UMZ</h2>
                            <p className="text-zinc-500 text-xs font-medium">Encontre seu caimento perfeito</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-4 md:px-8 bg-zinc-900/30 border-b border-zinc-800 overflow-x-auto no-scrollbar">
                    {(['tabelas', 'tecido'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative border-b-2 flex items-center gap-2 whitespace-nowrap ${
                                activeTab === tab 
                                ? 'text-primary border-primary' 
                                : 'text-zinc-500 border-transparent hover:text-zinc-300'
                            }`}
                        >
                            {tab === 'tabelas' && <Ruler size={14} />}
                            {tab === 'tecido' && <BookOpen size={14} />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">

                        {activeTab === 'tabelas' && (
                            <motion.div
                                key="tables"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-10"
                            >
                                <SizeTable title="Street Oversized (Unissex)" rows={OVERSIZED_DATA} showSleeve={true} />
                                <SizeTable title="Camisa Standard (Masculina)" rows={NORMAL_DATA} showSleeve={false} />
                                <SizeTable title="Babylook (Feminina)" rows={BABYLOOK_DATA} showSleeve={false} />
                            </motion.div>
                        )}

                        {activeTab === 'tecido' && (
                            <motion.div
                                key="fabric"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-8"
                            >
                                <div className="relative h-48 rounded-[2rem] overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-zinc-950 z-10" />
                                    <img 
                                        src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800" 
                                        alt="Tecido de Algodão"
                                        className="w-full h-full object-cover grayscale opacity-40 group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
                                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Algodão 30.1<br/><span className="text-primary italic">Penteado</span></h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { title: 'Toque Macio', desc: 'Processo que remove impurezas, deixando apenas as fibras mais nobres.' },
                                        { title: 'Zero Bolinhas', desc: 'Menor propensão ao pilling (bolinhas) mesmo após várias lavagens.' },
                                        { title: 'Alta Durabilidade', desc: 'Fios mais resistentes que garantem que sua UMZ dure por anos.' },
                                        { title: 'Conforto Térmico', desc: 'Fibras naturais que permitem a pele respirar, ideal para o clima tropical.' }
                                    ].map((item, i) => (
                                        <div key={i} className="p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <Check size={12} className="text-primary" />
                                                </div>
                                                <h4 className="text-white font-bold text-sm uppercase tracking-tight">{item.title}</h4>
                                            </div>
                                            <p className="text-zinc-500 text-xs leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 italic">
                                    <p className="text-zinc-400 text-xs leading-relaxed">
                                        "O termo <span className="text-primary font-bold">30.1</span> refere-se à espessura do fio. Quanto maior o número, mais fino e uniforme é o fio, resultando em uma malha mais leve, resistente e de caimento suave."
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">UMZ Apparel — Designed for Umarizal</p>
                </div>
            </motion.div>
        </div>
    );
}
