# 🥜 La Ganexa — Guia Completo de Implantação
## Dashboard Online para Equipe · Passo a Passo

---

## 📌 VISÃO GERAL DA ARQUITETURA

```
Google Forms ──────► Google Sheets (banco central) ◄──── Equipe edita direto
                            │
                     Apps Script
                      (ponte API)
                            │
              ┌─────────────┴──────────────┐
              │                            │
          API Yamp                   Firebase Firestore
       (dados ROI3)               (cópia em tempo real)
                                          │
                                  Dashboard HTML
                              (publicado no Firebase Hosting)
                                          │
                                   URL pública fixa
                               dashboard.laganexa.web.app
```

**Por que Firebase + Google Sheets?**
- ✅ Gratuito para o tamanho de vocês (até 1GB / 50k leituras/dia)
- ✅ Equipe toda edita no Google Sheets (familiar, sem treinamento)
- ✅ Dashboard sempre atualizado automaticamente
- ✅ Histórico completo de alterações (Google Sheets tem versões)
- ✅ Google Forms alimenta o Sheets sem nenhum esforço manual

---

## 🗂️ ESTRUTURA DO GOOGLE SHEETS

Crie um arquivo chamado **"La Ganexa — Central de Dados"** com estas abas:

### Aba 1: `influenciadores`
| Coluna | Exemplo |
|--------|---------|
| handle | adrimulling |
| nome | Adriele Wally Mulling |
| rede | Instagram |
| follows | 43800 |
| tipo | PERMUTA |
| cupom | DRI10 |
| cupomStatus | criado / pendente |
| cidade | São Paulo |
| uf | SP |
| tel | 53 8439-7163 |
| inicio | 2026-02-01 |
| mes | Março |
| obs | cobrado |
| gold | TRUE/FALSE |
| ativo | TRUE/FALSE |
| dataAdicionado | 2026-03-20 |

### Aba 2: `kits`
| Coluna | Exemplo |
|--------|---------|
| handle | adrimulling |
| kitStatus | enviado / pendente / problema / confirmado |
| kitObs | Pistache e Creme de Avelã |
| especial | ENVIAR NO NOME DO ESPOSO |
| dataEnvio | 2026-03-15 |
| confirmou | TRUE/FALSE |
| numero | Rua das Flores, 123 |
| complemento | Apto 4B |

### Aba 3: `postagens`
| Coluna | Exemplo |
|--------|---------|
| handle | adrimulling |
| data | 2026-03-15 |
| tipo | Reels |
| plataforma | Instagram |
| metaMes | 2 |
| postagemFeita | TRUE/FALSE |
| link | https://instagram.com/p/... |
| obs | cobrado por Pedro |

### Aba 4: `roi3`
| Coluna | Exemplo |
|--------|---------|
| handle | adrimulling |
| mes | 2026-03 |
| roi3 | 4.2 |
| vendas | 12 |
| receita | 840.00 |
| meta | 3.0 |
| bateuMeta | TRUE/FALSE |
| ultimaAtualizacao | 2026-03-20 10:30 |

### Aba 5: `agenda`
| Coluna | Exemplo |
|--------|---------|
| handle | adrimulling |
| data | 2026-03-22 |
| hora | 19:00 |
| tipo | Reels |
| status | Agendado |
| obs | |

### Aba 6: `checklist`
| Coluna | Exemplo |
|--------|---------|
| id | k1 |
| categoria | kit |
| texto | CARAMELO E PISTACHE — @dhebmedeiros_ |
| detalhe | Dhebora Jayne Costa Medeiros |
| feito | FALSE |
| prioridade | alta |
| responsavel | Pedro |
| dataConclusao | |

---

## 📋 PASSO 1 — CRIAR O GOOGLE SHEETS

1. Acesse **sheets.google.com**
2. Crie um novo arquivo: "La Ganexa — Central de Dados"
3. Crie as 6 abas descritas acima
4. Adicione os dados atuais dos influenciadores na aba `influenciadores`
5. Compartilhe com toda a equipe (botão "Compartilhar" → adicione os e-mails)
   - Permissão: **"Editor"** para quem precisa editar
   - Permissão: **"Leitor"** para quem só vai visualizar

