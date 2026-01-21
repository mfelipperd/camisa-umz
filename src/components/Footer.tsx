import { Heart } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-zinc-950 py-10 border-t border-zinc-900 mt-20">
            <div className="container mx-auto px-4 text-center">
                <p className="text-zinc-500 text-sm flex items-center justify-center gap-2 mb-2">
                    Criado com <Heart size={14} className="text-red-600 fill-current" /> por{' '}
                    <a 
                        href="https://portfolio-marcos-three.vercel.app/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white hover:text-primary transition-colors font-bold underline underline-offset-4"
                    >
                        Marcos Felippe
                    </a>
                </p>
                <p className="text-zinc-600 text-[10px] uppercase font-black tracking-widest">
                    © 2026 Camisas Umz • Umarizal/RN
                </p>
            </div>
        </footer>
    );
}
