import { motion } from 'framer-motion';
import { Ruler, X } from 'lucide-react';

export interface SizeRow { size: string; alt: string; larg: string; sleeve: string }

interface SizeTableProps {
    title: string;
    rows: SizeRow[];
    showSleeve: boolean;
}

export function SizeTable({ title, rows, showSleeve }: SizeTableProps) {
    return (
        <div className="w-full">
            <h3 className="text-zinc-400 text-xs font-black uppercase mb-3 tracking-wider">{title}</h3>
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-800/50">
                            <th className="px-3 py-3 text-[10px] font-black text-zinc-500 uppercase">Tam.</th>
                            <th className="px-3 py-3 text-[10px] font-black text-zinc-500 uppercase text-center">Alt.</th>
                            <th className="px-3 py-3 text-[10px] font-black text-zinc-500 uppercase text-center">Larg.</th>
                            {showSleeve && (
                                <th className="px-3 py-3 text-[10px] font-black text-zinc-500 uppercase text-center">Manga</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {rows.map((row) => (
                            <tr key={row.size} className="hover:bg-zinc-800/30 transition-colors">
                                <td className="px-3 py-3 text-sm font-bold text-white">{row.size}</td>
                                <td className="px-3 py-3 text-sm text-zinc-300 font-mono text-center">{row.alt} cm</td>
                                <td className="px-3 py-3 text-sm text-zinc-300 font-mono text-center">{row.larg} cm</td>
                                {showSleeve && (
                                    <td className="px-3 py-3 text-sm text-zinc-300 font-mono text-center">{row.sleeve} cm</td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-2 text-[10px] text-zinc-500 italic px-1">
                * Medidas aproximadas em centímetros. Pode haver variação de até 2cm.
            </p>
        </div>
    );
}

interface SizeGuideProps {
    model: string;
    onClose: () => void;
}

export const OVERSIZED_DATA: SizeRow[] = [
    { size: 'PP', alt: '75', larg: '52', sleeve: '24' },
    { size: 'P', alt: '77', larg: '55', sleeve: '26' },
    { size: 'M', alt: '79', larg: '57', sleeve: '28' },
    { size: 'G', alt: '82', larg: '59', sleeve: '29,5' },
    { size: 'GG', alt: '83', larg: '62', sleeve: '30,5' },
    { size: 'EG', alt: '84', larg: '64', sleeve: '32,5' },
];

export const NORMAL_DATA: SizeRow[] = [
    { size: 'PP', alt: '64', larg: '49', sleeve: '-' },
    { size: 'P', alt: '67', larg: '52', sleeve: '-' },
    { size: 'M', alt: '71', larg: '55', sleeve: '-' },
    { size: 'G', alt: '74', larg: '58', sleeve: '-' },
    { size: 'GG', alt: '76', larg: '61', sleeve: '-' },
    { size: 'XG', alt: '78', larg: '63', sleeve: '-' },
];

export function SizeGuide({ model, onClose }: SizeGuideProps) {
    const isOversized = model.toLowerCase().includes('oversized');

    let currentRows = isOversized ? OVERSIZED_DATA : NORMAL_DATA;
    let tableTitle = isOversized ? 'Tabela de Medidas: Oversized' : 'Tabela de Medidas: Standard';
    let showSleeve = isOversized;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 border-t border-zinc-800 pt-6"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-primary">
                    <Ruler size={18} />
                    <span className="text-sm font-black uppercase tracking-tighter">Guia de Tamanhos</span>
                </div>
                <button 
                    onClick={onClose}
                    className="text-zinc-500 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            <SizeTable title={tableTitle} rows={currentRows} showSleeve={showSleeve} />
        </motion.div>
    );
}

