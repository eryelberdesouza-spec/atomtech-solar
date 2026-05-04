# Atom Tech Solar — Sistema de Propostas Fotovoltaicas

Sistema interno para geração de propostas comerciais fotovoltaicas profissionais.

---

## 🏗️ Arquitetura

```
atomtech-solar/
├── apps/
│   ├── api/                   ← Backend Node.js + Express + tRPC
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/    ← Drizzle ORM schema (MySQL)
│   │   │   │   ├── seed.ts    ← Dados iniciais Atom Tech
│   │   │   │   └── index.ts   ← Conexão com banco
│   │   │   ├── engines/
│   │   │   │   ├── sizing.engine.ts    ← Dimensionamento técnico
│   │   │   │   ├── financial.engine.ts ← VPL, TIR, Payback, Fluxo de Caixa
│   │   │   │   ├── pricing.engine.ts   ← Precificação com margem
│   │   │   │   └── payment.engine.ts   ← Condições comerciais estruturadas
│   │   │   ├── routers/
│   │   │   │   ├── empresa.router.ts
│   │   │   │   ├── cliente.router.ts
│   │   │   │   ├── fatura.router.ts
│   │   │   │   ├── proposta.router.ts  ← Motor principal
│   │   │   │   ├── premissas.router.ts
│   │   │   │   ├── calculo.router.ts   ← Preview em tempo real
│   │   │   │   └── pdf.router.ts       ← Geração via Puppeteer
│   │   │   ├── templates/
│   │   │   │   └── proposta.template.ts ← HTML → PDF
│   │   │   └── index.ts       ← Express server
│   │   └── drizzle.config.ts
│   │
│   └── web/                   ← Frontend React + Vite + Tailwind
│       └── src/
│           ├── lib/
│           │   ├── trpc.ts    ← Client tRPC type-safe
│           │   └── utils.ts   ← Formatadores, helpers
│           └── pages/
│               └── proposals/
│                   └── NovaProposta.tsx ← Wizard de criação
│
└── packages/
    └── shared/                ← Tipos TypeScript compartilhados
        └── src/index.ts       ← Todos os tipos de domínio
```

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- MySQL 8+
- npm 9+

### 1. Clonar e instalar dependências

```bash
git clone <repo>
cd atomtech-solar
npm install
```

### 2. Configurar banco de dados

```bash
# Criar banco MySQL
mysql -u root -p
CREATE DATABASE atomtech_solar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3. Configurar variáveis de ambiente

```bash
cd apps/api
cp .env.example .env
# Edite .env com suas configurações:
# DATABASE_URL=mysql://root:sua_senha@localhost:3306/atomtech_solar
```

### 4. Criar tabelas e dados iniciais

```bash
# Da raiz do projeto:
npm run db:push    # Cria as tabelas
npm run db:seed    # Insere dados da Atom Tech
```

### 5. Iniciar o sistema

```bash
# Ambos simultaneamente:
npm run dev

# Ou separados:
npm run dev:api    # API em http://localhost:3001
npm run dev:web    # Frontend em http://localhost:5173
```

---

## 📊 Motores de Cálculo

### Dimensionamento Técnico (`sizing.engine.ts`)

**Fórmula base:**
```
P_kWp = Consumo_mensal_kWh / (H_sol_dia × PR × 30)
```

Onde:
- `H_sol_dia` = Irradiação solar média diária (Atlas INPE 2017, ajustada por azimute e inclinação)
- `PR` = Performance Ratio (taxa de desempenho por topologia: 77% / 78,5% / 80%)

Com sobredimensionamento de 50% aplicado automaticamente.

### Motor Financeiro (`financial.engine.ts`)

Calcula em horizonte de 25 anos:
- **Fluxo de Caixa**: geração anual × tarifa crescente (9,5% a.a.) - custos
- **Payback Simples**: mês em que o saldo acumulado torna-se positivo
- **VPL**: fluxos descontados a 12% a.a.
- **TIR**: Newton-Raphson sobre os fluxos líquidos

### Precificação (`pricing.engine.ts`)

Dois métodos configuráveis:
- **Margem sobre custo** (markup): `preço = custo × (1 + margem%)`
- **Margem sobre venda**: `preço = custo / (1 - margem%)`

### Condições Comerciais (`payment.engine.ts`)

Formas de pagamento são **entidades estruturadas**, não texto solto:
- À vista
- Parcelado por marcos (50% / 20% / 20% / 10%)
- Financiamento (Tabela Price, 1,49% a.m.)
- Cartão de crédito

---

## 🗄️ Banco de Dados — Decisões de Design

### Premissas como Snapshot Imutável

**Problema**: Se as premissas globais mudarem após a proposta ser emitida, os cálculos históricos mudariam.

**Solução**: No momento da criação de cada proposta, copiamos as premissas atuais para a tabela `premissas_snapshot`. O cálculo de qualquer proposta sempre usa o snapshot, nunca as premissas globais.

### Dados Bancários nunca Hardcoded

Os dados bancários são carregados da tabela `empresa` no momento de geração das condições comerciais e salvos em `parcela_pagamento.dados_bancarios_json` como snapshot.

### Status da Proposta

| Status | Descrição |
|--------|-----------|
| `rascunho` | Em edição, não enviada |
| `enviada` | Enviada ao cliente |
| `aceita` | Cliente aceitou |
| `recusada` | Cliente recusou |
| `expirada` | Passou da data de validade |

---

## 🔌 API tRPC — Exemplos de Uso

### Frontend (React)

```typescript
// Criar proposta
const { mutateAsync } = trpc.proposta.create.useMutation()
const result = await mutateAsync({
  clienteId: 1,
  faturaId: 1,
  topologia: 'microinversor',
  tipoTelhado: 'ceramico',
  custoKitFotovoltaico: 18500,
  dataEmissao: '2026-04-16',
})
// → { propostaId: 47, numero: 'AT-2026-0047', ok: true }

// Cálculo em tempo real (sem salvar)
const sizing = trpc.calculo.sizing.useQuery({
  consumoMensalKwh: [1275, 1731, 1653],
  tarifaMediaKwh: 1.0684,
  cip: 150.60,
  topologia: 'microinversor',
  tipoTelhado: 'ceramico',
  desvioAzimutal: 0,
  inclinacaoGraus: 20,
})
// → { potenciaFinalKwp: 12.5, quantidadeModulosAproximada: 21, ... }

// Gerar PDF
const pdf = trpc.pdf.generate.useMutation()
const { base64, nomeArquivo } = await pdf.mutateAsync({ propostaId: 47 })
```

---

## 📋 Próximas Etapas (Sprint Backlog)

- [ ] Autenticação JWT com refresh token
- [ ] Upload de logo via multipart/form-data
- [ ] Importação automática de fatura via OCR/PDF parse
- [ ] Edição inline de blocos com rich text
- [ ] Dashboard com gráficos Recharts
- [ ] Envio da proposta por e-mail (template HTML)
- [ ] Assinatura digital (DocuSign / SignNow)
- [ ] Multi-tenant (múltiplas empresas)
- [ ] Cache Redis para cálculos pesados
- [ ] CI/CD com GitHub Actions
- [ ] Deploy Docker + Nginx

---

## 🎨 Identidade Visual

| Token | Valor |
|-------|-------|
| Cor Primária | `#F5A623` (amarelo solar) |
| Cor Secundária | `#2D9C4E` (verde) |
| Cor Dark | `#0E2040` (azul escuro) |
| Fonte | DM Sans + DM Mono |

---

**Atom Tech — Energia Solar e Tecnologia**  
Brasília/DF · contato@atomtech.tec.br · (61) 9805-0301
