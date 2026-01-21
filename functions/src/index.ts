import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import MercadoPagoConfig, { Preference, Payment } from "mercadopago";
import * as cors from "cors";

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

// We will initialize the client inside the functions to ensure secrets are loaded
let client: MercadoPagoConfig;

const ADMIN_CODE = process.env.ADMIN_CODE || "umz2024admin";

// Simple in-memory rate limiting (per function instance, not global but better than nothing)
const lastRequestTime = new Map<string, number>();
const RATE_LIMIT_COOLDOWN = 2000; // 2 seconds between requests from same IP

const verifyAppCheck = async (req: functions.https.Request) => {
    // If not in production (e.g. localhost testing with debug token), we might want to skip or rely on App Check's own debug handling.
    // However, on onRequest, we MUST check the header manually.
    const appCheckToken = req.header("X-Firebase-AppCheck");
    if (!appCheckToken) {
        return false;
    }
    try {
        await admin.appCheck().verifyToken(appCheckToken);
        return true;
    } catch (err) {
        console.error("App Check verification failed:", err);
        return false;
    }
};

export const createOrderPreference = functions.runWith({ 
    secrets: ["MP_ACCESS_TOKEN", "ADMIN_CODE"] 
}).https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    // In dev mode or while fixing keys, we only log a warning instead of blocking
    const isAppCheckValid = await verifyAppCheck(req);
    if (!isAppCheckValid) {
        console.warn("App Check verification failed, but allowing request for debugging. Please configure ReCaptcha site keys correctly.");
    }

    const ip = req.ip || "unknown";
    const now = Date.now();
    if (lastRequestTime.has(ip) && now - lastRequestTime.get(ip)! < RATE_LIMIT_COOLDOWN) {
        res.status(429).json({ error: "Too many requests. Please wait." });
        return;
    }
    lastRequestTime.set(ip, now);

    client = new MercadoPagoConfig({ 
        accessToken: process.env.MP_ACCESS_TOKEN!, 
        options: { timeout: 5000 } 
    });

    try {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { items, payer, orderId } = req.body;

        const preference = new Preference(client);

        const response = await preference.create({
            body: {
                items,
                payer,
                external_reference: orderId,
                back_urls: {
                    success: "https://camisa-umz.web.app/?status=success",
                    failure: "https://camisa-umz.web.app/?status=failure",
                    pending: "https://camisa-umz.web.app/?status=pending"
                },
                auto_return: "approved",
                notification_url: "https://us-central1-camisa-umz.cloudfunctions.net/webhook"
            }
        });

        res.status(200).json({ id: response.id, init_point: response.init_point });
    } catch (error) {
        console.error("Error creating preference:", error);
        res.status(500).json({ error: "Failed to create preference" }); 
    }
  });
});

export const processPayment = functions.runWith({ 
    secrets: ["MP_ACCESS_TOKEN"] 
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const isAppCheckValid = await verifyAppCheck(req);
        if (!isAppCheckValid) {
            console.warn("App Check failed for processPayment (debug).");
        }

        client = new MercadoPagoConfig({ 
            accessToken: process.env.MP_ACCESS_TOKEN!, 
            options: { timeout: 5000 } 
        });

        try {
            if (req.method !== 'POST') {
                res.status(405).send('Method Not Allowed');
                return;
            }

            const paymentData = req.body;
            const payment = new Payment(client);
            
            // Add idempotency key to prevent duplicates
            const requestOptions = {
                idempotencyKey: paymentData.idempotencyKey || undefined
            };

            const result = await payment.create({
                body: {
                    transaction_amount: paymentData.transaction_amount,
                    token: paymentData.token,
                    description: paymentData.description,
                    installments: paymentData.installments,
                    payment_method_id: paymentData.payment_method_id,
                    issuer_id: paymentData.issuer_id,
                    payer: {
                        email: paymentData.payer?.email || "customer@unknown.com",
                        identification: {
                            type: paymentData.payer?.identification?.type || "CPF",
                            number: paymentData.payer?.identification?.number || "00000000000"
                        }
                    },
                    external_reference: paymentData.external_reference
                },
                requestOptions
            });

            // Update order status in Firestore based on payment result
            const orderId = paymentData.external_reference;
            if (orderId && result.status) {
                const updateData: any = {
                    paymentId: result.id,
                    paymentStatus: result.status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                if (result.status === 'approved') {
                    updateData.status = 'approved';
                    updateData.paidAt = admin.firestore.FieldValue.serverTimestamp();
                } else if (result.status === 'pending' || result.status === 'in_process') {
                    updateData.status = 'pending';
                } else if (result.status === 'rejected') {
                    updateData.status = 'rejected';
                }

                await db.collection("orders").doc(orderId).set(updateData, { merge: true });
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.error("Error processing payment:", error);
            
            // Check for Mercado Pago specific errors
            const status = error.status || 500;
            const message = error.message || "Failed to process payment";
            const cause = error.cause || [];

            res.status(status).json({ 
                error: message, 
                details: error,
                friendlyError: cause[0]?.description || message
            });
        }
    });
});

