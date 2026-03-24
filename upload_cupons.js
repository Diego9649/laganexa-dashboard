const admin = require('firebase-admin');
const serviceAccount = require("./chave-privada.json"); // Arquivo que você baixa no console do Firebase
const dados = require("./firebase_final_v2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importarParaFirestore() {
  const batch = db.batch();
  const colecao = 'vendas_cupons'; // Nome da sua coleção

  console.log(`Iniciando importação de ${dados.length} cupons...`);

  dados.forEach((item) => {
    // Criando um ID único combinando Cupom e Mês (ex: "INICIO20_2026-03")
    // Isso evita que o mesmo cupom seja contado duas vezes no mesmo mês
    const idUnico = `${item.cupom}_${item.mes}`.replace(/\s+/g, '');
    const docRef = db.collection(colecao).doc(idUnico);
    
    batch.set(docRef, item);
  });

  try {
    await batch.commit();
    console.log("✅ Sucesso! Todos os dados foram incluídos no Firestore.");
  } catch (error) {
    console.error("❌ Erro ao importar dados:", error);
  }
}

importarParaFirestore();