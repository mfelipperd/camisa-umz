// Script para criar um produto de teste de R$ 1,00
// Execute com: npx ts-node scripts/createTestProduct.ts

import * as admin from 'firebase-admin';

// Inicializa com credenciais do projeto
admin.initializeApp({
    projectId: 'camisa-umz'
});

const db = admin.firestore();

async function createTestOrder() {
    console.log('Criando pedido de teste de R$ 1,00...\n');
    
    // Get current batch
    const configDoc = await db.collection('config').doc('currentBatch').get();
    const currentBatchId = configDoc.exists ? configDoc.data()?.batchId || 'batch_1' : 'batch_1';
    
    const testOrder = {
        name: 'Teste Sistema',
        model: 'Camisa Standard',
        size: 'M',
        color: 'preta',
        gender: 'masculino',
        quantity: 1,
        price: 1.00,
        status: 'approved', // Já aprovado para aparecer na lista
        batchId: currentBatchId,
        paymentId: `test_${Date.now()}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paidAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('orders').add(testOrder);
    console.log(`✅ Pedido de teste criado com ID: ${docRef.id}`);
    console.log(`   Nome: ${testOrder.name}`);
    console.log(`   Modelo: ${testOrder.model}`);
    console.log(`   Tamanho: ${testOrder.size}`);
    console.log(`   Cor: ${testOrder.color}`);
    console.log(`   Valor: R$ ${testOrder.price.toFixed(2)}`);
    console.log(`   Lote: ${testOrder.batchId}`);
    console.log(`   Status: ${testOrder.status}`);
    
    process.exit(0);
}

createTestOrder().catch(console.error);
