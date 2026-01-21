import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function Hero() {
    return (
        <section className="relative h-[85vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-zinc-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-zinc-950 opacity-50" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
            </div>

            <div className="relative z-10 container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-primary text-[10px] md:text-sm font-bold mb-6 backdrop-blur uppercase tracking-widest">
                        Edição 2026 • Umarizal
                    </span>
                    <h1 className="text-4xl md:text-7xl font-bold text-white tracking-tight mb-6 leading-[1.1]">
                        Vista o Orgulho <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
                            De Ser Umarizal
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-base md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed px-4">
                        A nova coleção chegou. Modelos exclusivos com qualidade premium.
                        Garanta a sua antes que o pedido feche.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="#loja" className="bg-primary hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group">
                            Pedir Agora
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
