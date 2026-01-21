import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useCurrentBatch() {
    const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrentBatch = async () => {
            try {
                const configDoc = await getDoc(doc(db, "config", "currentBatch"));
                if (configDoc.exists()) {
                    setCurrentBatchId(configDoc.data().batchId);
                } else {
                    // Default to "batch_1" if no config exists
                    setCurrentBatchId("batch_1");
                }
            } catch (error) {
                console.error("Error fetching current batch:", error);
                setCurrentBatchId("batch_1");
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentBatch();
    }, []);

    return { currentBatchId, loading };
}