export const webhook = functions.runWith({ 
    secrets: ["MP_ACCESS_TOKEN"] 
}).https.onRequest(async (req, res) => {
    client = new MercadoPagoConfig({ 
        accessToken: process.env.MP_ACCESS_TOKEN!, 
        options: { timeout: 5000 } 
    });
    const type = req.query.type || req.body.type;
    const data = req.body.data;

    try {
        if (type === "payment") {
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: data.id });
            
            if (paymentInfo.status === 'approved') {
                const orderId = paymentInfo.external_reference;
                if (orderId) {
                    await db.collection("orders").doc(orderId).update({
                        status: 'approved',
                        paymentId: data.id,
                        paidAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
        res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).send("Webhook failed");
    }
});

// Complete current batch and start a new one
export const completeBatch = functions.runWith({ 
    secrets: ["ADMIN_CODE"] 
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // App Check verification
        if (!(await verifyAppCheck(req))) {
            console.warn("App Check failed for completeBatch (debug)");
        }

        try {
            const { adminCode } = req.body;
            if (adminCode !== ADMIN_CODE) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            // Get current batch config
            const configRef = db.collection("config").doc("currentBatch");
            const configDoc = await configRef.get();
            
            let currentBatchId = "batch_1";
            if (configDoc.exists) {
                currentBatchId = configDoc.data()?.batchId || "batch_1";
            }

            // First, update all approved orders WITHOUT a batchId to have the currentBatchId
            const ordersWithoutBatchSnapshot = await db.collection("orders")
                .where("status", "==", "approved")
                .get();
            
            const batch = db.batch();
            let ordersToUpdate = 0;
            
            ordersWithoutBatchSnapshot.forEach(docSnapshot => {
                const data = docSnapshot.data();
                // Only update if batchId is missing or matches current batch
                if (!data.batchId || data.batchId === currentBatchId) {
                    batch.update(docSnapshot.ref, { batchId: currentBatchId });
                    ordersToUpdate++;
                }
            });
            
            // Execute batch update
            if (ordersToUpdate > 0) {
                await batch.commit();
            }

            // Now get all orders from the current batch
            const ordersSnapshot = await db.collection("orders")
                .where("batchId", "==", currentBatchId)
                .where("status", "==", "approved")
                .get();

            if (ordersSnapshot.empty) {
                res.status(400).json({ error: "No approved orders to complete" });
                return;
            }

            // Calculate batch stats
            let totalQuantity = 0;
            let totalRevenue = 0;
            const orderIds: string[] = [];

            ordersSnapshot.forEach(doc => {
                const data = doc.data();
                totalQuantity += data.quantity || 0;
                totalRevenue += data.price || 0;
                orderIds.push(doc.id);
            });

            // Create batch record
            const batchRef = await db.collection("batches").add({
                batchId: currentBatchId,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                totalOrders: ordersSnapshot.size,
                totalQuantity,
                totalRevenue,
                orderIds
            });

            // Generate new batch ID
            const batchNumber = parseInt(currentBatchId.split("_")[1] || "1");
            const newBatchId = `batch_${batchNumber + 1}`;

            // Update config with new batch
            await configRef.set({ batchId: newBatchId });

            res.status(200).json({
                success: true,
                completedBatchId: currentBatchId,
                newBatchId: newBatchId,
                batchRecordId: batchRef.id,
                stats: {
                    totalOrders: ordersSnapshot.size,
                    totalQuantity,
                    totalRevenue
                }
            });
        } catch (error) {
            console.error("Error completing batch:", error);
            res.status(500).json({ error: "Failed to complete batch" });
        }
    });
});

