import { useState, useEffect } from 'react';
import { appCheck, db } from './lib/firebase';
import { getToken } from 'firebase/app-check';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from './hooks/useOrders';
import { useCart } from './contexts/CartContext';
import { Hero } from './components/Hero';
import { Header } from './components/Header';
import { ShirtCard } from './components/ShirtCard';
import { ProgressTracker } from './components/ProgressTracker';
import { BuyerList } from './components/BuyerList';
import { PurchaseModal } from './components/PurchaseModal';
import { CartModal } from './components/CartModal';
import { Checkout } from './components/Checkout';
import { PaymentFeedback } from './components/PaymentFeedback';
import { Footer } from './components/Footer';
import { useSabbathMode } from './hooks/useSabbathMode';
import { SabbathModal } from './components/SabbathModal';

const SHIRTS = [
    {
        id: 'normal',
        title: 'Camisa Standard',
        description: 'Corte tradicional, tecido 100% algodão penteado fio 30.1. Conforto e durabilidade para o dia a dia.',
        price: 59.90,
        colors: [
            { 
                id: 'preta', 
                images: ['/assets/standar-femina-preto-consta.png', '/assets/standar-preta-costa-feminina.png'] 
            },
            { 
                id: 'branca', 
                images: ['/assets/standar-branca-feminina-frente.png', '/assets/standard-branca-femininca-costa.jpeg'] 
            },
            {
                id: 'marrom',
                images: ['/assets/stand marrom frente.png', '/assets/stand marrom verso.png']
            }
        ]
    },
    {
        id: 'oversized',
        title: 'Street Oversized',
        description: 'Modelagem ampla, ombros caídos, tecido heavyweight. Estilo urbano moderno com caimento perfeito.',
        price: 79.90,
        colors: [
            { 
                id: 'preta', 
                images: ['/assets/over-masculina-preta-frente.png', '/assets/over-masculina-preta-costa.png'] 
            },
            { 
                id: 'branca', 
                images: ['/assets/over-femini-branca-frente.png', '/assets/over-masculina-branca-costa.png'] 
            },
            {
                id: 'marrom',
                images: ['/assets/over marrom frente.png', '/assets/over marrom costa.png']
            }
        ]
    },

];

interface CheckoutData {
    preferenceId: string;
    orderId: string;
    amount: number;
}

interface FeedbackState {
    isOpen: boolean;
    status: 'success' | 'pending' | 'error' | null;
    paymentId?: string;
    message?: string;
    paymentData?: any;
}

