import { useEffect } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

interface CheckoutProps {
    preferenceId: string;
    amount: number;
    orderId: string;
    onPaymentSuccess: (details: any) => void;
    onPaymentError: (error: any) => void; 
    onCancel: () => void;
}

export function Checkout({ preferenceId, amount, orderId, onPaymentSuccess, onPaymentError, onCancel }: CheckoutProps) {
    useEffect(() => {
        initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, {
            locale: 'pt-BR'
        });
    }, []);

    const customization = {
        paymentMethods: {
            bankTransfer: 'all' as const,
            creditCard: 'all' as const,
            debitCard: 'all' as const,
        },
    };

    const initialization = {
        amount: amount,
        preferenceId: preferenceId,
    };

    const onSubmit = async ({ formData }: any) => {
        try {
            // Add external_reference to formData for order tracking
            const paymentData = {
                ...formData,
                external_reference: orderId
            };

            const response = await fetch('https://us-central1-camisa-umz.cloudfunctions.net/processPayment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData),
            });

            const result = await response.json();
            
            console.log("Payment result:", result);
            
            // If we have a payment ID, it was processed (even if pending)
            if (result.id) {
                // Verificar se o status é válido para criar pedidos
                const validStatuses = ['approved', 'pending', 'in_process', 'authorized'];
                
                if (!result.status || !validStatuses.includes(result.status)) {
                    // Status inválido ou rejeição - não criar pedidos
                    onPaymentError(result);
                } else {
                    // Status válido - pode criar pedidos
                    onPaymentSuccess(result);
                }
            } else if (result.error) {
                onPaymentError(result);
            } else {
                onPaymentError(result);
            }
        } catch (error) {
            console.error("Payment processing error:", error);
            onPaymentError(error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/95 backdrop-blur-sm flex items-start justify-center pt-8 pb-8 px-4">
            <div className="relative w-full max-w-2xl bg-[#242424] rounded-2xl shadow-2xl p-6 border border-zinc-800">
                <button 
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"
                >
                    ✕ Cancelar
                </button>
                
                <h2 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                    Finalizar Pagamento
                </h2>

                <div id="payment-brick_container">
                    <Payment
                        initialization={initialization}
                        customization={customization}
                        onSubmit={onSubmit}
                        onReady={() => console.log('Payment Brick is ready')}
                        onError={onPaymentError}
                    />
                </div>
            </div>
        </div>
    );
}
