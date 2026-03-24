const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

exports.yampiWebhook = functions.https.onRequest({
    invoker: "public",
}, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    try {
        const body = req.body;
        const pedido = body.resource || body;
        const status = (pedido.status?.value || pedido.status || "").toLowerCase();
        const cupomRaw = pedido.coupon?.code || pedido.coupon || "";
        const valorTotal = parseFloat(pedido.total || pedido.value || 0);
        const numeroPedido = pedido.number || pedido.id || Date.now();
        const dataPedido = pedido.created_at || new Date().toISOString();

        // 1. Filtro de Status
        const statusPagos = ["pago", "paid", "approved", "shipped", "delivered"];
        if (!statusPagos.some(s => status.includes(s))) {
            return res.status(200).send("Evento ignorado: status não é pago");
        }

        // 2. Filtro de Cupom
        if (!cupomRaw) return res.status(200).send("Pedido sem cupom, ignorado");

        const handle = cupomRaw.toUpperCase(); // Padronizando para Maiúsculas como no CSV
        const mes = dataPedido.substring(0, 7);
        const docId = `${handle}_${mes}`;
        
        // ALTERADO: Nova coleção vendas_cupons
        const cuponsRef = db.collection("vendas_cupons").doc(idUnico);

        // 3. Transação: Acumula receita e calcula ROI3 sobre 555 (185 * 3)
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(cuponsRef);
            
            const investimentoFixo = 555; // NOVO CUSTO: 185 * 3
            const metaROI = 3.0;
            
            let dadosAcumulados = {
                cupom: handle,
                mes: mes,
                vendas: 1,
                receita: valorTotal,
                meta: metaROI
            };

            if (doc.exists) {
                const data = doc.data();
                dadosAcumulados.vendas = (data.vendas || 0) + 1;
                dadosAcumulados.receita = parseFloat(((data.receita || 0) + valorTotal).toFixed(2));
            }

            // Novo Cálculo do ROI3: Receita / 555
            const novoRoi3 = dadosAcumulados.receita / investimentoFixo;
            const percentualProgresso = Math.min((novoRoi3 / metaROI) * 100, 100);

            transaction.set(cuponsRef, {
                ...dadosAcumulados,
                roi3: parseFloat(novoRoi3.toFixed(2)),
                progresso: parseFloat(percentualProgresso.toFixed(2)),
                "bateu Meta": novoRoi3 >= metaROI, // Nome exato usado no script
                ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });

        // 4. Histórico individual
        await db.collection("pedidos").doc(String(numeroPedido)).set({
            numeroPedido,
            handle,
            valorTotal,
            status,
            dataPedido,
            mes,
            criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Webhook La Ganexa: Cupom ${handle} atualizado na coleção vendas_cupons`);
        return res.status(200).send("Webhook processado com sucesso");

    } catch (e) {
        console.error("Erro no processamento da Yampi:", e);
        return res.status(500).send("Erro interno no servidor");
    }
});