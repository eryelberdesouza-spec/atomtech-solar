import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers'
import { createContext, testConnection } from './routers/trpc'
import { parseInter, parseSicoob } from './lib/extratoParser'
import { parseOFX } from './lib/ofxParser'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } })

const ALLOWED_ORIGINS = [
  'https://atomtech-solar-web.vercel.app',
  'https://atomtech-financeiro.vercel.app',
  'https://financeiro-two-mu.vercel.app',
  'https://web-seven-pi-60.vercel.app',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_FIN_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Permite qualquer porta localhost em desenvolvimento
    const isVercelPreview = origin ? /^https:\/\/[\w-]+-eryelberdesouza-specs-projects\.vercel\.app$/.test(origin) : false
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || ALLOWED_ORIGINS.includes(origin) || isVercelPreview) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static('uploads'))

app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ path, error }) {
    if (error.code !== 'NOT_FOUND' && error.code !== 'BAD_REQUEST') {
      console.error(`tRPC error em "${path}":`, error)
    }
  },
}))

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))



app.get('/run-migration-modelo-bloco', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS modelo_bloco (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id  INT NOT NULL,
        tipo_bloco  VARCHAR(60) NOT NULL,
        titulo      VARCHAR(200) NOT NULL,
        conteudo    TEXT NOT NULL,
        ativo       TINYINT(1) NOT NULL DEFAULT 1,
        ordem       INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mb_empresa_tipo (empresa_id, tipo_bloco)
      )
    `)
    await conn.end()
    res.json({ ok: true, message: 'tabela modelo_bloco pronta' })
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      res.json({ ok: true, message: 'tabela já existia' })
    } else {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})

// ── Migração Financeiro ────────────────────────────────────────────────────────
app.get('/run-migration-financeiro', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)

    const tables = [
      `CREATE TABLE IF NOT EXISTS fin_conta_bancaria (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id    INT NOT NULL,
        nome          VARCHAR(100) NOT NULL,
        tipo          ENUM('CORRENTE','POUPANCA','CAIXA') NOT NULL DEFAULT 'CORRENTE',
        banco         VARCHAR(100),
        agencia       VARCHAR(20),
        conta         VARCHAR(30),
        saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
        ativo         TINYINT(1) NOT NULL DEFAULT 1,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP NULL,
        INDEX idx_fin_conta_empresa (empresa_id)
      )`,
      `CREATE TABLE IF NOT EXISTS fin_plano_contas (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        codigo     VARCHAR(20) NOT NULL,
        nome       VARCHAR(200) NOT NULL,
        tipo       ENUM('RECEITA','DESPESA','FINANCEIRO') NOT NULL,
        pai_id     INT,
        ativo      TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_plano_empresa (empresa_id),
        INDEX idx_fin_plano_codigo (empresa_id, codigo)
      )`,
      `CREATE TABLE IF NOT EXISTS fin_centro_custo (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        codigo     VARCHAR(30) NOT NULL,
        nome       VARCHAR(150) NOT NULL,
        descricao  TEXT,
        ativo      TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_cc_empresa (empresa_id)
      )`,
      `CREATE TABLE IF NOT EXISTS fin_pessoa (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id    INT NOT NULL,
        tipo_pessoa   ENUM('FISICA','JURIDICA') NOT NULL DEFAULT 'JURIDICA',
        nome          VARCHAR(200) NOT NULL,
        fantasia      VARCHAR(200),
        cpf_cnpj      VARCHAR(18),
        email         VARCHAR(150),
        telefone      VARCHAR(20),
        is_cliente    TINYINT(1) NOT NULL DEFAULT 0,
        is_fornecedor TINYINT(1) NOT NULL DEFAULT 0,
        cep           VARCHAR(9),
        logradouro    VARCHAR(300),
        numero        VARCHAR(10),
        complemento   VARCHAR(100),
        bairro        VARCHAR(100),
        cidade        VARCHAR(100),
        estado        VARCHAR(2),
        regime        VARCHAR(30),
        observacoes   TEXT,
        ativo         TINYINT(1) NOT NULL DEFAULT 1,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP NULL,
        INDEX idx_fin_pessoa_empresa (empresa_id),
        INDEX idx_fin_pessoa_cpf (cpf_cnpj),
        INDEX idx_fin_pessoa_nome (nome)
      )`,
      `CREATE TABLE IF NOT EXISTS fin_titulo (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id       INT NOT NULL,
        tipo             ENUM('PAGAR','RECEBER') NOT NULL,
        descricao        VARCHAR(300) NOT NULL,
        documento        VARCHAR(100),
        pessoa_id        INT,
        plano_contas_id  INT,
        centro_custo_id  INT,
        proposta_id      INT,
        valor_original   DECIMAL(12,2) NOT NULL,
        emissao          DATE NOT NULL,
        observacoes      TEXT,
        ativo            TINYINT(1) NOT NULL DEFAULT 1,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP NULL,
        INDEX idx_fin_titulo_empresa (empresa_id),
        INDEX idx_fin_titulo_tipo (tipo),
        INDEX idx_fin_titulo_pessoa (pessoa_id)
      )`,
      `CREATE TABLE IF NOT EXISTS fin_parcela (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        titulo_id       INT NOT NULL,
        numero          INT NOT NULL,
        valor           DECIMAL(12,2) NOT NULL,
        vencimento      DATE NOT NULL,
        status          ENUM('ABERTA','PAGA','CANCELADA') NOT NULL DEFAULT 'ABERTA',
        data_pagamento  DATE,
        conta_id        INT,
        valor_pago      DECIMAL(12,2),
        juros           DECIMAL(12,2) DEFAULT 0,
        multa           DECIMAL(12,2) DEFAULT 0,
        desconto        DECIMAL(12,2) DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_parcela_titulo (titulo_id),
        INDEX idx_fin_parcela_venc (vencimento),
        INDEX idx_fin_parcela_status (status)
      )`,
      `CREATE TABLE IF NOT EXISTS fin_transferencia (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id       INT NOT NULL,
        conta_origem_id  INT NOT NULL,
        conta_destino_id INT NOT NULL,
        valor            DECIMAL(12,2) NOT NULL,
        data             DATE NOT NULL,
        descricao        VARCHAR(300),
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_transf_empresa (empresa_id),
        INDEX idx_fin_transf_data (data)
      )`,
    ]

    for (const sql of tables) {
      await conn.execute(sql)
    }

    // Seed: Plano de Contas padrão para empresa_id=1
    const [existing]: any = await conn.execute(
      'SELECT COUNT(*) as cnt FROM fin_plano_contas WHERE empresa_id = 1'
    )
    if (existing[0].cnt === 0) {
      const plano = [
        // RECEITAS
        [1, '1',     'RECEITAS',                      'RECEITA',    null],
        [1, '1.1',   'Vendas de Equipamentos',         'RECEITA',    null],
        [1, '1.2',   'Receita de Serviços',            'RECEITA',    null],
        [1, '1.3',   'Receita de Projetos',            'RECEITA',    null],
        [1, '1.4',   'Outras Receitas',                'RECEITA',    null],
        // DESPESAS
        [1, '2',     'DESPESAS',                       'DESPESA',    null],
        [1, '2.1',   'Pessoal / RH',                   'DESPESA',    null],
        [1, '2.1.1', 'Salários',                       'DESPESA',    null],
        [1, '2.1.2', 'Encargos (FGTS, INSS)',          'DESPESA',    null],
        [1, '2.1.3', 'Benefícios (VR, VT, Saúde)',     'DESPESA',    null],
        [1, '2.2',   'Fornecedores / Materiais',       'DESPESA',    null],
        [1, '2.2.1', 'Compra de Equipamentos',         'DESPESA',    null],
        [1, '2.2.2', 'Materiais de Instalação',        'DESPESA',    null],
        [1, '2.3',   'Serviços de Terceiros',          'DESPESA',    null],
        [1, '2.3.1', 'Subcontratados / MO terceirizada','DESPESA',   null],
        [1, '2.3.2', 'Contabilidade / Jurídico',       'DESPESA',    null],
        [1, '2.3.3', 'TI / Software',                  'DESPESA',    null],
        [1, '2.4',   'Despesas Administrativas',       'DESPESA',    null],
        [1, '2.4.1', 'Aluguel / Comodato',             'DESPESA',    null],
        [1, '2.4.2', 'Energia / Água / Internet',      'DESPESA',    null],
        [1, '2.4.3', 'Material de Escritório',         'DESPESA',    null],
        [1, '2.5',   'Despesas Comerciais',            'DESPESA',    null],
        [1, '2.5.1', 'Marketing / Publicidade',        'DESPESA',    null],
        [1, '2.5.2', 'Comissões de Vendas',            'DESPESA',    null],
        [1, '2.5.3', 'Visitas / Deslocamento',         'DESPESA',    null],
        [1, '2.6',   'Impostos e Tributos',            'DESPESA',    null],
        [1, '2.6.1', 'ISS',                            'DESPESA',    null],
        [1, '2.6.2', 'Simples Nacional / DAS',         'DESPESA',    null],
        [1, '2.6.3', 'Outros Impostos',                'DESPESA',    null],
        // FINANCEIRO
        [1, '3',     'FINANCEIRO',                     'FINANCEIRO', null],
        [1, '3.1',   'Juros Recebidos',                'FINANCEIRO', null],
        [1, '3.2',   'Juros Pagos',                    'FINANCEIRO', null],
        [1, '3.3',   'Tarifas Bancárias',              'FINANCEIRO', null],
        [1, '3.4',   'Empréstimos / Financiamentos',   'FINANCEIRO', null],
      ]

      // Inserir e mapear IDs dos pais pelo código
      const idMap: Record<string, number> = {}
      for (const [empId, codigo, nome, tipo] of plano) {
        const parentCodigo = String(codigo).split('.').slice(0, -1).join('.')
        const paiId = parentCodigo ? (idMap[String(parentCodigo)] ?? null) : null
        const [result]: any = await conn.execute(
          'INSERT INTO fin_plano_contas (empresa_id, codigo, nome, tipo, pai_id) VALUES (?, ?, ?, ?, ?)',
          [empId, codigo, nome, tipo, paiId]
        )
        idMap[String(codigo)] = result.insertId
      }
    }

    // Seed: Centros de Custo padrão
    const [existingCC]: any = await conn.execute(
      'SELECT COUNT(*) as cnt FROM fin_centro_custo WHERE empresa_id = 1'
    )
    if (existingCC[0].cnt === 0) {
      const centros = [
        [1, 'ADM', 'Administrativo',  'Despesas gerais de administração da empresa'],
        [1, 'COM', 'Comercial',       'Marketing, comissões e prospecção comercial'],
        [1, 'OPS', 'Operações',       'Custos de execução, instalação e pós-venda'],
      ]
      for (const [empId, codigo, nome, descricao] of centros) {
        await conn.execute(
          'INSERT INTO fin_centro_custo (empresa_id, codigo, nome, descricao) VALUES (?, ?, ?, ?)',
          [empId, codigo, nome, descricao]
        )
      }
    }

    await conn.end()
    res.json({ ok: true, message: 'Tabelas financeiras criadas e seed aplicado com sucesso' })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: campos bancários em fin_pessoa ──────────────────────────────────
app.get('/run-migration-fin-pessoa-banco', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)

    // Verifica se a coluna banco já existe
    const [cols]: any = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_pessoa' AND COLUMN_NAME = 'banco'`
    )

    if (cols.length === 0) {
      await conn.execute(`
        ALTER TABLE fin_pessoa
          ADD COLUMN banco          VARCHAR(100) NULL AFTER observacoes,
          ADD COLUMN tipo_pix       VARCHAR(30)  NULL AFTER banco,
          ADD COLUMN chave_pix      VARCHAR(150) NULL AFTER tipo_pix,
          ADD COLUMN tipo_pagamento VARCHAR(50)  NULL AFTER chave_pix
      `)
      await conn.end()
      res.json({ ok: true, message: 'Colunas banco/tipo_pix/chave_pix/tipo_pagamento adicionadas a fin_pessoa' })
    } else {
      await conn.end()
      res.json({ ok: true, message: 'Colunas já existiam — nenhuma alteração necessária' })
    }
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: Módulo Operacional (Ordens de Serviço) ─────────────────────────
app.get('/run-migration-os', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`ordem_servico\` (
        \`id\`                   INT          NOT NULL AUTO_INCREMENT,
        \`empresa_id\`           INT          NOT NULL,
        \`proposta_id\`          INT          NOT NULL,
        \`numero\`               VARCHAR(20)  NOT NULL UNIQUE,
        \`status\`               ENUM('aberta','em_execucao','concluida','cancelada') NOT NULL DEFAULT 'aberta',
        \`titulo\`               VARCHAR(200) NULL,
        \`descricao\`            TEXT         NULL,
        \`tecnico_responsavel\`  VARCHAR(100) NULL,
        \`data_prevista_inicio\` DATE         NULL,
        \`data_prevista_fim\`    DATE         NULL,
        \`data_inicio\`          DATE         NULL,
        \`data_conclusao\`       DATE         NULL,
        \`tem_agendamento\`      TINYINT(1)   NOT NULL DEFAULT 1,
        \`observacoes\`          TEXT         NULL,
        \`created_at\`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`           TIMESTAMP    NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_os_empresa\` (\`empresa_id\`),
        INDEX \`idx_os_proposta\` (\`proposta_id\`),
        INDEX \`idx_os_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`os_agendamento\` (
        \`id\`               INT         NOT NULL AUTO_INCREMENT,
        \`ordem_servico_id\` INT         NOT NULL,
        \`empresa_id\`       INT         NOT NULL,
        \`data_agendada\`    DATE        NOT NULL,
        \`hora_inicio\`      VARCHAR(5)  NULL,
        \`hora_fim\`         VARCHAR(5)  NULL,
        \`tipo\`             ENUM('vistoria','instalacao','manutencao','revisao','entrega') NOT NULL DEFAULT 'instalacao',
        \`tecnico\`          VARCHAR(100) NULL,
        \`endereco\`         TEXT        NULL,
        \`observacoes\`      TEXT        NULL,
        \`status\`           ENUM('agendado','confirmado','realizado','cancelado') NOT NULL DEFAULT 'agendado',
        \`created_at\`       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_agendamento_os\` (\`ordem_servico_id\`),
        INDEX \`idx_agendamento_empresa\` (\`empresa_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`os_marco\` (
        \`id\`               INT          NOT NULL AUTO_INCREMENT,
        \`ordem_servico_id\` INT          NOT NULL,
        \`titulo\`           VARCHAR(200) NOT NULL,
        \`descricao\`        TEXT         NULL,
        \`ordem\`            INT          NOT NULL DEFAULT 0,
        \`data_prevista\`    DATE         NULL,
        \`data_realizada\`   DATE         NULL,
        \`concluido\`        TINYINT(1)   NOT NULL DEFAULT 0,
        \`responsavel\`      VARCHAR(100) NULL,
        \`observacoes\`      TEXT         NULL,
        \`created_at\`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_marco_os\` (\`ordem_servico_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await conn.end()
    res.json({ ok: true, message: 'Tabelas OS criadas com sucesso: ordem_servico, os_agendamento, os_marco' })
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: forma_pagamento em fin_parcela ─────────────────────────────────
app.get('/run-migration-fin-forma-pagamento', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    // Verifica se a coluna já existe (compatível com MySQL 5.7+)
    const [rows]: any = await conn.execute(`
      SELECT COUNT(*) as cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fin_parcela'
        AND COLUMN_NAME = 'forma_pagamento'
    `)
    const existe = rows[0]?.cnt > 0
    if (!existe) {
      await conn.execute(`
        ALTER TABLE fin_parcela
        ADD COLUMN forma_pagamento VARCHAR(50) NULL AFTER desconto
      `)
    }
    await conn.end()
    res.json({
      ok: true,
      message: existe
        ? 'Coluna forma_pagamento ja existia — nada alterado'
        : 'Coluna forma_pagamento adicionada com sucesso a fin_parcela',
    })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Diagnóstico proposta Denise ──────────────────────────────────────────────
app.get('/diag-denise', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    const [props]: any = await conn.execute(`
      SELECT p.id, p.numero, p.status, p.contrato_formalizado, p.data_formalizacao,
             c.nome AS cliente,
             ft.id AS fin_titulo_id, ft.descricao AS fin_descricao
      FROM proposta p
      INNER JOIN cliente c ON c.id = p.cliente_id
      LEFT JOIN fin_titulo ft ON ft.proposta_id = p.id
      WHERE c.nome LIKE '%Denise%'
      ORDER BY p.id DESC LIMIT 20
    `)
    const result: any[] = []
    for (const p of props) {
      const row: any = { ...p }
      if (p.fin_titulo_id) {
        const [parcelas]: any = await conn.execute(
          'SELECT id, numero, valor, vencimento, status, data_pagamento FROM fin_parcela WHERE titulo_id = ? ORDER BY numero',
          [p.fin_titulo_id]
        )
        row.parcelas = parcelas
      }
      result.push(row)
    }
    await conn.end()
    res.json({ ok: true, data: result })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Diagnóstico condições comerciais de uma proposta ────────────────────────
app.get('/diag-proposta-condicoes/:id', async (req, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    const id = parseInt(req.params.id)
    const [conds]: any = await conn.execute(
      'SELECT id, descricao, tipo, valor_total FROM condicao_comercial WHERE proposta_id = ? ORDER BY id',
      [id]
    )
    const result: any[] = []
    for (const c of conds) {
      const [parcelas]: any = await conn.execute(
        'SELECT id, numero_parcela, valor, prazo_dias, tipo_prazo FROM parcela_pagamento WHERE condicao_id = ? ORDER BY numero_parcela',
        [c.id]
      )
      result.push({ ...c, parcelas })
    }
    // Verifica fin_titulo
    const [fin]: any = await conn.execute(
      'SELECT id, descricao, valor_original FROM fin_titulo WHERE proposta_id = ?', [id]
    )
    for (const f of fin) {
      const [fp]: any = await conn.execute(
        'SELECT id, numero, valor, vencimento, status FROM fin_parcela WHERE titulo_id = ?', [f.id]
      )
      f.fin_parcelas = fp
    }
    await conn.end()
    res.json({ ok: true, condicoes: result, fin_titulos: fin })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Limpar fin_titulo vazio (sem parcelas) para reimportação ─────────────────
app.get('/limpar-fin-titulo-vazio/:tituloId', async (req, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    const id = parseInt(req.params.tituloId)
    if (!id) { res.status(400).json({ ok: false, error: 'id inválido' }); return }
    const [parcelas]: any = await conn.execute('SELECT COUNT(*) as cnt FROM fin_parcela WHERE titulo_id = ?', [id])
    if (parcelas[0].cnt > 0) {
      await conn.end()
      res.status(400).json({ ok: false, error: `Este título tem ${parcelas[0].cnt} parcelas — não é seguro remover automaticamente. Estorne os pagamentos antes.` })
      return
    }
    await conn.execute('DELETE FROM fin_titulo WHERE id = ?', [id])
    await conn.end()
    res.json({ ok: true, message: `fin_titulo ${id} removido (estava sem parcelas). A proposta agora pode ser reimportada.` })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Reverter proposta para status 'aceita' sem formalização ─────────────────
app.get('/reverter-proposta/:id', async (req, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    const id = parseInt(req.params.id)
    if (!id) { res.status(400).json({ ok: false, error: 'id inválido' }); return }
    // Verifica se NÃO há fin_titulo vinculado
    const [check]: any = await conn.execute('SELECT id FROM fin_titulo WHERE proposta_id = ?', [id])
    if (check.length > 0) {
      await conn.end()
      res.status(400).json({ ok: false, error: 'Proposta já foi importada para o financeiro (fin_titulo existe). Não é seguro reverter.' })
      return
    }
    await conn.execute(
      'UPDATE proposta SET contrato_formalizado = 0, data_formalizacao = NULL WHERE id = ?',
      [id]
    )
    await conn.end()
    res.json({ ok: true, message: `Proposta ${id} revertida: contrato_formalizado=0` })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: cria tabela os_nota (Diário de Campo) ──────────────────────────
// ── Corrige contratos históricos: adiciona parcela_pagamento + formaliza ────
app.get('/fix-historicos', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)

    // Encontra propostas históricas sem fin_titulo
    const [props]: any = await conn.execute(
      `SELECT p.id AS propostaId, p.numero, p.empresa_id AS empresaId,
              p.data_emissao AS dataEmissao, c.nome AS clienteNome, c.id AS clienteId,
              cc.id AS condicaoId, cc.valor_total AS valorTotal,
              os.status AS osStatus, os.data_conclusao AS dataConclusao
       FROM proposta p
       JOIN cliente c ON c.id = p.cliente_id
       JOIN condicao_comercial cc ON cc.proposta_id = p.id
       JOIN ordem_servico os ON os.proposta_id = p.id
       LEFT JOIN fin_titulo ft ON ft.proposta_id = p.id
       LEFT JOIN parcela_pagamento pp ON pp.condicao_id = cc.id
       WHERE p.origem = 'historico' AND ft.id IS NULL`
    )
    let corrigidos = 0
    for (const row of (props as any[])) {
      const empId = row.empresaId
      // 1. parcela_pagamento se não existir
      const [ppCheck]: any = await conn.execute(`SELECT id FROM parcela_pagamento WHERE condicao_id = ? LIMIT 1`, [row.condicaoId])
      if (!(ppCheck as any[]).length) {
        await conn.execute(
          `INSERT INTO parcela_pagamento (condicao_id, numero_parcela, descricao_evento, valor, percentual_do_total, prazo_dias, tipo_prazo, referencia_evento, meios_pagamento)
           VALUES (?, 1, 'Pagamento do contrato', ?, 100, 0, 'corridos', 'contrato', '[]')`,
          [row.condicaoId, row.valorTotal]
        )
      }
      // 2. Formaliza proposta
      await conn.execute(
        `UPDATE proposta SET contrato_formalizado = 1, data_formalizacao = COALESCE(data_emissao, CURDATE()) WHERE id = ?`,
        [row.propostaId]
      )
      // 3. fin_pessoa
      const [fpRows]: any = await conn.execute(`SELECT id FROM fin_pessoa WHERE empresa_id = ? AND nome = ? LIMIT 1`, [empId, row.clienteNome])
      let fpId: number
      if ((fpRows as any[]).length) { fpId = (fpRows as any[])[0].id }
      else {
        const [fpIns]: any = await conn.execute(`INSERT INTO fin_pessoa (empresa_id, nome, tipo_pessoa, is_cliente, is_fornecedor) VALUES (?, ?, 'FISICA', 1, 0)`, [empId, row.clienteNome])
        fpId = (fpIns as any).insertId
      }
      // 4. fin_titulo
      const descTit = `Contrato histórico — ${row.clienteNome} (${row.numero})`
      const [tIns]: any = await conn.execute(
        `INSERT INTO fin_titulo (empresa_id, tipo, descricao, documento, pessoa_id, proposta_id, valor_original, emissao, ativo) VALUES (?, 'RECEBER', ?, ?, ?, ?, ?, ?, 1)`,
        [empId, descTit, row.numero, fpId, row.propostaId, String(row.valorTotal), row.dataEmissao ?? new Date().toISOString().slice(0,10)]
      )
      const tituloId = (tIns as any).insertId
      // 5. fin_parcela
      const stParcela = row.osStatus === 'concluida' ? 'PAGA' : 'ABERTA'
      const venc = row.dataConclusao ?? row.dataEmissao ?? new Date().toISOString().slice(0,10)
      await conn.execute(
        `INSERT INTO fin_parcela (titulo_id, numero, valor, vencimento, status, data_pagamento) VALUES (?, 1, ?, ?, ?, ?)`,
        [tituloId, String(row.valorTotal), venc, stParcela, stParcela === 'PAGA' ? venc : null]
      )
      corrigidos++
    }
    await conn.end()
    res.json({ ok: true, corrigidos, message: `${corrigidos} contrato(s) histórico(s) corrigido(s)` })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Remove fin_parcela duplicadas de títulos históricos (evita duplicidade c/ extrato) ──
app.get('/fix-historicos-parcelas', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    // Remove fin_parcela geradas por contratos históricos
    // (o fluxo de caixa real vem do extrato bancário importado)
    const [rows]: any = await conn.execute(
      `SELECT fp.id AS parcelaId
       FROM fin_parcela fp
       JOIN fin_titulo ft ON ft.id = fp.titulo_id
       JOIN proposta p ON p.id = ft.proposta_id
       WHERE p.origem = 'historico'`
    )
    let removidos = 0
    for (const row of (rows as any[])) {
      await conn.execute(`DELETE FROM fin_parcela WHERE id = ?`, [row.parcelaId])
      removidos++
    }
    await conn.end()
    res.json({ ok: true, removidos, message: `${removidos} parcela(s) histórica(s) removida(s) — sem duplicidade com extrato` })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: colunas origem + numero_contrato_externo (histórico) ───────────
app.get('/run-migration-historico', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    // MySQL não suporta ADD COLUMN IF NOT EXISTS — verificamos INFORMATION_SCHEMA antes
    const addIfMissing = async (table: string, column: string, definition: string) => {
      const [rows]: any = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      )
      if (Number((rows as any[])[0].cnt) === 0) {
        await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
      }
    }
    await addIfMissing('proposta',      'origem',                   `ENUM('plataforma','historico') NOT NULL DEFAULT 'plataforma'`)
    await addIfMissing('ordem_servico', 'origem',                   `ENUM('plataforma','historico') NOT NULL DEFAULT 'plataforma'`)
    await addIfMissing('ordem_servico', 'numero_contrato_externo',  `VARCHAR(50) NULL`)
    await conn.end()
    res.json({ ok: true, message: 'Colunas de histórico criadas com sucesso' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

app.get('/run-migration-os-nota', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS os_nota (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        ordem_servico_id  INT NOT NULL,
        empresa_id        INT NOT NULL,
        texto             TEXT NOT NULL,
        autor             VARCHAR(100),
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_os_nota_os (ordem_servico_id),
        INDEX idx_os_nota_emp (empresa_id)
      )
    `)
    await conn.end()
    res.json({ ok: true, message: 'Tabela os_nota criada com sucesso' })
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      res.json({ ok: true, message: 'Tabela já existia' })
    } else {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})

