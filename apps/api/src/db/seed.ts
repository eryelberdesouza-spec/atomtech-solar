import 'dotenv/config'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'
import {
  empresa, usuario, premissasConfig, categoriaCusto,
  textoInstitucional, cronogracoMarco, cliente, fatura, historicoConsumo,
} from './schema'

async function seed() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 5,
  })
  const db = drizzle(pool, { schema, mode: 'default' })
  console.log('Iniciando seed...')

  await db.insert(empresa).values({
    nome: 'Atom Tech',
    cnpj: '34.011.045/0001-83',
    inscricaoEstadual: '0792337500157',
    isentoIE: false,
    estado: 'DF',
    cidade: 'Brasilia',
    endereco: 'Edificio SIA Centro Empresarial, Sala 231 B',
    cep: '71200-030',
    telefone: '(61) 3978-1738',
    email: 'contato@atomtech.tec.br',
    corPrimaria: '#F5A623',
    corSecundaria: '#2D9C4E',
    bancoPixTipo: 'cnpj',
    bancoPixChave: '34.011.045/0001-83',
    rodapeTexto: 'Atom Tech | Brasilia/DF | (61) 3978-1738',
  }).execute()
  console.log('OK: empresa')

  await db.insert(usuario).values({
    empresaId: 1,
    nome: 'Eryelber Correia de Souza',
    email: 'eryelber@atomtech.tec.br',
    senhaHash: '$2b$12$placeholder',
    telefone: '(61) 3978-1738',
    cargo: 'Socio',
    role: 'admin',
    ativo: true,
  }).execute()
  console.log('OK: usuario')

  await db.insert(premissasConfig).values({
    empresaId: 1,
    inflacaoEnergetica: '9.50',
    taxaDescontoVpl: '12.00',
    considerarCustoDisponibilidade: true,
    baseIrradiacao: 'Atlas INPE 2017',
    sobredimensionamentoPadrao: '50.00',
    perdaEficienciaAnualTradicional: '0.80',
    perdaEficienciaAnualMicroinversor: '0.60',
    perdaEficienciaAnualOtimizador: '0.60',
    trocaInversorAnosTradicional: 0,
    trocaInversorAnosMicroinversor: 0,
    trocaInversorAnosOtimizador: 0,
    custoTrocaInversorTrad: '0.00',
    custoTrocaInversorMicro: '0.00',
    custoTrocaInversorOtim: '0.00',
    margemPotenciaIdeal: '0.00',
    areaCarport: '1.30',
    areaCeramico: '1.20',
    areaFibrocimento: '1.20',
    areaLaje: '1.20',
    areaShingle: '1.20',
    areaMetalico: '1.20',
    areaZipado: '1.20',
    areaSolo: '1.60',
    grupoTarifarioPadrao: 'B',
    tarifaPadrao: '1.068390',
    faseTensaoRede: 'Trifasico 127/220V',
    fatorSimultaneidade: '20.00',
    impostoEnergia: '20.00',
    outrosEncargosAtual: '0.00',
    outrosEncargosNovo: '0.00',
    tipoTelhadoPadrao: 'ceramico',
    desvioAzimutalPadrao: 0,
    inclinacaoPadrao: 20,
    topologiasDisponiveis: ['tradicional', 'microinversor', 'otimizador'],
    tipoSistemaPadrao: 'on_grid',
    taxaDesempenhoTradicional: '77.00',
    taxaDesempenhoMicroinversor: '78.50',
    taxaDesempenhoOtimizador: '80.00',
    metodoPrecificacao: 'margem_custo',
    margemPadrao: '33.00',
    margemKitsUsarPadrao: false,
    margemKitsValor: '0.00',
  }).execute()
  console.log('OK: premissas')

  await db.insert(categoriaCusto).values([
    { empresaId: 1, nome: 'Kit Fotovoltaico', item: 'Material', tipoCusto: 'avancado', margemTipo: 'padrao', ativo: true, ordem: 1 },
    { empresaId: 1, nome: 'Instalacao Modulos', item: 'Mao de Obra', tipoCusto: 'multiplo', margemTipo: 'padrao', ativo: true, ordem: 2 },
    { empresaId: 1, nome: 'Instalacao Inversor', item: 'Mao de Obra', tipoCusto: 'multiplo', margemTipo: 'padrao', ativo: true, ordem: 3 },
    { empresaId: 1, nome: 'Projeto de Engenharia', item: 'Projeto', tipoCusto: 'fixo', margemTipo: 'padrao', ativo: true, ordem: 4 },
  ]).execute()
  console.log('OK: categorias')

  await db.insert(textoInstitucional).values([
    { empresaId: 1, chave: 'apresentacao_empresa', titulo: 'Conheca a Atom Tech', conteudo: 'A Atom Tech e especializada em sistemas fotovoltaicos com mais de 700 projetos instalados.', versao: 1, ativo: true },
    { empresaId: 1, chave: 'garantias', titulo: 'Garantias', conteudo: 'Instalacao: 1 ano. Modulos: 12 anos. Inversores: 10 anos.', versao: 1, ativo: true },
    { empresaId: 1, chave: 'fornecedores', titulo: 'Fornecedores', conteudo: 'TIER 1: JA Solar, Trina Solar, Sungrow, GoodWe, Huawei, WEG.', versao: 1, ativo: true },
  ]).execute()
  console.log('OK: textos')

  await db.insert(cronogracoMarco).values([
    { empresaId: 1, descricao: 'Aprovacao da Proposta', prazoTexto: '', ordem: 1 },
    { empresaId: 1, descricao: 'DIA D: Assinatura e 1a parcela', prazoTexto: 'Dia D', ordem: 2 },
    { empresaId: 1, descricao: 'Entrega dos equipamentos', prazoTexto: 'D+20 dias uteis', ordem: 3 },
    { empresaId: 1, descricao: 'Montagem do sistema', prazoTexto: 'D+30 dias uteis', ordem: 4 },
    { empresaId: 1, descricao: 'Testes e homologacao', prazoTexto: 'D+40 dias uteis', ordem: 5 },
  ]).execute()
  console.log('OK: cronograma')

  await db.insert(cliente).values([
    { empresaId: 1, tipoPessoa: 'fisica', nome: 'Jose Martiniano de Sousa Junior', cpfCnpj: '444.051.621-15', telefone: '(61) 99999-0001', cidade: 'Brasilia', estado: 'DF', distribuidora: 'Neoenergia Brasilia', createdBy: 1 },
    { empresaId: 1, tipoPessoa: 'fisica', nome: 'Luiz Gonzaga de Carvalho', cpfCnpj: '153.078.751-34', telefone: '(61) 99999-0002', cidade: 'Brasilia', estado: 'DF', distribuidora: 'Neoenergia Brasilia', createdBy: 1 },
  ]).execute()
  console.log('OK: clientes')

  await db.insert(fatura).values({
    clienteId: 1,
    distribuidora: 'Neoenergia Brasilia',
    referencia: '02/2026',
    codigoUC: '2.478.995-X',
    tipoFornecimento: 'TRIFASICO',
    classificacao: 'B1 RESIDENCIAL',
    grupoTarifario: 'B',
    consumoKwh: '1275.00',
    valorTotal: '1512.79',
    tarifaMedia: '1.068390',
    cip: '150.60',
    icmsAliquota: '20.00',
    diasFaturados: 28,
    dataLeituraAnterior: '2026-01-26',
    dataLeituraAtual: '2026-02-23',
  }).execute()

  await db.insert(historicoConsumo).values([
    { faturaId: 1, referencia: '02/2026', consumoKwh: '1275', dias: 28, ordem: 1 },
    { faturaId: 1, referencia: '01/2026', consumoKwh: '1731', dias: 33, ordem: 2 },
    { faturaId: 1, referencia: '12/2025', consumoKwh: '1653', dias: 30, ordem: 3 },
    { faturaId: 1, referencia: '11/2025', consumoKwh: '1730', dias: 31, ordem: 4 },
    { faturaId: 1, referencia: '10/2025', consumoKwh: '1667', dias: 29, ordem: 5 },
    { faturaId: 1, referencia: '09/2025', consumoKwh: '1509', dias: 31, ordem: 6 },
    { faturaId: 1, referencia: '08/2025', consumoKwh: '1230', dias: 32, ordem: 7 },
    { faturaId: 1, referencia: '07/2025', consumoKwh: '1032', dias: 30, ordem: 8 },
    { faturaId: 1, referencia: '06/2025', consumoKwh: '1343', dias: 29, ordem: 9 },
    { faturaId: 1, referencia: '05/2025', consumoKwh: '1897', dias: 31, ordem: 10 },
    { faturaId: 1, referencia: '04/2025', consumoKwh: '1933', dias: 31, ordem: 11 },
    { faturaId: 1, referencia: '03/2025', consumoKwh: '1584', dias: 32, ordem: 12 },
  ]).execute()
  console.log('OK: fatura e historico')

  console.log('\nSeed concluido!')
  await pool.end()
  process.exit(0)
}

seed().catch((e) => { console.error('Erro:', e.message); process.exit(1) })
