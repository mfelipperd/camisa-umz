import { useState, useEffect } from 'react';
import { appCheck } from '../lib/firebase';
import { getToken } from 'firebase/app-check';

export interface AdminOrder {
    id: string;
    name: string;
    model: string;
    size: string;
    color?: string;
    gender?: 'masculino' | 'feminino';
    phone?: string;
    quantity: number;
    price: number;
    status: 'pending' | 'approved' | 'rejected' | 'delivered';
    deliveredAt?: any;
    paymentId?: string;
    paymentStatus?: string;
    batchId?: string;
    createdAt: any;
    paidAt?: any;
}

export function useAllOrders() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        const adminCode = sessionStorage.getItem('admin_auth_code');
        if (!adminCode) {
            setLoading(false);
            return;
        }

        try {
            let appCheckToken = '';
            try {
                const appCheckTokenResponse = appCheck ? await getToken(appCheck) : null;
                appCheckToken = appCheckTokenResponse?.token || '';
            } catch (err) {
                console.warn("Failed to get App Check token:", err);
            }

            const apiUrl = 'https://us-central1-camisa-umz.cloudfunctions.net/getAdminOrders';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Firebase-AppCheck': appCheckToken || '',
                },
                body: JSON.stringify({ adminCode })
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                setOrders(data);
                return; // Success
            }
        } catch (error: any) {
            console.error("Error fetching orders via API, trying Firestore fallback:", error);
            
            // Fallback: Direct Firestore query for public-readable orders (approved/delivered)
            try {
                const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
                const { db } = await import('../lib/firebase');
                
                const q = query(
                    collection(db, "orders"),
                    where("status", "in", ["approved", "delivered"]),
                    orderBy("createdAt", "desc")
                );
                
                const snapshot = await getDocs(q);
                const fallbackOrders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as AdminOrder));
                
                console.log(`Firestore fallback successful: found ${fallbackOrders.length} orders`);
                setOrders(fallbackOrders);
            } catch (fallbackError) {
                console.error("Firestore fallback also failed:", fallbackError);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Fallback polling for "real-time" since direct Firestore sync is now restricted
        const interval = setInterval(fetchOrders, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, []);

    const updateOrder = async (orderId: string, data: Partial<AdminOrder>) => {
        const adminCode = sessionStorage.getItem('admin_auth_code');
        let appCheckToken = '';
        try {
            const appCheckTokenResponse = appCheck ? await getToken(appCheck) : null;
            appCheckToken = appCheckTokenResponse?.token || '';
        } catch (err) {
            console.warn("Failed to get App Check token:", err);
        }

        const response = await fetch('https://us-central1-camisa-umz.cloudfunctions.net/updateAdminOrder', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Firebase-AppCheck': appCheckToken || '',
            },
            body: JSON.stringify({ adminCode, orderId, data })
        });
        
        if (response.ok) {
            await fetchOrders(); // Refresh
        } else {
            throw new Error("Failed to update order");
        }
    };

    // Calculate totals
    const totalRevenue = orders
        .filter(o => o.status === 'approved' || o.status === 'delivered')
        .reduce((acc, o) => acc + (o.price || 0), 0);
    
    const totalSold = orders
        .filter(o => o.status === 'approved' || o.status === 'delivered')
        .reduce((acc, o) => acc + o.quantity, 0);

    return { orders, loading, totalRevenue, totalSold, updateOrder, refresh: fetchOrders };
}