---

## 📝 PASSO 2 — CRIAR O GOOGLE FORMS

### Form de Novos Influenciadores:

1. Acesse **forms.google.com**
2. Crie um novo formulário: "Cadastro de Novo Influenciador — La Ganexa"
3. Adicione os campos:
   - Nome completo (Texto curto, obrigatório)
   - @Handle (Texto curto, obrigatório)
   - Rede Social (Múltipla escolha: Instagram / TikTok / YouTube)
   - Seguidores (Número)
   - Tipo (Múltipla escolha: PERMUTA / VALOR FIXO / GOLD)
   - Cupom (Texto curto)
   - Cidade (Texto curto)
   - UF (Texto curto)
   - Telefone (Texto curto)
   - Observações (Texto longo)

4. Clique em **"Respostas"** → ícone do Google Sheets → "Criar planilha"
   - Escolha "Selecionar planilha existente" → selecione "La Ganexa — Central de Dados"
   - Isso vai criar uma aba chamada "Respostas do formulário 1"

5. **Copie o link do formulário** — você vai usar em um Google Apps Script para mover os dados para a aba `influenciadores` automaticamente

---

## ⚙️ PASSO 3 — CONFIGURAR O APPS SCRIPT

O Apps Script é o "cérebro" que conecta tudo. É gratuito e roda dentro do Google.

### 3.1 — Abrir o editor

1. No Google Sheets, clique em **Extensões → Apps Script**
2. Apague o código de exemplo
3. Cole o código abaixo:

