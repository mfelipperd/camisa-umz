import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, X } from 'lucide-react';

interface PaymentFeedbackProps {
    isOpen: boolean;
    status: 'success' | 'pending' | 'error' | null;
    paymentId?: string;
    message?: string;
    onClose: () => void;
    paymentData?: any; // To store Pix QR Code / Boleto link
}

export function PaymentFeedback({ isOpen, status, paymentId, message, onClose, paymentData }: PaymentFeedbackProps) {
    if (!isOpen || !status) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copiado para a área de transferência!");
    };

    const config = {
        success: {
            icon: CheckCircle,
            title: 'Pagamento Aprovado!',
            subtitle: 'Seu pedido foi confirmado com sucesso.',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/30',
        },
        pending: {
            icon: Clock,
            title: 'Pagamento Iniciado',
            subtitle: 'Finalize o pagamento para confirmar seu pedido.',
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/30',
        },
        error: {
            icon: XCircle,
            title: 'Erro no Pagamento',
            subtitle: message || 'Ocorreu um erro ao processar seu pagamento.',
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
        },
    };

    const { icon: Icon, title, subtitle, color, bgColor, borderColor } = config[status];

    // Check for Pix data
    const pixCode = paymentData?.point_of_interaction?.transaction_data?.qr_code;
    const pixBase64 = paymentData?.point_of_interaction?.transaction_data?.qr_code_base64;
    
    // Check for Boleto data
    const ticketUrl = paymentData?.transaction_details?.external_resource_url;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4 overflow-y-auto"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className={`relative w-full max-w-md ${bgColor} ${borderColor} border rounded-2xl p-8 text-center my-8`}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        <Icon className={`w-20 h-20 mx-auto mb-6 ${color}`} />
                    </motion.div>

                    <h2 className={`text-2xl font-bold mb-2 ${color}`}>{title}</h2>
                    <p className="text-zinc-300 mb-6">{subtitle}</p>

                    {status === 'pending' && pixCode && (
                        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10 text-left">
                            <p className="text-white font-bold mb-3 text-center">Escaneie o QR Code PIX:</p>
                            {pixBase64 && (
                                <img 
                                    src={`data:image/png;base64,${pixBase64}`} 
                                    alt="QR Code Pix" 
                                    className="w-48 h-48 mx-auto mb-4 rounded-lg mix-blend-screen"
                                />
                            )}
                            <div className="bg-black/30 p-3 rounded-lg flex items-center gap-2 mb-2">
                                <input 
                                    readOnly 
                                    value={pixCode} 
                                    className="bg-transparent text-zinc-400 text-xs w-full outline-none font-mono truncate"
                                />
                            </div>
                            <button
                                onClick={() => copyToClipboard(pixCode)}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition-colors text-sm mb-4"
                            >
                                Copiar Código Pix
                            </button>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                <p className="text-amber-400 text-xs font-bold mb-1 flex items-center gap-1">
                                    ⚠️ Importante:
                                </p>
                                <p className="text-zinc-300 text-xs leading-relaxed">
                                    Após realizar o pagamento, envie o comprovante para o <strong className="text-white">Diretor Jovem</strong> para que ele confirme o pagamento na plataforma.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'pending' && ticketUrl && (
                        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                            <p className="text-white font-bold mb-3">Boleto Gerado:</p>
                            <a 
                                href={ticketUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-lg transition-colors mb-2"
                            >
                                Visualizar / Imprimir Boleto
                            </a>
                            <p className="text-zinc-500 text-xs">O boleto pode levar alguns minutos para ser registrado.</p>
                        </div>
                    )}

                    {paymentId && (
                        <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                            <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest mb-1">ID do Pagamento</p>
                            <p className="text-white font-mono text-sm">{paymentId}</p>
                        </div>
                    )}

                    {(status === 'success' || status === 'pending') && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-left">
                            <p className="text-white text-sm font-bold mb-2">Informações Importantes:</p>
                            <ul className="text-zinc-400 text-xs space-y-2 list-none">
                                <li className="flex gap-2">
                                    <span className="text-primary">•</span>
                                    <span>As camisas serão entregues em 10 dias após o início da confecção (quando a meta for atingida).</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary">•</span>
                                    <span>Pedidos que já constarem como "Enviados" ou "Entregues" no painel não poderão ser alterados.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary">•</span>
                                    <span>Em caso de dúvidas, entre em contato com o **Diretor Jovem da Igreja**.</span>
                                </li>
                            </ul>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className={`w-full py-3 rounded-lg font-semibold transition-all ${
                            status === 'error' 
                                ? 'bg-zinc-700 hover:bg-zinc-600 text-white' 
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                        }`}
                    >
                        {status === 'error' ? 'Tentar Novamente' : 'Continuar'}
                    </button>
                    
                    {/* Add padding at bottom for scrolling */}
                    <div className="h-4"></div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
