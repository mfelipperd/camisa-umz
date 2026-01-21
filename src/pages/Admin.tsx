import React, { useState, useEffect, Fragment } from 'react';
import { useAllOrders, type AdminOrder } from '../hooks/useAllOrders';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Package, DollarSign, Users, CheckCircle, Clock, XCircle, LogOut, History, Send, Truck, Edit2, Save, X } from 'lucide-react';
import { db, appCheck } from '../lib/firebase';
import { getToken } from 'firebase/app-check';
import { doc, collection, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'admin123';

interface Batch {
    id: string;
    batchId: string;
    completedAt: any;
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
}

export function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
    const [currentBatchId, setCurrentBatchId] = useState<string>('batch_1');
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isCompleting, setIsCompleting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
    const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [copied, setCopied] = useState(false);
    const [editingOrder, setEditingOrder] = useState<AdminOrder | null>(null);
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
        const appCheckTokenResponse = appCheck ? await getToken(appCheck) : null;
        const appCheckToken = appCheckTokenResponse?.token;

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

    const handleMarkAsDelivered = async (orderId: string) => {
        setDeliveringOrderId(orderId);
        try {
            await updateOrder(orderId, {
                status: 'delivered',
                deliveredAt: serverTimestamp()
            });
            setExpandedOrderId(orderId);
            // Hide confirmation after 3 seconds
            setTimeout(() => setExpandedOrderId(null), 3000);
        } catch (error) {
            console.error("Error updating delivery status:", error);
            alert("Erro ao confirmar entrega");
        } finally {
            setDeliveringOrderId(null);
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
                        onClick={() => setActiveTab('current')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-200 ${
                            activeTab === 'current' 
                                ? 'bg-white text-zinc-950 shadow-lg' 
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Package size={16} className="inline mr-2" />
                        Lote Atual
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-200 ${
                            activeTab === 'history' 
                                ? 'bg-white text-zinc-950 shadow-lg' 
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <History size={16} className="inline mr-2" />
                        Histórico
                    </button>
                </div>

                {activeTab === 'current' ? (
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
                                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Mod.</th>
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
                                                    <td className="px-4 py-4 text-sm text-zinc-300 capitalize">{order.gender || '-'}</td>
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
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCheckStatus(order, e.currentTarget);
                                                                }}
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                                                            >
                                                                Verificar
                                                            </button>
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
                ) : (
                    /* History Tab */
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800">
                            <h2 className="text-lg font-semibold">Histórico de Lotes</h2>
                        </div>

                        {batches.length === 0 ? (
                            <div className="p-8 text-center text-zinc-400">Nenhum lote finalizado ainda</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-zinc-800/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Lote</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Data</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Pedidos</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Camisas</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Receita</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {batches.map((batch) => (
                                            <tr 
                                                key={batch.id} 
                                                className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                                                onClick={() => setSelectedBatch(batch)}
                                            >
                                                <td className="px-4 py-4 text-sm font-medium text-white">{batch.batchId}</td>
                                                <td className="px-4 py-4 text-sm text-zinc-300">{formatDate(batch.completedAt)}</td>
                                                <td className="px-4 py-4 text-sm text-zinc-300">{batch.totalOrders}</td>
                                                <td className="px-4 py-4 text-sm text-zinc-300">{batch.totalQuantity}</td>
                                                <td className="px-4 py-4 text-sm text-emerald-400 font-medium">
                                                    R$ {(batch.totalRevenue || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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

            {/* Batch Detail Modal */}
            {selectedBatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">Pedidos - {selectedBatch.batchId}</h3>
                                <p className="text-zinc-400 text-sm">
                                    {selectedBatch.totalOrders} pedidos • {selectedBatch.totalQuantity} camisas • R$ {(selectedBatch.totalRevenue || 0).toFixed(2)}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedBatch(null);
                                    setSearchTerm('');
                                }}
                                className="text-zinc-400 hover:text-white transition-colors p-2"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent outline-none transition-all"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-auto flex-1 custom-scrollbar px-1">
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <table className="w-full">
                                    <thead className="bg-zinc-800/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Nome</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Modelo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Mod.</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Cor</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Tamanho</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Valor</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {orders
                                            .filter(o => o.batchId === selectedBatch.batchId)
                                            .filter(o => o.status === 'approved' || o.status === 'delivered')
                                            .filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((order) => (
                                                <Fragment key={order.id}>
                                                    <tr className="hover:bg-zinc-800/30 transition-colors">
                                                        <td className="px-4 py-4 text-sm font-medium text-white">{order.name}</td>
                                                        <td className="px-4 py-4 text-sm text-zinc-300">{order.model}</td>
                                                        <td className="px-4 py-4 text-sm text-zinc-300 capitalize">{order.gender || '-'}</td>
                                                        <td className="px-4 py-4 text-sm text-zinc-300 capitalize">{order.color || '-'}</td>
                                                        <td className="px-4 py-4 text-sm text-zinc-300">{order.size} (x{order.quantity})</td>
                                                        <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                                                        <td className="px-4 py-4 text-sm text-zinc-300">
                                                            R$ {(order.price || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {order.status === 'pending' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCheckStatus(order, e.currentTarget);
                                                                }}
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all mr-2"
                                                            >
                                                                Verificar
                                                                </button>
                                                            )}
                                                            {order.status === 'approved' && (
                                                                <div className="flex flex-col gap-2">
                                                                    {confirmingOrderId === order.id ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleMarkAsDelivered(order.id);
                                                                                    setConfirmingOrderId(null);
                                                                                }}
                                                                                disabled={deliveringOrderId === order.id}
                                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all"
                                                                            >
                                                                                Confirmar?
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setConfirmingOrderId(null)}
                                                                                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium rounded-lg transition-all"
                                                                            >
                                                                                Cancelar
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setConfirmingOrderId(order.id)}
                                                                            disabled={deliveringOrderId === order.id}
                                                                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg border border-zinc-700 transition-all disabled:opacity-50"
                                                                        >
                                                                            {deliveringOrderId === order.id ? (
                                                                                'Processando...'
                                                                            ) : (
                                                                                <>
                                                                                    <Truck size={14} /> Marcar Entregue
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {order.status === 'delivered' && (
                                                                <span className="text-xs text-zinc-500 italic">
                                                                    Entregue em {formatDate(order.deliveredAt)}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {/* Expanded row for confirmation */}
                                                    {expandedOrderId === order.id && (
                                                        <tr>
                                                            <td colSpan={8} className="px-4 py-0">
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="py-3 px-4 bg-emerald-500/10 border-x border-b border-emerald-500/20 rounded-b-lg mb-2 flex items-center gap-2 text-emerald-400 text-sm">
                                                                        <CheckCircle size={16} />
                                                                        Entrega confirmada com sucesso!
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4 pt-2">
                                {orders
                                    .filter(o => o.batchId === selectedBatch.batchId)
                                    .filter(o => o.status === 'approved' || o.status === 'delivered')
                                    .filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((order) => (
                                        <div key={order.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-white font-bold truncate">{order.name}</p>
                                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                                        {order.model} • {order.gender} • {order.size}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {getStatusBadge(order.status)}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-sm py-2 border-t border-zinc-700/30">
                                                <span className="text-zinc-400">Quantidade: <b className="text-white">{order.quantity}</b></span>
                                                <span className="text-zinc-400">Total: <b className="text-white">R$ {(order.price || 0).toFixed(2)}</b></span>
                                            </div>

                                            <div className="pt-2">
                                                {order.status === 'pending' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCheckStatus(order, e.currentTarget);
                                                        }}
                                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-lg shadow-blue-500/20 mb-2"
                                                    >
                                                        Verificar Status
                                                    </button>
                                                )}
                                                {order.status === 'approved' && (
                                                    <div className="w-full">
                                                        {confirmingOrderId === order.id ? (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        handleMarkAsDelivered(order.id);
                                                                        setConfirmingOrderId(null);
                                                                    }}
                                                                    disabled={deliveringOrderId === order.id}
                                                                    className="w-full py-3 bg-emerald-600 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                                                                >
                                                                    Confirmar
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmingOrderId(null)}
                                                                    className="w-full py-3 bg-zinc-700 text-zinc-300 text-xs font-black rounded-xl uppercase tracking-wider"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmingOrderId(order.id)}
                                                                disabled={deliveringOrderId === order.id}
                                                                className="w-full py-3 bg-zinc-800 text-zinc-300 font-black text-xs rounded-xl border border-zinc-700 flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all"
                                                            >
                                                                <Truck size={14} className="text-primary" /> Marcar Entregue
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {order.status === 'delivered' && (
                                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
                                                        <p className="text-[10px] text-zinc-500 italic uppercase font-bold tracking-widest">
                                                            Entregue em {formatDate(order.deliveredAt)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {orders
                                    .filter(o => o.batchId === selectedBatch.batchId)
                                    .filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                    <div className="py-12 text-center">
                                        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users size={24} className="text-zinc-600" />
                                        </div>
                                        <p className="text-zinc-500 font-bold">Nenhum pedido encontrado</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            <button
                                onClick={() => setSelectedBatch(null)}
                                className="w-full py-3 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors"
                            >
                                Fechar
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
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1">Gênero</label>
                                    <select
                                        value={editingOrder.gender}
                                        onChange={(e) => setEditingOrder({ ...editingOrder, gender: e.target.value as any })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="masculino">Masculino</option>
                                        <option value="feminino">Feminino</option>
                                    </select>
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