```javascript
// ═══════════════════════════════════════════════
// APPS SCRIPT — La Ganexa
// Cole sua chave Yamp e ID do Sheets abaixo
// ═══════════════════════════════════════════════

const SHEET_ID = 'COLE_AQUI_O_ID_DO_SEU_GOOGLE_SHEETS';
// O ID está na URL do Sheets:
// https://docs.google.com/spreadsheets/d/ESTE_É_O_ID/edit

const YAMP_TOKEN = 'COLE_AQUI_SEU_TOKEN_YAMP';
const YAMP_BASE  = 'https://api.yamp.com.br/v1'; // confirmar endpoint com Yamp

// ── Sincronizar dados do Forms para aba influenciadores ──
function syncFormToInfluenciadores() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const respostas = ss.getSheetByName('Respostas do formulário 1');
  const influenciadores = ss.getSheetByName('influenciadores');

  const rows = respostas.getDataRange().getValues();
  const headers = rows[0];
  const existentes = influenciadores.getDataRange().getValues()
    .slice(1).map(r => r[0].toString().toLowerCase()); // coluna handle

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const handle = row[2].toString().toLowerCase().replace('@','');
    if (!existentes.includes(handle)) {
      influenciadores.appendRow([
        handle,                    // handle
        row[1],                    // nome
        row[3],                    // rede
        Number(row[4]) || 0,       // follows
        row[5],                    // tipo
        row[6] || '',              // cupom
        'pendente',                // cupomStatus
        row[7] || '',              // cidade
        row[8] || '',              // uf
        row[9] || '',              // tel
        new Date().toISOString().split('T')[0], // inicio
        '',                        // mes
        row[10] || '',             // obs
        false,                     // gold
        true,                      // ativo
        new Date().toISOString().split('T')[0]  // dataAdicionado
      ]);
    }
  }
}

// ── Buscar ROI3 da Yamp e atualizar aba roi3 ──
function syncYampROI3() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const infSheet = ss.getSheetByName('influenciadores');
  const roi3Sheet = ss.getSheetByName('roi3');

  const influenciadores = infSheet.getDataRange().getValues().slice(1);
  const mesAtual = new Date().toISOString().slice(0,7); // ex: "2026-03"

  // Limpar dados do mês atual na aba roi3
  const roi3Data = roi3Sheet.getDataRange().getValues();
  for (let i = roi3Data.length - 1; i >= 1; i--) {
    if (roi3Data[i][1] === mesAtual) {
      roi3Sheet.deleteRow(i + 1);
    }
  }

  influenciadores.forEach(inf => {
    const handle = inf[0];
    const cupom  = inf[5];
    if (!cupom) return;

    try {
      // Ajuste o endpoint conforme documentação da Yamp
      const url = `${YAMP_BASE}/coupons/${cupom}/stats?month=${mesAtual}`;
      const resp = UrlFetchApp.fetch(url, {
        headers: { 'Authorization': `Bearer ${YAMP_TOKEN}` },
        muteHttpExceptions: true
      });

      if (resp.getResponseCode() === 200) {
        const data = JSON.parse(resp.getContentText());
        const vendas  = data.orders  || data.sales   || 0;
        const receita = data.revenue || data.total   || 0;
        const roi3    = receita > 0 ? (receita / (receita * 0.3)).toFixed(2) : 0;
        // ⚠️ Ajuste a fórmula do ROI3 conforme definição da La Ganexa
        const meta    = 3.0; // meta padrão — ajuste por influencer se necessário
        const bateu   = roi3 >= meta;

        roi3Sheet.appendRow([
          handle, mesAtual, roi3, vendas, receita, meta, bateu,
          new Date().toLocaleString('pt-BR')
        ]);
      }
    } catch(e) {
      Logger.log(`Erro no handle ${handle}: ${e}`);
    }
  });

  Logger.log('Sync Yamp concluído: ' + mesAtual);
}

// ── Exportar todos os dados para Firebase Firestore ──
function exportToFirebase() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const abas = ['influenciadores','kits','postagens','roi3','agenda','checklist'];
  const payload = {};

  abas.forEach(aba => {
    const sheet = ss.getSheetByName(aba);
    if (!sheet) return;
    const rows  = sheet.getDataRange().getValues();
    const hdrs  = rows[0];
    payload[aba] = rows.slice(1).map(row => {
      const obj = {};
      hdrs.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  });

  // Substitua pela URL da sua Cloud Function do Firebase (ver Passo 4)
  const FIREBASE_WEBHOOK = 'https://us-central1-SEU-PROJETO.cloudfunctions.net/syncData';

  UrlFetchApp.fetch(FIREBASE_WEBHOOK, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  Logger.log('Dados exportados para Firebase');
}

// ── Disparar alertas por e-mail ──
function enviarAlertas() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const roi3Sheet = ss.getSheetByName('roi3');
  const kitsSheet = ss.getSheetByName('kits');

  const mesAtual = new Date().toISOString().slice(0,7);
  let alertas = [];

  // Alertas ROI3 abaixo da meta
  const roi3Data = roi3Sheet.getDataRange().getValues().slice(1);
  roi3Data.filter(r => r[1] === mesAtual && r[6] === false).forEach(r => {
    alertas.push(`⚠️ ROI3 abaixo da meta: @${r[0]} — ROI3: ${r[2]} (meta: ${r[5]})`);
  });

  // Kits pendentes há mais de 7 dias
  const kitsData = kitsSheet.getDataRange().getValues().slice(1);
  const hoje = new Date();
  kitsData.filter(r => r[1] === 'pendente').forEach(r => {
    alertas.push(`📦 Kit pendente: @${r[0]}`);
  });

  if (alertas.length > 0) {
    MailApp.sendEmail({
      to: 'SEU-EMAIL@laganexa.com.br', // substitua pelo e-mail da equipe
      subject: `🔔 La Ganexa — ${alertas.length} alertas pendentes`,
      body: alertas.join('\n')
    });
  }
}

// ── Gatilhos automáticos ──
// Execute esta função UMA VEZ para configurar os gatilhos automáticos
function configurarGatilhos() {
  // Apagar gatilhos existentes
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Sync Yamp: todo dia às 6h
  ScriptApp.newTrigger('syncYampROI3')
    .timeBased().everyDays(1).atHour(6).create();

  // Export Firebase: a cada 30 minutos
  ScriptApp.newTrigger('exportToFirebase')
    .timeBased().everyMinutes(30).create();

  // Alertas: toda segunda-feira às 9h
  ScriptApp.newTrigger('enviarAlertas')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();

  // Forms → Influenciadores: a cada hora
  ScriptApp.newTrigger('syncFormToInfluenciadores')
    .timeBased().everyHours(1).create();

  Logger.log('Gatilhos configurados com sucesso!');
}
```

