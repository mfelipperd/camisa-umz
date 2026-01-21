import { motion } from 'framer-motion';

interface ProgressTrackerProps {
    current: number;
    target: number;
}

export function ProgressTracker({ current, target }: ProgressTrackerProps) {
    const percentage = Math.min((current / target) * 100, 100);

    return (
        <div className="w-full max-w-3xl mx-auto p-5 md:p-8 bg-zinc-900/40 rounded-3xl border border-zinc-800 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                <div>
                    <h3 className="text-lg md:text-2xl font-black text-white tracking-tight uppercase">Progresso Coletivo</h3>
                    <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-wider mt-1">
                        Meta: {target} camisas • Faltam {Math.max(0, target - current)}
                    </p>
                </div>
                <div className="flex items-baseline gap-1 md:text-right">
                    <span className="text-4xl md:text-5xl font-black text-primary tracking-tighter">{current}</span>
                    <span className="text-zinc-700 text-xl font-black">/{target}</span>
                </div>
            </div>

            <div className="h-4 md:h-6 bg-zinc-800/50 rounded-full overflow-hidden relative border border-zinc-800 shadow-inner">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-primary relative shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                >
                    <div className="absolute inset-0 opacity-30" style={{
                         backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.2) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.2) 50%,rgba(255,255,255,.2) 75%,transparent 75%,transparent)',
                         backgroundSize: '1rem 1rem'
                    }} />
                </motion.div>
            </div>
            
            <div className="mt-3 flex justify-between items-center">
                <span className="text-[10px] md:text-xs font-black text-zinc-600 uppercase tracking-widest">
                    Fabricação inicia aos {target}
                </span>
                <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-widest">
                    {percentage.toFixed(0)}% Alcançado
                </span>
            </div>
        </div>
    );
}
