import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { messaging, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function NotificationPermission() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if permission is already granted or denied
        if (Notification.permission === 'default') {
            // Show after a delay to not be annoying immediately
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleEnable = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted' && messaging) {
                // Get Token
                // REPLACE_WITH_YOUR_VAPID_KEY
                const token = await getToken(messaging, { 
                    vapidKey: 'BADtyj662YTaxAsRGI8PGOCP76vqDISLHeBT2iRlSDEcVg31Vfv0N6JQjFtpgp7ciYq6Zt0yJnPw3NLmwsGYOww' 
                });
                
                if (token) {
                    // Save token to Firestore
                    await setDoc(doc(db, "fcm_tokens", token), {
                        token: token,
                        createdAt: serverTimestamp(),
                        userAgent: navigator.userAgent
                    });
                    console.log("Notification token saved:", token);
                }
            }
            setIsVisible(false);
        } catch (error) {
            console.error("Error enabling notifications:", error);
            setIsVisible(false); // Hide on error
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        // Optional: Save preference to localStorage to not show again soon
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-4 md:w-96"
                >
                    <div className="bg-zinc-900 border border-zinc-700/50 p-4 rounded-2xl shadow-2xl flex items-start gap-4">
                        <div className="bg-primary/20 p-3 rounded-full shrink-0">
                            <Bell className="text-primary w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white text-sm mb-1">Fique por dentro!</h3>
                            <p className="text-zinc-400 text-xs leading-relaxed mb-3">
                                Ative as notificações para saber quando lançarmos novas coleções e promoções exclusivas.
                            </p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleEnable}
                                    className="bg-primary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-1"
                                >
                                    Ativar
                                </button>
                                <button 
                                    onClick={handleDismiss}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                                >
                                    Agora não
                                </button>
                            </div>
                        </div>
                        <button onClick={handleDismiss} className="text-zinc-500 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
