import React, { useState, useEffect } from 'react';
import { useAllOrders, type AdminOrder } from '../hooks/useAllOrders';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Package, DollarSign, Users, CheckCircle, Clock, XCircle, LogOut, History, Send, Truck, Edit2, Save, X } from 'lucide-react';
import { db, appCheck } from '../lib/firebase';
import { getToken } from 'firebase/app-check';
import { doc, collection, query, orderBy, onSnapshot, serverTimestamp, where, getDocs, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'admin123';

interface Batch {
    id: string;
    batchId: string;
    completedAt: any;
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
    orderIds?: string[];
}

export function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState('');
    const [activeView, setActiveView] = useState<'current' | 'history' | 'batch_details'>('current');
    const [currentBatchId, setCurrentBatchId] = useState<string>('batch_1');
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isCompleting, setIsCompleting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [copied, setCopied] = useState(false);
    const [editingOrder, setEditingOrder] = useState<AdminOrder | null>(null);
    const [batchOrders, setBatchOrders] = useState<AdminOrder[]>([]);
    const [isBatchLoading, setIsBatchLoading] = useState(false);
    const { orders, loading, updateOrder } = useAllOrders();

    // Filter orders by current batch (only show orders with matching batchId) and valid status
    const currentBatchOrders = orders.filter(o => o.batchId === currentBatchId);
    
    // Only orders with confirmed payment (approved or delivered)
    const currentBatchValidOrders = currentBatchOrders.filter(o => o.status === 'approved' || o.status === 'delivered');
    
    const currentBatchApproved = currentBatchValidOrders; // Rename for stats consistency if needed, or use currentBatchValidOrders
    const currentBatchRevenue = currentBatchValidOrders.reduce((acc, o) => acc + (o.price || 0), 0);
    const currentBatchSold = currentBatchValidOrders.reduce((acc, o) => acc + o.quantity, 0);

    // Generate order summary grouped by model, color, and size
    const generateOrderSummary = () => {
        const summary: { [key: string]: { [color: string]: { [size: string]: number } } } = {};
        
        currentBatchApproved.forEach(order => {
            const model = order.model || 'Sem modelo';
            const color = order.color || 'Sem cor';
            const size = order.size || 'Sem tamanho';
            
            if (!summary[model]) {
                summary[model] = {};
            }
            if (!summary[model][color]) {
                summary[model][color] = {};
            }
            if (!summary[model][color][size]) {
                summary[model][color][size] = 0;
            }
            summary[model][color][size] += order.quantity;
        });

        let text = `📦 PEDIDO - ${currentBatchId}\n\n`;
        
        Object.keys(summary).forEach(model => {
            text += `${model}:\n`;
            Object.keys(summary[model]).forEach(color => {
                text += `  📌 ${color.charAt(0).toUpperCase() + color.slice(1)}:\n`;
                Object.keys(summary[model][color]).forEach(size => {
                    text += `    • ${size}: ${summary[model][color][size]} unidade(s)\n`;
                });
            });
            text += '\n';
        });

        text += `------------------\n`;
        text += `TOTAL: ${currentBatchSold} camisas\n`;
        text += `VALOR: R$ ${currentBatchRevenue.toFixed(2)}`;

        return text;
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(generateOrderSummary());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Check if already authenticated in session
    useEffect(() => {
        const stored = sessionStorage.getItem('admin_auth');
        if (stored === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

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

    // Fetch batch history
    useEffect(() => {
        const q = query(collection(db, "batches"), orderBy("completedAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBatches = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Batch));
            setBatches(fetchedBatches);
        });
        return () => unsubscribe();
    }, []);
    
    // Fetch orders for the selected historical batch
    useEffect(() => {
        if (activeView !== 'batch_details' || !selectedBatch) {
            setBatchOrders([]);
            return;
        }

        const fetchBatchOrders = async () => {
            setIsBatchLoading(true);
            try {
                // Fetch ALL approved/delivered orders (allowed by rules)
                // Filter locally to ensure we catch orders even if batchId field is missing/corrupt
                const q = query(
                    collection(db, "orders"),
                    where("status", "in", ["approved", "delivered"])
                );
                
                const snapshot = await getDocs(q);
                const allApproved = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as AdminOrder));
                
                // Sort locally since we removed orderBy to avoid index requirements
                allApproved.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
                    return dateB.getTime() - dateA.getTime(); // Use getTime() for date comparison
                });
                
                // Robust filter: ensure everything is string and trimmed
                const targetBatchId = selectedBatch.batchId.trim().toLowerCase();
                console.log("FETCH DEBUG:", {
                    targetBatchId,
                    dbCount: allApproved.length,
                    batchIdsCount: selectedBatch.orderIds?.length,
                    firstDbId: allApproved[0]?.id,
                    firstBatchId: selectedBatch.orderIds?.[0]
                });

                // Robust filter: ensure everything is string and trimmed
                const batchIdSet = new Set((selectedBatch.orderIds || []).map(id => String(id).trim()));
                
                const filtered = allApproved.filter(o => {
                    const cleanId = String(o.id).trim();
                    const cleanBatchId = String(o.batchId || '').trim().toLowerCase();
                    
                    const matchesBatchId = cleanBatchId === targetBatchId;
                    const matchesOrderId = batchIdSet.has(cleanId);
                    
                    return matchesBatchId || matchesOrderId;
                });

                console.log(`Filtered count: ${filtered.length}`);

                if (filtered.length === 0 && selectedBatch.orderIds && selectedBatch.orderIds.length > 0) {
                    console.log("Empty results, trying individual ID fetch fallback...");
                    try {
                        const individualOrders: AdminOrder[] = [];
                        // Fetch in chunks to avoid blocking too much
                        for (const id of selectedBatch.orderIds) {
                            const orderDoc = await getDoc(doc(db, "orders", id));
                            if (orderDoc.exists()) {
                                individualOrders.push({
                                    id: orderDoc.id,
                                    ...orderDoc.data()
                                } as AdminOrder);
                            }
                        }
                        if (individualOrders.length > 0) {
                            console.log(`Individual fetch successful: found ${individualOrders.length} orders`);
                            // Sort locally
                            individualOrders.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                            setBatchOrders(individualOrders);
                            return; // Stop here
                        }
                    } catch (idFetchError) {
                        console.error("Individual ID fetch failed:", idFetchError);
                    }
                }

                // Sort and set: Handle undefined names to prevent crashes
                filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                setBatchOrders(filtered);
                
                // Log for debugging if still empty
                if (filtered.length === 0) {
                    console.warn(`No orders found for batch ${selectedBatch.batchId}.`);
                }
            } catch (err: any) {
                console.error("Error fetching batch orders:", err);
            } finally {
                setIsBatchLoading(false);
            }
        };

        fetchBatchOrders();
    }, [selectedBatch]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputCode === ADMIN_CODE) {
            setIsAuthenticated(true);
            sessionStorage.setItem('admin_auth', 'true');
            sessionStorage.setItem('admin_auth_code', inputCode);
            setError('');
        } else {
            setError('Código inválido');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_auth');
        sessionStorage.removeItem('admin_auth_code');
    };

    const handleCompleteBatch = async () => {
        setIsCompleting(true);
        const adminCode = sessionStorage.getItem('admin_auth_code');
        
        // Try to get App Check token, but don't fail if it errors
        let appCheckToken = '';
        if (appCheck) {
            try {
                const appCheckTokenResponse = await getToken(appCheck);
                appCheckToken = appCheckTokenResponse?.token || '';
                console.log('App Check token obtained successfully');
            } catch (error) {
                console.warn('Failed to get App Check token:', error);
                console.warn('Continuing without App Check token');
                // Continue without token - backend will handle it
            }
        }

        try {
            const response = await fetch('https://us-central1-camisa-umz.cloudfunctions.net/completeBatch', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Firebase-AppCheck': appCheckToken || '',
                },
                body: JSON.stringify({ adminCode })
            });
            const result = await response.json();
            
            if (result.success) {
                setCurrentBatchId(result.newBatchId);
                setShowConfirmModal(false);
                alert(`Lote ${result.completedBatchId} finalizado!\n\nNovo lote iniciado: ${result.newBatchId}\n\nTotal de pedidos: ${result.stats.totalOrders}\nTotal de camisas: ${result.stats.totalQuantity}\nReceita: R$ ${result.stats.totalRevenue.toFixed(2)}`);
            } else {
                alert(result.error || 'Erro ao finalizar lote');
            }
        } catch (error) {
            console.error("Error completing batch:", error);
            alert('Erro ao finalizar lote');
        } finally {
            setIsCompleting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        <CheckCircle size={12} /> Aprovado
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                        <Clock size={12} /> Pendente
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                        <XCircle size={12} /> Rejeitado
                    </span>
                );
            case 'delivered':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                        <Truck size={12} /> Entregue
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-zinc-500/20 text-zinc-400">
                        {status}
                    </span>
                );
        }
    };


    const handleStatusUpdate = async (orderId: string, newStatus: AdminOrder['status']) => {
        try {
            await updateOrder(orderId, { 
                status: newStatus,
                deliveredAt: newStatus === 'delivered' ? serverTimestamp() : undefined
            });
        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Erro ao atualizar status do pedido.");
        }
    };

    const handleExportPDF = (batch: Batch, orders: AdminOrder[]) => {
        try {
            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(18);
            doc.text(`Relatório de Entrega - ${batch.batchId}`, 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            
            let dateStr = 'N/A';
            if (batch.completedAt?.toDate) {
                dateStr = batch.completedAt.toDate().toLocaleDateString('pt-BR');
            } else if (batch.completedAt instanceof Date) {
                dateStr = batch.completedAt.toLocaleDateString('pt-BR');
            }

            doc.text(`Data do Lote: ${dateStr}`, 14, 28);
            doc.text(`Total de Pedidos: ${orders.length}`, 14, 33);
            
            // Table Data
            const tableColumn = ["Nome", "Modelo", "Tam", "Cor", "Status", "Valor", "Retirado em / Assinatura"];
            const tableRows = orders.map(order => [
                order.name || 'N/A',
                order.model || 'N/A',
                order.size || 'N/A',
                order.color || 'N/A',
                order.status === 'delivered' ? 'Entregue' : 'Pendente',
                `R$ ${(order.price || 0).toFixed(2)}`,
                "____/____ [ ]" // Placeholder for manual marking
            ]);

            // Generate Table
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 40,
                theme: 'striped',
                headStyles: { fillColor: [40, 40, 40] },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    6: { cellWidth: 40 } // Signature column wider
                }
            });

            // Save
            doc.save(`Entrega_${batch.batchId}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed!", error);
            alert("Erro ao gerar PDF: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOrder) return;

        try {
            const { id, ...data } = editingOrder;
            await updateOrder(id, data);
            setEditingOrder(null);
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Erro ao atualizar pedido");
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCheckStatus = async (order: AdminOrder, btn: HTMLButtonElement) => {
        const originalText = btn.innerText;
        btn.innerText = "Verificando...";
        btn.disabled = true;

        try {
            if (!order.paymentId) {
                // If checking manually and no payment ID, ask user to check manually on dashboard
                alert("Este pedido não tem ID de pagamento. Verifique manualmente no Dashboard do Mercado Pago.");
                return;
            }

            const adminCode = sessionStorage.getItem('admin_auth_code');
            let appCheckToken = '';
            try {
                const appCheckTokenResponse = appCheck ? await getToken(appCheck) : null;
                appCheckToken = appCheckTokenResponse?.token || '';
            } catch (err) {
                console.warn("App Check token error:", err);
            }

            const response = await fetch('https://us-central1-camisa-umz.cloudfunctions.net/checkPaymentStatus', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Firebase-AppCheck': appCheckToken || '',
                },
                body: JSON.stringify({ 
                    adminCode, 
                    orderId: order.id,
                    paymentId: order.paymentId 
                })
            });

            if (!response.ok) {
                // Try to parse error message from server
                let errorMessage = response.statusText;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // Ignore json parse error if response is not json
                }
                throw new Error(`Erro ${response.status}: ${errorMessage}`);
            }
            
            const result = await response.json();
            if (result.success && result.updated) {
                alert(`Status atualizado com sucesso para: ${result.status}`);
                window.location.reload();
            } else {
                alert(`Status atual no Mercado Pago: ${result.status}\nDetalhe: ${result.status_detail}\n\nO pedido permanecerá como Pendente até o pagamento ser aprovado.`);
            }

        } catch (error: any) {
            console.error("Erro ao verificar:", error);
            alert(`Falha na verificação: ${error.message || 'Erro desconhecido'}`);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h1 className="text-xl font-bold text-white">Área Administrativa</h1>
                        <p className="text-zinc-400 text-sm mt-2">Digite o código de acesso</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder="Código de acesso"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                        />
                        {error && (
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        )}
                        <button
                            type="submit"
                            className="w-full py-3 bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                            Entrar
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    // Admin Dashboard
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="bg-zinc-900 border-b border-zinc-800 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-xs sm:text-base">
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-white tracking-tighter">Admin UMZ</h1>
                        <p className="text-[10px] md:text-sm text-zinc-500 font-bold uppercase tracking-widest">{currentBatchId}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 p-2 text-zinc-500 hover:text-white transition-colors font-bold uppercase text-[10px] md:text-xs"
                    >
                        <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
                {/* Tabs */}
                <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 mb-6 w-full sm:w-fit">
                            <button
                                onClick={() => setActiveView('current')}
                                className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeView === 'current'
                                        ? 'border-white text-white bg-white/5'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Lote Atual
                            </button>
                            <button
                                onClick={() => setActiveView('history')}
                                className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeView === 'history'
                                        ? 'border-white text-white bg-white/5'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Histórico
                            </button>
                        </div>

                        {activeView === 'current' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Receita</p>
                                        <p className="text-lg md:text-2xl font-black text-white">
                                            R${currentBatchRevenue.toFixed(0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Peças</p>
                                        <p className="text-lg md:text-2xl font-black text-white">{currentBatchSold}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-violet-500/10 rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5 md:w-6 md:h-6 text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Pedidos</p>
                                        <p className="text-lg md:text-2xl font-black text-white">{currentBatchApproved.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
                                <button
                                    onClick={() => setShowConfirmModal(true)}
                                    disabled={currentBatchSold < 10}
                                    className="w-full h-full flex flex-col items-center justify-center gap-1 md:gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl font-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale shadow-lg shadow-emerald-500/20 py-3 md:py-0"
                                >
                                    <div className="flex items-center gap-2 text-white text-xs md:text-base">
                                        <Send size={18} />
                                        <span>Fechar Lote</span>
                                    </div>
                                    {currentBatchSold < 10 && (
                                        <span className="text-[9px] md:text-[10px] text-white/70 uppercase">Faltam {10 - currentBatchSold}</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Orders Table */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-800">
                                <h2 className="text-lg font-semibold">Pedidos do Lote Atual</h2>
                            </div>

                            {loading ? (
                                <div className="p-8 text-center text-zinc-400">Carregando...</div>
                            ) : currentBatchOrders.length === 0 ? (
                                <div className="p-8 text-center text-zinc-400">Nenhum pedido neste lote</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Nome</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Modelo</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">WhatsApp</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Cor</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Tamanho</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Qtd</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Valor</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Data</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {currentBatchOrders.map((order) => (
                                                <tr 
                                                    key={order.id} 
                                                    className={`hover:bg-zinc-800/30 transition-colors ${order.status !== 'delivered' ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                                                    onClick={() => {
                                                        if (order.status === 'delivered') {
                                                            alert("Pedidos entregues não podem ser alterados.");
                                                            return;
                                                        }
                                                        setEditingOrder(order);
                                                    }}
                                                >
                                                    <td className="px-4 py-4 text-sm font-medium text-white">{order.name}</td>
                                                    <td className="px-4 py-4 text-sm text-zinc-300">{order.model}</td>
                                                    <td className="px-4 py-4 text-sm text-zinc-300">
                                                        {order.phone ? (
                                                            <a 
                                                                href={`https://wa.me/55${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.name.split(' ')[0]}, sua camisa UMZ já está pronta! Pode vir retirar.`)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-emerald-400 hover:text-emerald-300 font-bold underline"
                                                            >
                                                                {order.phone}
                                                            </a>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-zinc-300 capitalize">{order.color || '-'}</td>
                                                    <td className="px-4 py-4 text-sm text-zinc-300">{order.size}</td>
                                                    <td className="px-4 py-4 text-sm text-zinc-300">{order.quantity}</td>
                                                    <td className="px-4 py-4 text-sm text-zinc-300 font-bold">
                                                        R$ {(order.price || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                                                    <td className="px-4 py-4 text-sm text-zinc-400 font-mono">{formatDate(order.createdAt)}</td>
                                                    <td className="px-4 py-4">
                                                        {order.status === 'pending' && (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCheckStatus(order, e.currentTarget);
                                                                    }}
                                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                                                                >
                                                                    Verificar
                                                                </button>
                                                                {order.paymentId && (
                                                                     <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                                        <Clock size={10} /> Auto. em ~10min
                                                                     </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeView === 'history' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setActiveView('current')}
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-xl font-bold text-white">Histórico de Lotes</h2>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                            {batches.length === 0 ? (
                                <div className="p-12 text-center">
                                    <History size={48} className="mx-auto text-zinc-700 mb-4" />
                                    <p className="text-zinc-500 font-bold">Nenhum lote finalizado ainda</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full">
                                        <thead className="bg-zinc-800/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Lote</th>
                                                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Data</th>
                                                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Pedidos</th>
                                                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Camisas</th>
                                                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Receita</th>
                                                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-zinc-500">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {batches.map((batch) => (
                                                <tr 
                                                    key={batch.id} 
                                                    className="hover:bg-zinc-800/30 transition-colors group"
                                                >
                                                    <td className="px-6 py-4 text-sm font-bold text-white">{batch.batchId}</td>
                                                    <td className="px-6 py-4 text-sm text-zinc-400">{batch.completedAt?.toDate ? batch.completedAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm text-zinc-400">{batch.totalOrders}</td>
                                                    <td className="px-6 py-4 text-sm text-zinc-400">{batch.totalQuantity}</td>
                                                    <td className="px-6 py-4 text-sm text-emerald-400 font-bold">
                                                        R$ {(batch.totalRevenue || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedBatch(batch);
                                                                setActiveView('batch_details');
                                                            }}
                                                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all group-hover:scale-105"
                                                        >
                                                            Detalhes
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'batch_details' && selectedBatch && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setActiveView('history')}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Pedidos - {selectedBatch.batchId}</h2>
                                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
                                        {selectedBatch.totalOrders} pedidos • {selectedBatch.totalQuantity} camisas • R$ {(selectedBatch.totalRevenue || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleExportPDF(selectedBatch, batchOrders)}
                                disabled={isBatchLoading || batchOrders.length === 0}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Send size={18} />
                                Exportar PDF de Entrega
                            </button>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por nome..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full">
                                    <thead className="bg-zinc-800/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Nome</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Modelo</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-500">WhatsApp</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Cor</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Tamanho</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-500">Valor</th>
                                            <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-zinc-500">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {isBatchLoading ? (
                                            <tr>
                                                <td colSpan={8} className="py-20 text-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                                                    <p className="text-zinc-500 font-bold">Carregando pedidos...</p>
                                                </td>
                                            </tr>
                                        ) : batchOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-20 text-center text-zinc-500 font-bold">
                                                    Nenhum pedido encontrado neste lote.
                                                </td>
                                            </tr>
                                        ) : (() => {
                                            const filtered = batchOrders.filter(o => 
                                                (o.name || '').toLowerCase().includes(searchTerm.toLowerCase())
                                            );
                                            return filtered.map((order) => (
                                                <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                                                    <td className="py-4 px-4 text-white font-bold">{order.name}</td>
                                                    <td className="py-4 px-4 text-zinc-400 text-sm">{order.model}</td>
                                                    <td className="py-4 px-4">
                                                        {order.phone ? (
                                                            <a href={`https://wa.me/55${order.phone.replace(/\D/g, '')}`} target="_blank" className="text-emerald-400 hover:underline font-bold text-sm">
                                                                {order.phone}
                                                            </a>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="py-4 px-4 text-zinc-400 text-sm capitalize">{order.color}</td>
                                                    <td className="py-4 px-4 text-zinc-400 text-sm">{order.size} (x{order.quantity})</td>
                                                    <td className="py-4 px-4 text-sm">
                                                        <span className={`px-2 py-1 rounded-lg font-black text-[10px] uppercase ${
                                                            order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                            {order.status === 'delivered' ? 'Entregue' : 'Pago'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-white font-bold text-sm">R$ {(order.price || 0).toFixed(2)}</td>
                                                    <td className="py-4 px-4 text-right">
                                                        {order.status === 'approved' && (
                                                            <button 
                                                                onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                                                                title="Marcar como entregue"
                                                            >
                                                                <Truck size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                <Send className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Fazer Pedido</h3>
                                <p className="text-zinc-400 text-sm">Copie o resumo e envie para a confecção</p>
                            </div>
                        </div>

                        <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                                {generateOrderSummary()}
                            </pre>
                        </div>

                        <button
                            onClick={handleCopyToClipboard}
                            className="w-full py-3 mb-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {copied ? '✓ Copiado!' : '📋 Copiar Resumo'}
                        </button>

                        <hr className="border-zinc-700 my-4" />

                        <p className="text-sm text-zinc-400 mb-4 text-center">
                            Após enviar o pedido para confecção, clique abaixo para iniciar um novo lote.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCompleteBatch}
                                disabled={isCompleting}
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
                            >
                                {isCompleting ? 'Finalizando...' : 'Finalizar Lote'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Edit Order Modal */}
            <AnimatePresence>
                {editingOrder && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[95vh]"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Edit2 size={24} className="text-primary" />
                                    </div>
                                    Editar Pedido
                                </h3>
                                <button
                                    onClick={() => setEditingOrder(null)}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Nome do Cliente</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingOrder.name}
                                        onChange={(e) => setEditingOrder({ ...editingOrder, name: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">WhatsApp</label>
                                    <input
                                        type="tel"
                                        required
                                        value={editingOrder.phone || ''}
                                        onChange={(e) => setEditingOrder({ ...editingOrder, phone: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Tamanho</label>
                                    <select
                                        value={editingOrder.size}
                                        onChange={(e) => setEditingOrder({ ...editingOrder, size: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        {['P', 'M', 'G', 'GG', 'XG'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Cor</label>
                                    <select
                                        value={editingOrder.color}
                                        onChange={(e) => setEditingOrder({ ...editingOrder, color: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="preta">Preta</option>
                                        <option value="branca">Branca</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={editingOrder.quantity}
                                        onChange={(e) => setEditingOrder({ ...editingOrder, quantity: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>

                                <div className="md:col-span-2 pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingOrder(null)}
                                        className="flex-1 py-4 bg-zinc-800 text-zinc-300 font-black rounded-2xl uppercase tracking-widest hover:bg-zinc-700 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 bg-primary text-white font-black rounded-2xl uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                                    >
                                        <Save size={20} /> Salvar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
