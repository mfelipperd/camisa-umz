import { User } from 'lucide-react';

interface Buyer {
    id: string;
    name: string;
    quantity: number;
    model: string;
}

interface BuyerListProps {
    buyers: Buyer[];
}

export function BuyerList({ buyers }: BuyerListProps) {
    const isEmpty = buyers.length === 0;
    return (
        <div className="w-full max-w-md mx-auto bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="bg-zinc-800/20 p-5 border-b border-zinc-800/50">
                <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    Comunidade UMZ
                </h3>
            </div>
            <div className="max-h-72 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {isEmpty ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                         <p className="text-zinc-600 font-bold text-sm tracking-tight text-center">Nenhum pedido registrado ainda.<br/>Seja o primeiro da lista!</p>
                    </div>
                ) : (
                    buyers.map((buyer, i) => (
                        <div key={buyer.id || i} className="flex items-center justify-between p-3.5 bg-zinc-800/20 rounded-2xl border border-zinc-800/30 hover:border-zinc-700 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm font-black text-white shadow-lg border border-zinc-700/50 group-hover:scale-110 transition-transform">
                                    {buyer.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-white truncate w-32 md:w-48 capitalize">{buyer.name.toLowerCase()}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{buyer.model}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-600 font-bold uppercase mb-0.5">Qtd</span>
                                <span className="text-sm font-black text-primary px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                                    {buyer.quantity}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