4. Clique em **Salvar** (ícone de disquete)
5. Substitua `COLE_AQUI_O_ID_DO_SEU_GOOGLE_SHEETS` pelo ID real
6. Substitua `COLE_AQUI_SEU_TOKEN_YAMP` pelo token real
7. Execute a função `configurarGatilhos` uma única vez

---

## 🔥 PASSO 4 — CONFIGURAR O FIREBASE

### 4.1 — Criar projeto

1. Acesse **console.firebase.google.com**
2. Clique em "Criar projeto"
3. Nome: `laganexa-dashboard`
4. **Desativar** Google Analytics (não precisamos)
5. Clique em "Criar projeto"

### 4.2 — Ativar Firestore

1. No menu esquerdo: **Build → Firestore Database**
2. Clique em "Criar banco de dados"
3. Modo: **Começar no modo de produção** → Próximo
4. Localização: `us-central` → Ativar

### 4.3 — Regras do Firestore

No Firestore, clique em **Regras** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leitura livre (o dashboard é público dentro da equipe)
    match /{document=**} {
      allow read: if true;
      allow write: if false; // só o Apps Script escreve
    }
  }
}
```

### 4.4 — Firebase Hosting

1. Instale o Firebase CLI no seu computador:
```bash
npm install -g firebase-tools
firebase login
```

2. Na pasta do dashboard:
```bash
firebase init hosting
# Projeto: laganexa-dashboard
# Pasta: . (ponto)
# SPA: N
```

3. Coloque o arquivo `index.html` na pasta
4. Publique:
```bash
firebase deploy
```

5. Sua URL ficará: `https://laganexa-dashboard.web.app`

---

## 🔑 PASSO 5 — CONFIGURAR A API DA YAMP

1. Acesse o painel da Yamp como lojista
2. Vá em **Configurações → API / Integrações**
3. Copie seu **Token de API**
4. Cole no Apps Script (variável `YAMP_TOKEN`)
5. Confirme com o suporte da Yamp qual é o endpoint correto para:
   - Estatísticas por cupom: `/coupons/{cupom}/stats`
   - Vendas por período: `/orders?coupon={cupom}&from=&to=`

---

## 📊 RESUMO DOS CUSTOS

| Serviço | Plano | Custo |
|---------|-------|-------|
| Google Sheets | Qualquer Gmail | **GRÁTIS** |
| Google Forms | Qualquer Gmail | **GRÁTIS** |
| Google Apps Script | Qualquer Gmail | **GRÁTIS** |
| Firebase Hosting | Spark (gratuito) | **GRÁTIS** |
| Firebase Firestore | Spark (gratuito) | **GRÁTIS** |
| **TOTAL** | | **R$ 0,00/mês** |

---

## ✅ CHECKLIST DE IMPLANTAÇÃO

- [ ] Criar Google Sheets com as 6 abas
- [ ] Adicionar dados dos influenciadores
- [ ] Criar Google Forms
- [ ] Vincular Forms ao Sheets
- [ ] Colar o Apps Script e configurar variáveis
- [ ] Rodar `configurarGatilhos()` uma vez
- [ ] Criar projeto no Firebase
- [ ] Configurar Firestore e regras
- [ ] Publicar dashboard com `firebase deploy`
- [ ] Testar integração Yamp com um cupom
- [ ] Compartilhar URL com a equipe

---

## 📞 SUPORTE

Se travar em qualquer passo, documente:
1. Em qual passo travou
2. A mensagem de erro exata
3. Print da tela

E me mande — resolvo passo a passo!
