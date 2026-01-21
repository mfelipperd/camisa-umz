// Script para limpar dados do Firestore
// Execute com: npx ts-node scripts/clearData.ts

import * as admin from 'firebase-admin';

// Inicializa com credenciais do projeto
admin.initializeApp({
    projectId: 'camisa-umz'
});

const db = admin.firestore();

async function clearCollection(collectionName: string) {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
        console.log(`Collection ${collectionName} is empty`);
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
}

async function main() {
    console.log('Clearing Firestore data...\n');
    
    await clearCollection('orders');
    await clearCollection('batches');
    await clearCollection('config');
    
    console.log('\n✅ All data cleared!');
    process.exit(0);
}

main().catch(console.error);
