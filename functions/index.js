const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa o admin apenas uma vez
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// --- WEBHOOK YAMPI (Sua regra atual de vendas/ROI) ---
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

        const handle = cupomRaw.toLowerCase(); 
        const mes = dataPedido.substring(0, 7); // Ex: 2026-03
        const docId = `${handle}_${mes}`;
        const roi3Ref = db.collection("roi3").doc(docId);

        // 3. Transação para evitar erros de concorrência (vendas simultâneas)
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(roi3Ref);
            
            let novasVendas = 1;
            let novaReceita = valorTotal;
            const custoPorVenda = 185; // Seu valor base fixo

            if (doc.exists) {
                const data = doc.data();
                novasVendas = (data.vendas || 0) + 1;
                novaReceita = (data.receita || 0) + valorTotal;
            }

            // Cálculo do ROI: Receita Total / (Custo Fixo * Quantidade de Vendas)
            const novoRoi3 = novaReceita / (custoPorVenda * novasVendas);

            transaction.set(roi3Ref, {
                handle: handle, // Dashboard usa 'handle'
                cupom: handle,
                mes: mes,
                vendas: novasVendas,
                receita: parseFloat(novaReceita.toFixed(2)),
                roi3: parseFloat(novoRoi3.toFixed(2)),
                meta: 3.0,
                bateuMeta: novoRoi3 >= 3.0,
                ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });

        // 4. Log do Pedido Individual (Histórico)
        await db.collection("pedidos").doc(String(numeroPedido)).set({
            numeroPedido,
            handle,
            valorTotal,
            status,
            dataPedido,
            mes,
            criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).send("Webhook processado com sucesso");

    } catch (e) {
        console.error("Erro no processamento da Yampi:", e);
        return res.status(500).send("Erro interno no servidor");
    }
});