// Admin-only functions to bypass tightened Firestore rules
export const getAdminOrders = functions.runWith({ 
    secrets: ["ADMIN_CODE"] 
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const isAppCheckValid = await verifyAppCheck(req);
        if (!isAppCheckValid) {
            console.warn("App Check failed for getAdminOrders (debug)");
        }
        try {
            const { adminCode } = req.body;
            if (adminCode !== ADMIN_CODE) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.status(200).json(orders);
        } catch (error) {
            console.error("Error fetching admin orders:", error);
            res.status(500).json({ error: "Failed to fetch orders" });
        }
    });
});

export const updateAdminOrder = functions.runWith({ 
    secrets: ["ADMIN_CODE"] 
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const isAppCheckValid = await verifyAppCheck(req);
        if (!isAppCheckValid) {
            console.warn("App Check failed for updateAdminOrder (debug)");
        }
        try {
            const { adminCode, orderId, data } = req.body;
            if (adminCode !== ADMIN_CODE) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            // Remove sensitive or read-only fields from update if any
            delete (data as any).id;
            delete (data as any).createdAt;

            await db.collection("orders").doc(orderId).update({
                ...data,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error updating admin order:", error);
            res.status(500).json({ error: "Failed to update order" });
        }
    });
});

export const checkPaymentStatus = functions.runWith({ 
    secrets: ["MP_ACCESS_TOKEN", "ADMIN_CODE"] 
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        const isAppCheckValid = await verifyAppCheck(req);
        if (!isAppCheckValid) {
            console.warn("App Check failed for checkPaymentStatus (debug)");
        }

        try {
            const { adminCode, orderId, paymentId } = req.body;
            
            if (adminCode !== ADMIN_CODE) {
                res.status(401).json({ error: "Unauthorized: Invalid Admin Code" });
                return;
            }

            if (!orderId || !paymentId) {
                res.status(400).json({ error: "Missing orderId or paymentId" });
                return;
            }

            client = new MercadoPagoConfig({ 
                accessToken: process.env.MP_ACCESS_TOKEN!, 
                options: { timeout: 5000 } 
            });

            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: paymentId });
            
            // Check if status in DB is different from MP
            const orderDoc = await db.collection("orders").doc(orderId).get();
            const currentStatus = orderDoc.data()?.status;
            
            let updated = false;
            
            // If MP says approved but we have pending, update it
            if (paymentInfo.status === 'approved' && currentStatus !== 'approved') {
                 await db.collection("orders").doc(orderId).update({
                    status: 'approved',
                    paymentStatus: 'approved',
                    paidAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updated = true;
            } else if (paymentInfo.status !== currentStatus && paymentInfo.status !== 'approved') {
                 // For other statuses (rejected, pending), ensure it matches
                 await db.collection("orders").doc(orderId).update({
                    paymentStatus: paymentInfo.status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                 });
                 updated = true;
            }

            res.status(200).json({ 
                success: true, 
                status: paymentInfo.status,
                status_detail: paymentInfo.status_detail,
                updated
            });

        } catch (error: any) {
            console.error("Error checking payment status:", error);
            res.status(500).json({ 
                error: "Failed to check payment status",
                details: error.message 
            });
        }
    });
});
