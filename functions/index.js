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
        const status = pedido.status?.value || pedido.status || "";
        const cupom = pedido.coupon?.code || pedido.coupon || "";
        const valorTotal = parseFloat(pedido.total || pedido.value || 0);
        const numeroPedido = pedido.number || pedido.id || Date.now();
        const dataPedido = pedido.created_at || new Date().toISOString();

        if (!status.toLowerCase().includes("pago") &&
            !status.toLowerCase().includes("paid") &&
            !status.toLowerCase().includes("approved")) {
            return res.status(200).send("Evento ignorado: status não é pago");
        }

        if (!cupom) return res.status(200).send("Pedido sem cupom, ignorado");

        const cupomLower = cupom.toLowerCase();
        const mes = dataPedido.substring(0, 7);
        const roi3Ref = db.collection("roi3").doc(`${cupomLower}_${mes}`);
        const roi3Doc = await roi3Ref.get();

        if (roi3Doc.exists) {
            const data = roi3Doc.data();
            const novasVendas = (data.vendas || 0) + 1;
            const novaReceita = (data.receita || 0) + valorTotal;
            const novoRoi3 = novaReceita / 185;
            await roi3Ref.update({
                vendas: novasVendas,
                receita: novaReceita,
                roi3: parseFloat(novoRoi3.toFixed(2)),
                bateuMeta: novoRoi3 >= 3.0,
                ultimaAtualizacao: new Date().toISOString(),
            });
        } else {
            const novoRoi3 = valorTotal / 185;
            await roi3Ref.set({
                cupom: cupomLower,
                mes,
                vendas: 1,
                receita: valorTotal,
                roi3: parseFloat(novoRoi3.toFixed(2)),
                meta: 3.0,
                bateuMeta: novoRoi3 >= 3.0,
                ultimaAtualizacao: new Date().toISOString(),
            });
        }

        await db.collection("pedidos").doc(String(numeroPedido)).set({
            numeroPedido,
            cupom: cupomLower,
            valorTotal,
            status,
            dataPedido,
            mes,
            criadoEm: new Date().toISOString(),
        });

        console.log(`✅ Pedido ${numeroPedido} — cupom: ${cupom} — R$${valorTotal}`);
        return res.status(200).send("OK");

    } catch (e) {
        console.error("Erro Yampi:", e);
        return res.status(500).send("Erro interno");
    }
});