// ── Migração: cria tabela fin_alerta (alertas OS→Financeiro) ─────────────────
app.get('/run-migration-fin-alerta', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS fin_alerta (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id      INT NOT NULL,
        tipo            VARCHAR(60) NOT NULL DEFAULT 'os_concluida_receber',
        titulo          VARCHAR(200) NOT NULL,
        descricao       TEXT,
        proposta_id     INT,
        os_id           INT,
        os_numero       VARCHAR(30),
        cliente_nome    VARCHAR(200),
        valor_pendente  DECIMAL(12,2),
        lido            TINYINT(1) NOT NULL DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_alerta_emp  (empresa_id),
        INDEX idx_fin_alerta_lido (empresa_id, lido),
        UNIQUE KEY uk_alerta_os (empresa_id, os_id, tipo)
      )
    `)
    await conn.end()
    res.json({ ok: true, message: 'Tabela fin_alerta criada com sucesso' })
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      res.json({ ok: true, message: 'Tabela já existia' })
    } else {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})

app.get('/run-migration-fin-auditoria', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS fin_auditoria (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id     INT NOT NULL,
        usuario_id     INT,
        usuario_nome   VARCHAR(150),
        acao           ENUM('CREATE','UPDATE','DELETE','BAIXA','ESTORNO') NOT NULL,
        entidade       VARCHAR(60) NOT NULL,
        entidade_id    INT NOT NULL,
        dados_antes    TEXT,
        dados_depois   TEXT,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_audit_empresa  (empresa_id),
        INDEX idx_fin_audit_entidade (entidade, entidade_id),
        INDEX idx_fin_audit_created  (created_at)
      )
    `)
    await conn.end()
    res.json({ ok: true, message: 'Tabela fin_auditoria criada com sucesso' })
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      res.json({ ok: true, message: 'Tabela já existia' })
    } else {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})