function App() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
    const [feedbackState, setFeedbackState] = useState<FeedbackState>({ isOpen: false, status: null });
    const [isProcessing, setIsProcessing] = useState(false);
    const { orders: buyers, createOrder } = useOrders();
    const { items: cartItems, total: cartTotal, clearCart } = useCart();
    const [selectedShirt, setSelectedShirt] = useState<typeof SHIRTS[0] | null>(null);
    
    // Sabbath Mode
    const isSabbath = useSabbathMode();
    const [isSabbathModalOpen, setIsSabbathModalOpen] = useState(false);
    
    // Title and Rotating Favicon effect
    useState(() => {
        if (typeof document !== 'undefined') {
            document.title = "UMZ Store";
        }
    });

    useState(() => {
        let rotation = 0;
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = '/assets/watermark.png';
        const favicon = document.getElementById('dynamic-favicon') as HTMLLinkElement;

        const animate = () => {
            if (!ctx || !img.complete) {
                requestAnimationFrame(animate);
                return;
            }
            ctx.clearRect(0, 0, 64, 64);
            ctx.save();
            ctx.translate(32, 32);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(img, -32, -32, 64, 64);
            ctx.restore();
            
            if (favicon) {
                favicon.href = canvas.toDataURL('image/png');
            }
            
            rotation = (rotation + 0.5) % 360; // Slow rotation
            setTimeout(() => requestAnimationFrame(animate), 100); // Throttled for performance
        };

        img.onload = () => animate();
    });

    const totalSold = buyers.reduce((acc, curr) => acc + curr.quantity, 0);
    const TARGET = 10;

    const handleBuyClick = (shirt: typeof SHIRTS[0]) => {
        if (isSabbath) {
            setIsSabbathModalOpen(true);
            return;
        }
        setSelectedShirt(shirt);
        setIsModalOpen(true);
    };

    const handleCheckout = async () => {
        if (isSabbath) {
            setIsCartOpen(false);
            setIsSabbathModalOpen(true);
            return;
        }
        if (cartItems.length === 0) return;
        setIsProcessing(true);
        
        try {
            // Generate a temporary execution ID for this checkout attempt
            const checkoutSessionId = `checkout_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create payment preference for all items
            const paymentItems = cartItems.map(item => ({
                title: `${item.model} (${item.gender}) - ${item.color} - ${item.size}`,
                unit_price: item.price,
                quantity: item.quantity,
            }));

            let appCheckToken = '';
            try {
                const appCheckTokenResponse = appCheck ? await getToken(appCheck) : null;
                appCheckToken = appCheckTokenResponse?.token || '';
            } catch (err) {
                console.warn("Failed to get App Check token:", err);
            }

            const response = await fetch('https://us-central1-camisa-umz.cloudfunctions.net/createOrderPreference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Firebase-AppCheck': appCheckToken || '',
                },
                body: JSON.stringify({
                    items: paymentItems,
                    payer: {
                        name: cartItems[0].name
                    },
                    orderId: checkoutSessionId // Use the session ID as external_reference
                }),
            });

            const preference = await response.json();

            if (preference.id) {
                setIsCartOpen(false);
                setCheckoutData({
                    preferenceId: preference.id,
                    orderId: checkoutSessionId,
                    amount: cartTotal
                });
                setIsCheckoutOpen(true);
            } else {
                throw new Error("Invalid response from payment server");
            }

        } catch (error) {
            console.error("Error starting checkout:", error);
            setFeedbackState({
                isOpen: true,
                status: 'error',
                message: error instanceof Error ? error.message : 'Erro ao iniciar pagamento',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePaymentSuccess = async (details: any) => {
        console.log("Payment successful!", details);
        setIsCheckoutOpen(false);
        setCheckoutData(null);
        
        // CREATE ORDERS IN FIRESTORE ONLY NOW
        try {
            const paymentId = String(details.id);
            const status = details.status === 'approved' ? 'approved' : 'pending';
            
            const orderPromises = cartItems.map(item => 
                createOrder({
                    name: item.name,
                    model: item.model,
                    size: item.size,
                    color: item.color,
                    gender: item.gender,
                    quantity: item.quantity,
                    status: status
                }, item.price * item.quantity, paymentId)
            );

            await Promise.all(orderPromises);
            clearCart();
            
            setFeedbackState({
                isOpen: true,
                status: status === 'approved' ? 'success' : 'pending',
                paymentId: paymentId,
                paymentData: details // Store Pix/Boleto data
            });
        } catch (error) {
            console.error("Error saving approved orders:", error);
            setFeedbackState({
                isOpen: true,
                status: 'success', 
                paymentId: String(details.id),
                message: "Pagamento aprovado, mas houve um erro ao registrar no sistema. Por favor, guarde seu comprovante."
            });
        }
    };

    const handlePaymentError = async (error: any) => {
        console.error("Payment error:", error);
        setIsCheckoutOpen(false);
        
        let errorMessage = error.message || 'Erro desconhecido';
        
        // Handle Mercado Pago friendly error
        if (error.friendlyError) {
            errorMessage = `Erro no Pagamento: ${error.friendlyError}`;
            if (error.friendlyError.includes("without key enabled")) {
                errorMessage = "Modo Produção: Sua conta precisa de uma Chave Pix cadastrada no Mercado Pago. Para usar cartões de teste, troque para as credenciais de Sandbox.";
            }
        } else if (error.status_detail) {
             errorMessage = error.status_detail;
        }

        setFeedbackState({
            isOpen: true,
            status: 'error',
            message: errorMessage,
        });
    };

    const handleCancelCheckout = () => {
        setIsCheckoutOpen(false);
        setCheckoutData(null);
    };

    const handleCloseFeedback = () => {
        setFeedbackState({ isOpen: false, status: null });
    };

    // Auto-update feedback when Pix is paid (Real-time)
    useEffect(() => {
        if (!feedbackState.isOpen || feedbackState.status !== 'pending' || !feedbackState.paymentId) return;

        // Query orders with this paymentId
        const q = query(
            collection(db, "orders"), 
            where("paymentId", "==", feedbackState.paymentId),
            where("status", "==", "approved")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                // Payment confirmed!
                setFeedbackState(prev => ({
                    ...prev,
                    status: 'success',
                    message: undefined
                }));
            }
        });

        return () => unsubscribe();
    }, [feedbackState.isOpen, feedbackState.status, feedbackState.paymentId]);

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 font-sans selection:bg-primary selection:text-white relative overflow-x-hidden">
            {/* Background Watermark */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
                <img 
                    src="/assets/watermark.png" 
                    alt="" 
                    className="w-[100%] md:w-[70%] opacity-[0.04] select-none scale-100"
                />
            </div>

            <Header onCartClick={() => setIsCartOpen(true)} />
            <Hero />
            
            <main className="container mx-auto px-4 -mt-16 md:-mt-20 relative z-20 space-y-16 md:space-y-24 pb-20">
                <section id="loja">
                    <div className="flex flex-col items-center mb-10 md:mb-16">
                        <h2 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500 mb-4 text-center tracking-tighter">
                            Escolha Sua UMZ
                        </h2>
                        <p className="text-zinc-500 text-center max-w-lg text-sm md:text-base font-medium px-6">
                            Modelos exclusivos com corte premium. Produção limitada para a comunidade Umarizal.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-4xl mx-auto px-2 md:px-0">
                        {SHIRTS.map(shirt => (
                            <ShirtCard 
                                key={shirt.id}
                                title={shirt.title}
                                description={shirt.description}
                                variations={shirt.colors}
                                price={shirt.price}
                                onBuy={() => handleBuyClick(shirt)}
                            />
                        ))}
                    </div>
                </section>

                <div className="space-y-16 md:space-y-24">
                    <section id="progresso">
                        <ProgressTracker current={totalSold} target={TARGET} />
                    </section>

                    <section className="flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-white mb-8">Comunidade</h2>
                        <BuyerList buyers={buyers} />
                    </section>
                </div>
            </main>

            <Footer />

            <PurchaseModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                model={selectedShirt?.title || ''}
                price={selectedShirt?.price || 0}
            />

            <CartModal
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onCheckout={handleCheckout}
                isProcessing={isProcessing}
            />

            {/* Loading Overlay */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="relative w-32 h-32 md:w-48 md:h-48 mb-8"
                        >
                            <img 
                                src="/assets/watermark.png" 
                                alt="Loading" 
                                className="w-full h-full opacity-20 select-none"
                            />
                        </motion.div>
                        <motion.h2 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-2"
                        >
                            Criando seu pedido...
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-zinc-500 font-medium"
                        >
                            Aguarde um instante, estamos preparando tudo.
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {isCheckoutOpen && checkoutData && (
                <Checkout
                    preferenceId={checkoutData.preferenceId}
                    orderId={checkoutData.orderId}
                    amount={checkoutData.amount}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                    onCancel={handleCancelCheckout}
                />
            )}

            <SabbathModal 
                isOpen={isSabbathModalOpen} 
                onClose={() => setIsSabbathModalOpen(false)} 
            />

            <PaymentFeedback
                isOpen={feedbackState.isOpen}
                status={feedbackState.status}
                paymentId={feedbackState.paymentId}
                message={feedbackState.message}
                onClose={handleCloseFeedback}
            />
        </div>
    );
}

export default App;
