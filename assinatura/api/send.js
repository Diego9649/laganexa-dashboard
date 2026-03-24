import { PDFDocument, StandardFonts } from 'pdf-lib';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { nome, emailInfluencer, assinatura, data } = req.body;

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 850]);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Título Centralizado
    page.drawText('TERMO DE ACEITE DE PARCERIA - LA GANEXA', { x: 120, y: 800, size: 16, font: fontBold });

    // --- CORPO DO CONTRATO ---
    const clausulas = [
      "Este termo estabelece as condições da parceria comercial entre La Ganexa Produtos Alimentícios LTDA",
      "(CNPJ 31.315.158/0001-84) e o influenciador abaixo identificado.",
      "",
      "1. NATUREZA DA PARCERIA: A parceria possui natureza exclusivamente comercial, não caracterizando",
      "vínculo empregatício, relação trabalhista, subordinação ou exclusividade.",
      "",
      "2. MODELO DE REMUNERAÇÃO: A parceria poderá ocorrer por meio de permuta de produtos e/ou",
      "comissionamento sobre vendas, calculado via cupom ou link individual.",
      "",
      "3. OBRIGAÇÃO DE POSTAGEM (PLAYBOOK): O influenciador compromete-se a cumprir:",
      "• 02 (dois) stories por semana e 01 (um) a 02 (dois) reels por mês.",
      "• Utilização correta de cupom e/ou link fornecido pela marca.",
      "",
      "4. RESSARCIMENTO POR DESCUMPRIMENTO: O não cumprimento autoriza a La Ganexa a exigir o",
      "ressarcimento integral dos produtos (custo e frete) em até 10 dias após notificação.",
      "",
      "5. CESSÃO DE DIREITO DE IMAGEM: O influenciador autoriza o uso de sua imagem, nome, voz e",
      "conteúdos produzidos para fins comerciais e promocionais da marca por tempo indeterminado.",
      "",
      "6. LIVRE RESCISÃO: A parceria poderá ser encerrada por qualquer das partes a qualquer tempo.",
      "",
      "Declaro que li e aceito todos os termos acima citados.",
      "________________________________________________________________________________"
    ];

    let y = 740;
    clausulas.forEach(linha => {
      page.drawText(linha, { x: 50, y: y, size: 10, font: fontNormal });
      y -= 18;
    });

    // --- BLOCO FINAL: ASSINATURA + NOME + DATA ---
    const startYAssinatura = y - 20;

    // 1. A Imagem da Assinatura (centralizada sobre a identificação)
    if (assinatura && assinatura.includes(',')) {
      const base64Data = assinatura.split(',')[1];
      const imgBuffer = Buffer.from(base64Data, 'base64');
      const signatureImg = await pdfDoc.embedPng(imgBuffer);
      page.drawImage(signatureImg, { x: 60, y: startYAssinatura - 60, width: 180, height: 70 });
    }

    // 2. Nome e Data no rodapé (Abaixo da assinatura gráfica)
    page.drawText(`NOME: ${nome.toUpperCase()}`, { x: 50, y: startYAssinatura - 80, size: 11, font: fontBold });
    page.drawText(`DATA DO ACEITE: ${data}`, { x: 50, y: startYAssinatura - 95, size: 11, font: fontBold });
    page.drawText(`E-MAIL: ${emailInfluencer}`, { x: 50, y: startYAssinatura - 110, size: 10, font: fontNormal });

    const pdfBytes = await pdfDoc.save();

    // --- ENVIO ---
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: 'daishonin.dl@gmail.com', pass: 'hzdo fhjs meos xeqf' }
    });

    await transporter.sendMail({
      from: '"La Ganexa" <daishonin.dl@gmail.com>',
      to: `ganexala@gmail.com, ${emailInfluencer}`,
      subject: `✅ Contrato Assinado - ${nome}`,
      attachments: [{
        filename: `contrato_${nome.replace(/\s+/g, '_')}.pdf`,
        content: Buffer.from(pdfBytes)
      }]
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("ERRO:", error.message);
    return res.status(500).json({ error: error.message });
  }
}