// ── Migração: garante que proposta.status aceite 'expirada' e 'cancelada' ────
app.get('/run-migration-proposta-status', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute(`
      ALTER TABLE proposta
      MODIFY COLUMN status ENUM('rascunho','enviada','aceita','recusada','expirada','cancelada')
      NOT NULL DEFAULT 'rascunho'
    `)
    await conn.end()
    res.json({ ok: true, message: 'proposta.status agora aceita expirada/cancelada' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: cria fin_categoria_custo + fin_projeto + fin_titulo.categoria_custo_id ──
app.get('/run-migration-projeto', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS fin_categoria_custo (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id  INT NOT NULL,
        nome        VARCHAR(100) NOT NULL,
        ativo       TINYINT(1) NOT NULL DEFAULT 1,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fin_catcusto_empresa (empresa_id)
      )
    `)

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS fin_projeto (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id       INT NOT NULL,
        centro_custo_id  INT NOT NULL,
        proposta_id      INT NULL,
        nome             VARCHAR(200) NOT NULL,
        valor_contrato   DECIMAL(12,2) NOT NULL,
        status           ENUM('ABERTO','ENCERRADO') NOT NULL DEFAULT 'ABERTO',
        observacoes      TEXT NULL,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP NULL,
        INDEX idx_fin_projeto_empresa (empresa_id),
        INDEX idx_fin_projeto_centro (centro_custo_id)
      )
    `)

    const [cols]: any = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_titulo' AND COLUMN_NAME = 'categoria_custo_id'`
    )
    if (Number((cols as any[])[0].cnt) === 0) {
      await conn.execute(`ALTER TABLE fin_titulo ADD COLUMN categoria_custo_id INT NULL`)
    }

    await conn.end()
    res.json({ ok: true, message: 'fin_categoria_custo, fin_projeto e fin_titulo.categoria_custo_id criados com sucesso' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: adiciona coluna lote_rateio_id na fin_titulo (rateio de NF entre projetos) ──
app.get('/run-migration-rateio', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)

    const [cols]: any = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_titulo' AND COLUMN_NAME = 'lote_rateio_id'`
    )
    if (Number((cols as any[])[0].cnt) === 0) {
      await conn.execute(`ALTER TABLE fin_titulo ADD COLUMN lote_rateio_id VARCHAR(40) NULL`)
      await conn.execute(`CREATE INDEX idx_fin_titulo_lote_rateio ON fin_titulo(lote_rateio_id)`)
    }

    await conn.end()
    res.json({ ok: true, message: 'fin_titulo.lote_rateio_id criado com sucesso' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: adiciona coluna extrato_fingerprint na fin_parcela ─────────────
app.get('/run-migration-extrato-fingerprint', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    try {
      await conn.execute('ALTER TABLE fin_parcela ADD COLUMN extrato_fingerprint VARCHAR(220) NULL')
      await conn.execute('CREATE INDEX idx_fin_parcela_fingerprint ON fin_parcela(extrato_fingerprint)')
      await conn.end()
      res.json({ ok: true, message: 'Coluna extrato_fingerprint e índice criados com sucesso' })
    } catch (e: any) {
      await conn.end()
      if (e.code === 'ER_DUP_FIELDNAME' || e.message?.includes('Duplicate column')) {
        res.json({ ok: true, message: 'Coluna já existia — nada alterado' })
      } else if (e.code === 'ER_DUP_KEYNAME') {
        res.json({ ok: true, message: 'Índice já existia — nada alterado' })
      } else {
        res.status(500).json({ ok: false, error: e.message })
      }
    }
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: cancelado + cancelado_em na tabela cliente ─────────────────────
app.get('/run-migration-cliente-cancelado', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    const addIfMissing = async (col: string, def: string) => {
      const [rows]: any = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cliente' AND COLUMN_NAME = ?`,
        [col]
      )
      if (Number((rows as any[])[0].cnt) === 0) {
        await conn.execute(`ALTER TABLE \`cliente\` ADD COLUMN \`${col}\` ${def}`)
      }
    }
    await addIfMissing('cancelado',    'TINYINT(1) NOT NULL DEFAULT 0')
    await addIfMissing('cancelado_em', 'TIMESTAMP NULL')
    await conn.end()
    res.json({ ok: true, message: 'Colunas cancelado e cancelado_em adicionadas ao cliente' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Parse de Extrato Bancário (PDF) ─────────────────────────────────────────
app.post('/extrato/parse', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ ok: false, error: 'Nenhum arquivo enviado' }); return }
    const banco = ((req.body as any).banco || '').toString().toUpperCase() as 'INTER' | 'SICOOB'
    if (!['INTER', 'SICOOB'].includes(banco)) {
      res.status(400).json({ ok: false, error: 'Banco inválido. Use INTER ou SICOOB' }); return
    }
    const parsed = await pdfParse(req.file.buffer)
    const text: string = parsed.text

    const transacoes = banco === 'INTER' ? parseInter(text) : parseSicoob(text)
    const totalEntradas = transacoes.filter(t => t.tipo === 'C').reduce((s, t) => s + t.valor, 0)
    const totalSaidas   = transacoes.filter(t => t.tipo === 'D').reduce((s, t) => s + t.valor, 0)

    res.json({ ok: true, transacoes, total: transacoes.length, totalEntradas, totalSaidas })
  } catch (e: any) {
    console.error('Erro parsing extrato:', e)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Parse de Extrato OFX/QFX (Conciliação Automática) ───────────────────────
// Aceita arquivos .ofx/.qfx (texto) exportados diretamente pelo banco.
// Retorna transações com FITID único + sugestão de categoria automática.
app.post('/extrato/parse-ofx', upload.single('ofx'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ ok: false, error: 'Nenhum arquivo enviado' }); return }
    // OFX é texto puro — lê o buffer como string
    const content = req.file.buffer.toString('latin1')  // encoding padrão dos bancos BR
    const result = parseOFX(content)
    if (result.total === 0) {
      res.status(400).json({ ok: false, error: 'Nenhuma transação encontrada. Verifique se o arquivo é um OFX válido.' })
      return
    }
    res.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('Erro parsing OFX:', e)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Migração: cria tabela os_anexo ───────────────────────────────────────────
app.get('/run-migration-os-anexo', async (_, res) => {
  try {
    const mysql2 = await import('mysql2/promise')
    const conn = await mysql2.createConnection(process.env.DATABASE_URL!)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS os_anexo (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        ordem_servico_id  INT NOT NULL,
        empresa_id        INT NOT NULL,
        nome              VARCHAR(255) NOT NULL,
        tipo_mime         VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
        tamanho           INT NOT NULL DEFAULT 0,
        dados             MEDIUMBLOB NOT NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_os_anexo_os  (ordem_servico_id),
        INDEX idx_os_anexo_emp (empresa_id)
      )
    `)
    await conn.end()
    res.json({ ok: true, message: 'Tabela os_anexo criada com sucesso' })
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      res.json({ ok: true, message: 'Tabela já existia' })
    } else {
      res.status(500).json({ ok: false, error: e.message })
    }
  }
})

// ── Upload de anexo em OS ─────────────────────────────────────────────────────
const uploadAnexo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','application/pdf']
    cb(null, allowed.includes(file.mimetype))
  },
})

app.post('/os/:osId/anexo', uploadAnexo.single('arquivo'), async (req, res) => {
  try {
    const osId = parseInt(req.params.osId)
    if (!req.file) { res.status(400).json({ ok: false, error: 'Arquivo não enviado ou tipo não permitido (JPG, PNG, PDF)' }); return }

    // Autentica via JWT (mesmo padrão do createContext)
    const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
    if (!token) { res.status(401).json({ ok: false, error: 'Não autorizado' }); return }

    let empresaId: number | undefined
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'))
      empresaId = payload.empresaId
    } catch { /* token inválido */ }
    if (!empresaId) { res.status(401).json({ ok: false, error: 'Token inválido' }); return }

    const mysql2 = await import('mysql2/promise')
    const conn   = await mysql2.createConnection(process.env.DATABASE_URL!)

    // Verifica que a OS pertence à empresa
    const [osRows]: any = await conn.execute(
      `SELECT id FROM ordem_servico WHERE id = ? AND empresa_id = ? LIMIT 1`,
      [osId, empresaId],
    )
    if (!(osRows as any[]).length) {
      await conn.end()
      res.status(404).json({ ok: false, error: 'OS não encontrada' })
      return
    }

    await conn.execute(
      `INSERT INTO os_anexo (ordem_servico_id, empresa_id, nome, tipo_mime, tamanho, dados)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [osId, empresaId, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer],
    )
    const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() AS id')
    const id = (idRow as any[])[0]?.id
    await conn.end()

    res.json({ ok: true, id, nome: req.file.originalname, tipoMime: req.file.mimetype, tamanho: req.file.size })
  } catch (e: any) {
    console.error('Erro upload anexo OS:', e)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Servir arquivo de anexo ───────────────────────────────────────────────────
app.get('/os-anexo/:id', async (req, res) => {
  try {
    const id     = parseInt(req.params.id)
    const rawToken = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
                  || (req.query.token as string ?? '')

    let empresaId: number | undefined
    try {
      const payload = JSON.parse(Buffer.from(rawToken.split('.')[1], 'base64').toString('utf-8'))
      empresaId = payload.empresaId
    } catch { /* token inválido */ }
    if (!empresaId) { res.status(401).send('Não autorizado'); return }

    const mysql2 = await import('mysql2/promise')
    const conn   = await mysql2.createConnection(process.env.DATABASE_URL!)

    const [rows]: any = await conn.execute(
      `SELECT nome, tipo_mime, tamanho, dados FROM os_anexo
       WHERE id = ? AND empresa_id = ? LIMIT 1`,
      [id, empresaId],
    )
    await conn.end()

    const file = (rows as any[])[0]
    if (!file) { res.status(404).send('Arquivo não encontrado'); return }

    const download = req.query.download === '1'
    res.setHeader('Content-Type', file.tipo_mime)
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.nome)}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.send(file.dados)
  } catch (e: any) {
    res.status(500).send('Erro: ' + e.message)
  }
})

async function main() {
  await testConnection()
  app.listen(PORT, () => {
    console.log(`\n🚀 Atom Tech API → http://localhost:${PORT}`)
    console.log(`   tRPC: http://localhost:${PORT}/trpc\n`)
  })
}

main().catch(err => { console.error(err); process.exit(1) })
export type { AppRouter } from './routers'
