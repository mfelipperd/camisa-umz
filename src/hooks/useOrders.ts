import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, doc, getDoc } from 'firebase/firestore';

export interface Order {
    id: string;
    name: string;
    model: string;
    size: string;
    color?: string;
    gender?: 'masculino' | 'feminino';
    quantity: number;
    status: 'pending' | 'approved' | 'rejected' | 'delivered';
    deliveredAt?: any;
    batchId?: string;
    createdAt: any;
}

export function useOrders() {
    const [allApprovedOrders, setAllApprovedOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentBatchId, setCurrentBatchId] = useState<string>('batch_1');

    // Subscribe to current batch ID (real-time)
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "config", "currentBatch"), (docSnapshot) => {
            if (docSnapshot.exists()) {
                setCurrentBatchId(docSnapshot.data().batchId || 'batch_1');
            } else {
                setCurrentBatchId('batch_1');
            }
        }, (error) => {
            console.error("Error fetching batch ID:", error);
        });
        return () => unsubscribe();
    }, []);

    // Query all approved orders (no batchId filter in Firestore)
    useEffect(() => {
        const q = query(
            collection(db, "orders"), 
            where("status", "in", ["approved", "delivered"]),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Order));
            setAllApprovedOrders(fetchedOrders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filter orders by current batch CLIENT-SIDE (only show orders with matching batchId)
    const orders = allApprovedOrders.filter(o => o.batchId === currentBatchId);

    const createOrder = async (
        order: Omit<Order, 'id' | 'createdAt' | 'batchId'>, 
        price: number,
        paymentId?: string
    ) => {
        // Get fresh batch ID at order creation time
        let batchId = currentBatchId;
        try {
            const configDoc = await getDoc(doc(db, "config", "currentBatch"));
            if (configDoc.exists()) {
                batchId = configDoc.data().batchId || 'batch_1';
            }
        } catch (error) {
            console.error("Error fetching batch ID for order:", error);
        }

        const orderData: any = {
            ...order,
            price,
            batchId,
            paymentId,
            createdAt: serverTimestamp()
        };

        // Remove undefined fields to prevent Firestore errors
        Object.keys(orderData).forEach(key => 
            orderData[key] === undefined && delete orderData[key]
        );

        const docRef = await addDoc(collection(db, "orders"), orderData);
        return docRef.id;
    };

    return { orders, loading, createOrder, currentBatchId };
}
