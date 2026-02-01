import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

interface Variation {
    id: string;
    images: string[];
}

interface ShirtCardProps {
    title: string;
    variations: Variation[];
    description: string;
    price: number;
    onBuy: () => void;
    isSuspended?: boolean;
}

export function ShirtCard({ title, variations = [], description, price, onBuy, isSuspended }: ShirtCardProps) {
    const [selectedColor, setSelectedColor] = useState(variations[0]?.id || '');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    const currentVariation = variations.find(v => v.id === selectedColor) || variations[0];
    const images = currentVariation?.images || [];
    const currentImage = images[currentImageIndex] || '';

    // Auto-rotation logic
    useEffect(() => {
        if (!isAutoPlaying || images.length <= 1 || isHovering) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [images.length, isAutoPlaying, isHovering]);
    const handleNext = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAutoPlaying(false);
        if (isSuspended) return;
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, [images.length, isSuspended]);

    const handlePrev = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAutoPlaying(false);
        if (isSuspended) return;
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }, [images.length, isSuspended]);

    const handleColorChange = (colorId: string) => {
        if (isSuspended) return;
        setSelectedColor(colorId);
        setCurrentImageIndex(0);
        setIsAutoPlaying(true);
    };

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={isSuspended ? onBuy : undefined}
            className={`bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-800/50 flex flex-col h-full group/card relative ${isSuspended ? 'cursor-pointer' : ''}`}
        >
            <div className="relative h-[24rem] overflow-hidden group">
                {isSuspended && (
                    <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-zinc-900/90 border border-white/10 px-6 py-3 rounded-2xl shadow-2xl transform -rotate-12">
                            <span className="text-red-500 font-black uppercase tracking-[0.2em] text-sm">Vendas Offline</span>
                        </div>
                    </div>
                )}
                <AnimatePresence mode="wait">
                    <motion.img 
                        key={`${selectedColor}-${currentImageIndex}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        src={currentImage} 
                        alt={`${title} - ${selectedColor} - View ${currentImageIndex + 1}`} 
                        className="w-full h-full object-cover"
                    />
                </AnimatePresence>
                
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-80" />
                
                {/* Navigation Arrows */}
                <AnimatePresence>
                    {(isHovering && images.length > 1) && (
                        <>
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onClick={handlePrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all z-20"
                            >
                                <ChevronLeft size={24} />
                            </motion.button>
                            <motion.button
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all z-20"
                            >
                                <ChevronRight size={24} />
                            </motion.button>
                        </>
                    )}
                </AnimatePresence>

                {/* View Indicators */}
                {images.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                        {images.map((_, idx) => (
                            <div 
                                key={idx}
                                className={`h-1 rounded-full transition-all ${
                                    currentImageIndex === idx ? 'w-6 bg-primary' : 'w-2 bg-white/20'
                                }`}
                            />
                        ))}
                    </div>
                )}
                
                {/* Color Toggle Buttons */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                    {variations.map(variation => (
                        <button
                            key={variation.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleColorChange(variation.id);
                            }}
                            className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center backdrop-blur-md shadow-lg ${
                                selectedColor === variation.id 
                                ? 'border-primary bg-primary/20 scale-110' 
                                : 'border-white/20 bg-black/40 hover:bg-black/60'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full border border-white/20 ${
                                variation.id === 'preta' ? 'bg-zinc-900' : 
                                variation.id === 'marrom' ? 'bg-[#5D4037]' : 'bg-white'
                            }`} />
                        </button>
                    ))}
                </div>

                <div className="absolute bottom-6 left-6">
                    <span className="px-4 py-1.5 bg-zinc-800/80 backdrop-blur-md text-primary text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-zinc-700/50 shadow-lg">
                        Premium Quality
                    </span>
                </div>
            </div>
            
            <div className="p-6 md:p-8 flex flex-col flex-grow bg-gradient-to-b from-zinc-900 to-zinc-950">
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tighter">{title}</h3>
                <p className="text-zinc-500 text-sm md:text-base mb-8 flex-grow leading-relaxed font-medium">
                    {description}
                </p>
                
                <div className="flex items-center justify-between mt-auto gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Preço/Peça</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-primary">R$</span>
                            <span className="text-3xl md:text-4xl font-black text-white leading-none tracking-tighter">
                                {price.toFixed(2).split('.')[0]}
                                <span className="text-lg opacity-50">.{price.toFixed(2).split('.')[1]}</span>
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onBuy}
                        className={`flex items-center gap-2 px-6 md:px-8 py-4 rounded-2xl font-black transition-all shadow-xl text-sm md:text-base ${
                            isSuspended 
                            ? 'bg-zinc-800 text-zinc-500 cursor-pointer hover:bg-zinc-700' 
                            : 'bg-primary text-white hover:bg-orange-600 active:scale-95 shadow-primary/20'
                        }`}
                    >
                        <ShoppingBag size={20} />
                        {isSuspended ? 'Indisponível' : 'Garantir Agora'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
