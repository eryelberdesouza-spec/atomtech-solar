// ═══════════════════════════════════════════════════════════════════
// gerarContratoBrowser.ts — Geração de Contrato via window.print()
// Contrato de Compra e Venda e Prestação de Serviços — Fotovoltaico
// ═══════════════════════════════════════════════════════════════════

// ─── HELPERS ──────────────────────────────────────────────────────

const fmt = (v: number | string | null | undefined): string => {
  const n = Number(v ?? 0)
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fmtDate = (s: any): string => {
  if (!s) return ''
  try {
    const str = String(s)
    const p = str.split('T')[0].split('-')
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`
    return str
  } catch { return String(s) }
}

const UNIDADES_EXT = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS_EXT = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS_EXT = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

// Números pequenos por extenso (0-999) — usado tanto no valor em reais quanto
// nos prazos em dias ("02 (dois) dias úteis"), no padrão da minuta real.
function menorQueMil(num: number): string {
  if (num === 0) return ''
  if (num === 100) return 'cem'
  const c = Math.floor(num / 100)
  const resto = num % 100
  const partes: string[] = []
  if (c > 0) partes.push(c === 1 && resto > 0 ? 'cento' : CENTENAS_EXT[c])
  if (resto > 0) {
    if (resto < 20) partes.push(UNIDADES_EXT[resto])
    else {
      const d = Math.floor(resto / 10)
      const u = resto % 10
      if (u > 0) partes.push(DEZENAS_EXT[d] + ' e ' + UNIDADES_EXT[u])
      else partes.push(DEZENAS_EXT[d])
    }
  }
  return partes.join(' e ')
}

// "02 (dois)" — número com zero à esquerda (padrão jurídico) seguido do
// extenso entre parênteses. Usado nos prazos ("em até 02 (dois) dias úteis").
function numeroComExtenso(n: number): string {
  const pad = n < 10 ? '0' + n : String(n)
  return `${pad} (${menorQueMil(n) || 'zero'})`
}

function valorPorExtenso(n: number): string {
  if (n === 0) return 'zero reais'
  const reais = Math.floor(n)
  const centavos = Math.round((n - reais) * 100)
  const partes: string[] = []
  if (reais >= 1_000_000) {
    const m = Math.floor(reais / 1_000_000)
    partes.push(menorQueMil(m) + (m === 1 ? ' milhão' : ' milhões'))
  }
  if (reais >= 1_000) {
    const k = Math.floor((reais % 1_000_000) / 1_000)
    if (k > 0) partes.push(menorQueMil(k) + ' mil')
  }
  const resto = reais % 1_000
  if (resto > 0) partes.push(menorQueMil(resto))
  const textoReais = partes.join(' e ') + (reais === 1 ? ' real' : ' reais')
  if (centavos > 0) {
    return textoReais + ' e ' + menorQueMil(centavos) + (centavos === 1 ? ' centavo' : ' centavos')
  }
  return textoReais
}

function enderecoCliente(c: any): string {
  const p: string[] = []
  if (c?.endereco) p.push(c.endereco + (c.numero ? ', ' + c.numero : ''))
  if (c?.complemento) p.push(c.complemento)
  if (c?.bairro) p.push(c.bairro)
  if (c?.cidade && c?.estado) p.push(`${c.cidade}/${c.estado}`)
  else if (c?.cidade) p.push(c.cidade)
  if (c?.cep) p.push(`CEP ${c.cep}`)
  return p.join(' – ') || '(endereço não informado)'
}

function enderecoEmpresa(e: any): string {
  const p: string[] = []
  if (e?.endereco) p.push(e.endereco)
  if (e?.cidade && e?.estado) p.push(`${e.cidade}/${e.estado}`)
  if (e?.cep) p.push(`CEP ${e.cep}`)
  return p.join(', ')
}

function dadosBancarios(e: any, parcela: any): string {
  if (parcela?.dadosBancariosJson) {
    const d = parcela.dadosBancariosJson
    const l: string[] = []
    if (d.banco)   l.push(`Banco ${d.banco}`)
    if (d.agencia) l.push(`Agência ${d.agencia}`)
    if (d.conta)   l.push(`Conta ${d.conta}`)
    if (d.pix)     l.push(`PIX: ${d.pix}`)
    if (l.length) return l.join(' - ')
  }
  const l: string[] = []
  if (e?.bancoNome)     l.push(`Banco ${e.bancoNome}${e.bancoCodigo ? ` (${e.bancoCodigo})` : ''}`)
  if (e?.bancoAgencia)  l.push(`Agência ${e.bancoAgencia}`)
  if (e?.bancoConta)    l.push(`Conta ${e.bancoConta}`)
  if (e?.bancoPixChave) l.push(`PIX: ${e.bancoPixChave}`)
  return l.join(' - ')
}

function labelReferencia(ref: string, n: number): string {
  const map: Record<string, string> = {
    assinatura_contrato:       'da data da última assinatura do contrato',
    entrega_equipamentos:      'da data de entrega dos equipamentos',
    conclusao_servicos:        'da data de conclusão dos serviços',
    vencimento_parcela_anterior: `do vencimento da ${n - 1}ª Parcela`,
    aprovacao_financiamento:   'da aprovação do financiamento',
  }
  return map[ref] ?? ref
}

function tipoPrazoLabel(tipo: string): string {
  return tipo === 'uteis' ? 'dias úteis' : 'dias corridos'
}

function numeroOrdinalLabel(n: number): string {
  const ord: Record<number, string> = {
    1: 'Parcela de Entrada', 2: '2ª Parcela', 3: '3ª Parcela', 4: '4ª Parcela',
    5: '5ª Parcela', 6: '6ª Parcela', 7: '7ª Parcela', 8: '8ª Parcela',
  }
  return ord[n] ?? `${n}ª Parcela`
}

function logoTag(logoUrl: string | null | undefined): string {
  if (logoUrl) return `<img src="${logoUrl}" alt="logo" />`
  return `<span class="logo-text">ATOMTECH</span>`
}

// ─── ITENS DO KIT (Cláusula 1ª, Parágrafo Primeiro) ────────────────
// A minuta real lista o kit item a item (módulos, microinversor, cabos,
// conectores, parafusos etc.) — gerado aqui a partir da tabela de
// equipamentos da proposta. Se a proposta só tiver módulo + inversor
// cadastrados (padrão de hoje), a lista sai só com esses dois; pra sair
// completo (parafuso, cabo, conector...) é preciso cadastrar cada
// acessório como um item de equipamento.
const LABEL_TIPO_EQUIPAMENTO: Record<string, string> = {
  modulo: 'painel solar',
  inversor: 'inversor',
  microinversor: 'microinversor',
  otimizador: 'otimizador de potência',
  estrutura: 'estrutura de fixação',
  cabo: 'cabo',
  outros: 'item',
}

function descricaoItemEquipamento(eq: any): string {
  const label = LABEL_TIPO_EQUIPAMENTO[eq?.tipo] ?? 'item'
  const qtd = eq?.quantidade ?? 1
  // Sem fabricante (comum em acessórios — cabo, conector, parafuso etc.), o
  // campo "modelo" já costuma trazer a descrição completa do item (ex.: "cabo
  // solar 4,0mm vermelho"); usar direto, sem repetir o rótulo do tipo.
  if (!eq?.fabricante) {
    return `${qtd} x ${eq?.modelo || label}`
  }
  const partes = [label, eq.fabricante]
  if (eq?.modelo) partes.push(`modelo ${eq.modelo}`)
  if (eq?.potenciaWp) partes.push(`de ${eq.potenciaWp}W`)
  return `${qtd} x ${partes.join(' ')}`
}

function listaItensKit(equipamentos: any[]): string {
  const itens = (equipamentos ?? []).filter((e: any) => e?.quantidade)
  if (!itens.length) return ''
  return itens.map(descricaoItemEquipamento).join('; ') + '.'
}

// ─── CSS ──────────────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 10.5pt;
    color: #000;
    background: #fff;
    line-height: 1.4;
  }

  /* ── CABEÇALHO/RODAPÉ via tabela: thead/tfoot repetem em TODAS as páginas
        impressas, e o conteúdo flui no tbody SEM sobrepor (sem position:fixed) ── */
  .doc-table { width: 100%; border-collapse: collapse; }
  .doc-table thead { display: table-header-group; }
  .doc-table tfoot { display: table-footer-group; }
  .doc-head-cell, .doc-foot-cell, .doc-body-cell { padding: 0; border: 0; }

  .running-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6mm 16mm 2mm;
    border-bottom: 1.5px solid #1a2744;
  }
  .running-header img  { height: 30px; }
  .running-header .logo-text { font-size: 14pt; font-weight: 900; letter-spacing: -1px; color: #1a2744; }
  .running-header .rh-num { font-size: 9.5pt; font-weight: 700; color: #1a2744; white-space: nowrap; }

  .running-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 2mm 16mm 5mm;
    border-top: 1px solid #1a2744;
    font-size: 8pt; color: #555;
  }
  .running-footer .rf-site { font-weight: 700; color: #1a2744; }

  .doc-body { padding: 4mm 16mm 4mm; }

  @media print {
    @page { size: A4; margin: 0; }
    body  { margin: 0; }
    .running-header img        { filter: brightness(0); }
    .running-header .logo-text { color: #000 !important; }
    .page-break { page-break-before: always; }
    .clausula, .paragrafo, .parte-bloco { page-break-inside: avoid; }
    .lista-clausula { page-break-inside: avoid; }
    .assinatura-wrapper { page-break-inside: avoid; }
  }

  @media screen {
    .doc-table { width: 210mm; margin: 0 auto; background: #fff; }
    .page-break {
      border-top: 2px dashed #ccc;
      margin: 8mm 0 6mm;
      position: relative;
    }
    .page-break::before {
      content: 'quebra de página';
      position: absolute;
      top: -9px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 8px;
      font-size: 9px;
      color: #aaa;
      font-family: Arial, sans-serif;
    }
  }

  /* ── TÍTULO ── */
  .titulo-contrato {
    text-align: center;
    font-size: 12.5pt;
    font-weight: 700;
    text-decoration: underline;
    text-transform: uppercase;
    margin-bottom: 5mm;
    letter-spacing: 0.03em;
  }

  /* ── SEÇÕES ── */
  .secao-titulo {
    font-size: 10.5pt;
    font-weight: 700;
    text-decoration: underline;
    text-transform: uppercase;
    margin: 4.5mm 0 1.8mm;
  }

  .clausula {
    text-align: justify;
    margin-bottom: 2.5mm;
    hyphens: auto;
  }
  .clausula strong { font-weight: 700; }

  .paragrafo {
    text-align: justify;
    margin-bottom: 2mm;
    padding-left: 5mm;
    hyphens: auto;
  }

  .lista-clausula {
    margin: 1.5mm 0 2.5mm 8mm;
  }
  .lista-clausula li {
    margin-bottom: 1.3mm;
    text-align: justify;
  }

  .parte-bloco {
    text-align: justify;
    margin-bottom: 2mm;
    hyphens: auto;
  }
  .parte-bloco strong { font-weight: 700; }

  /* ── TABELA DE PAGAMENTO ── */
  .tabela-pagamento {
    width: 100%;
    border-collapse: collapse;
    margin: 2mm 0 1.5mm;
    font-size: 9.5pt;
  }
  .tabela-pagamento th {
    background: #f0f0f0;
    border: 1px solid #bbb;
    padding: 3px 6px;
    text-align: left;
    font-weight: 700;
    font-size: 9pt;
  }
  .tabela-pagamento td {
    border: 1px solid #bbb;
    padding: 3px 6px;
    vertical-align: top;
    font-size: 9pt;
  }

  /* ── ASSINATURAS ── */
  .assinaturas-bloco { margin-top: 6mm; text-align: center; }
  .assinatura-wrapper {
    display: inline-block;
    width: 200px;
    margin: 0 12px;
    vertical-align: bottom;
  }
  .assinatura-espaco { height: 36mm; }
  .assinatura-linha {
    border-top: 1px solid #000;
    padding-top: 2px;
    font-size: 9.5pt;
    text-align: center;
  }
  .data-local {
    text-align: right;
    font-size: 10.5pt;
    margin: 6mm 0 3mm;
  }
`

// ─── GERAÇÃO DO HTML ──────────────────────────────────────────────

function buildHtml(dados: any, formaPagamento: string): string {
  const { proposta, dimensionamento, equipamentos, precificacao, condicoesComerciais, empresa, cliente } = dados

  // formaPagamento passado como parâmetro direto — sem ambiguidade
  const forma = (formaPagamento ?? '').trim().toLowerCase()

  const condicoes: any[] = condicoesComerciais ?? []
  const ativas = condicoes.filter((c: any) => c.ativa)
  const condicaoAtiva = (
    ativas.find((c: any) => c.tipo === 'parcelado_marcos' && (c.parcelas?.length ?? 0) > 1) ??
    [...ativas].sort((a: any, b: any) => (b.parcelas?.length ?? 0) - (a.parcelas?.length ?? 0))[0] ??
    condicoes[0]
  )
  const parcelas: any[] = condicaoAtiva?.parcelas ?? []

  const valorTotal    = Number(condicaoAtiva?.valorTotal ?? precificacao?.precoFinal ?? 0)
  const valorExtenso  = valorPorExtenso(valorTotal)
  const potenciaKwp   = Number(dimensionamento?.potenciaFinalKwp ?? 0)
    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const modulo   = (equipamentos ?? []).find((e: any) => e.tipo === 'modulo')
  const inversor = (equipamentos ?? []).find((e: any) =>
    ['inversor', 'microinversor', 'otimizador'].includes(e.tipo))
  const isMicro  = inversor?.tipo === 'microinversor'
  const listaKit = listaItensKit(equipamentos)

  const garantiaModulo   = modulo?.garantiaAnos   ? `${modulo.garantiaAnos} anos` : '12 anos'
  const garantiaInversor = inversor?.garantiaAnos  ? `${inversor.garantiaAnos} anos` : '12 anos'

  const empNome  = empresa?.nome  ?? 'ATOM TECNOLOGIA INSTALAÇÕES E SERVIÇOS LTDA'
  const empCnpj  = empresa?.cnpj  ?? ''
  const empIE    = empresa?.inscricaoEstadual ?? ''
  const empEnd   = enderecoEmpresa(empresa)
  const empEmail = empresa?.email ?? ''

  const rep1Nome = empresa?.rep1Nome ?? '_______________________________'
  const rep1Cpf  = empresa?.rep1Cpf  ?? '___.___.___-__'
  const rep1Desc = empresa?.rep1Descricao ?? ''
  const rep2Nome = empresa?.rep2Nome ?? '_______________________________'
  const rep2Cpf  = empresa?.rep2Cpf  ?? '___.___.___-__'
  const rep2Desc = empresa?.rep2Descricao ?? ''
  const hasRep2  = !!(empresa?.rep2Nome)

  const cliNome       = cliente?.nome ?? proposta?.clienteNome ?? ''
  const cliCpf        = cliente?.cpfCnpj ?? ''
  const cliEnd        = enderecoCliente(cliente)
  const cliEmail      = cliente?.email ?? ''
  const cliTipoPessoa = cliente?.tipoPessoa ?? 'fisica'

  const numProposta  = proposta?.numero ?? ''
  const dataEmissao  = fmtDate(proposta?.dataEmissao)
  const dataContrato = fmtDate(proposta?.dataValidade ?? proposta?.dataEmissao)
  const cidade       = empresa?.cidade ?? 'Brasília'

  const contratanteDesc = cliTipoPessoa === 'juridica'
    ? `<strong>${cliNome}</strong>, inscrita no CNPJ sob nº <strong>${cliCpf}</strong>, com sede em ${cliEnd}${cliEmail ? `, e-mail: ${cliEmail}` : ''}`
    : `<strong>${cliNome}</strong>, ${cliCpf ? `portador(a) do CPF: <strong>${cliCpf}</strong>, ` : ''}residente e domiciliado(a) no ${cliEnd}${cliEmail ? `, e-mail: ${cliEmail}` : ''}`

  const rep1Full = rep1Desc
    ? `${rep1Nome}, ${rep1Desc}${rep1Cpf ? ` e CPF ${rep1Cpf}` : ''}`
    : rep1Nome + (rep1Cpf ? `, CPF ${rep1Cpf}` : '')
  const rep2Full = rep2Desc
    ? `${rep2Nome}, ${rep2Desc}${rep2Cpf ? ` e CPF/MF nº ${rep2Cpf}` : ''}`
    : rep2Nome + (rep2Cpf ? `, CPF ${rep2Cpf}` : '')
  const repsText = hasRep2 ? `${rep1Full} e <strong>${rep2Full}</strong>` : rep1Full

  // ── CLÁUSULA 2 — PREÇO: renderiza conforme forma de pagamento ──
  function renderPagamento(): string {
    if (forma === 'credito') {
      const numParc = parcelas.length || 1
      if (numParc <= 1) {
        return `<p class="clausula">O pagamento será realizado <strong>à vista via cartão de crédito</strong>, no valor total de <strong>${fmt(valorTotal)}</strong>, conforme condições da operadora.</p>`
      }
      return `<p class="clausula">O pagamento será realizado via <strong>cartão de crédito</strong> em <strong>${numParc} parcelas</strong> de aproximadamente <strong>${fmt(valorTotal / numParc)}</strong> cada, totalizando <strong>${fmt(valorTotal)}</strong>, conforme condições da operadora. O valor final poderá ser acrescido de taxas aplicadas pela operadora.</p>`
    }

    if (forma === 'financiamento') {
      return `<p class="clausula">O pagamento será realizado mediante <strong>financiamento bancário ou CDC</strong>, conforme contrato de crédito firmado entre o <strong>CONTRATANTE</strong> e a instituição financeira escolhida. O valor de <strong>${fmt(valorTotal)}</strong> será repassado à <strong>CONTRATADA</strong> após a liberação do crédito.</p>`
    }

    if (forma === 'pix' || forma === 'vista') {
      const banco = dadosBancarios(empresa, null)
      return `<p class="clausula">O pagamento será realizado <strong>à vista</strong>, no valor de <strong>${fmt(valorTotal)}</strong>, mediante <strong>PIX ou transferência bancária</strong>${banco ? ` para: <strong>${banco}</strong>` : ''}, a ser confirmado antes da execução dos serviços.</p>`
    }

    // Padrão — texto corrido por parcela, no estilo da minuta real: cada
    // parcela é uma frase completa (valor, prazo, forma de liquidação e
    // dados bancários), em vez de linha de tabela. A entrada leva a
    // qualificação "a título de sinal/e a princípio de pagamento"; as
    // parcelas seguintes aceitam também boleto bancário como alternativa.
    if (!parcelas.length) {
      return `<p class="clausula">O pagamento será realizado conforme condições acordadas entre as partes.</p>`
    }
    return parcelas.map((p: any) => {
      const banco = dadosBancarios(empresa, p)
      const prazoTxt = p.prazoDias
        ? `a ser pago em até ${numeroComExtenso(p.prazoDias)} ${tipoPrazoLabel(p.tipoPrazo)} contado(s) ${labelReferencia(p.referenciaEvento, p.numeroParcela)}`
        : (p.descricaoEvento ?? '')
      const isEntrada = p.numeroParcela === 1
      const qualificacao = isEntrada ? ' a título de sinal/e a princípio de pagamento,' : ''
      const meioLiquidacao = isEntrada
        ? 'a ser liquidado por meio de transferência bancária/pix'
        : 'parcela esta, a ser liquidada por meio de transferência bancária/pix'
      const ouBoleto = isEntrada ? '' : ' ou boleto bancário'
      return `<p class="clausula"><strong>${numeroOrdinalLabel(p.numeroParcela)}</strong> – Valor de: <strong>${fmt(p.valor)}</strong>${qualificacao} ${prazoTxt}, ${meioLiquidacao}${banco ? ` para a conta bancária da <strong>CONTRATADA</strong> mantida junto ao ${banco}` : ''}${ouBoleto}.</p>`
    }).join('\n')
  }

  const prazoEntrega = proposta?.prazoExecucao
    ?? '15 (quinze) dias úteis após a confirmação do pagamento da primeira parcela'

  const garantias = [
    modulo   ? `${modulo.fabricante ? modulo.fabricante + ' ' : ''}${modulo.modelo ? modulo.modelo + ' — ' : ''}Módulos Fotovoltaicos: ${garantiaModulo} contra defeito de fabricação` : null,
    inversor ? `${inversor.fabricante ? inversor.fabricante + ' ' : ''}${inversor.modelo ? inversor.modelo + ' — ' : ''}${isMicro ? 'Microinversor' : 'Inversor'}: ${garantiaInversor} contra defeitos de fabricação` : null,
    'String Box (caso acompanhe): 12 meses contra defeitos de fabricação (descargas elétricas não cobertas)',
    'Conectores MC4: 3 anos contra defeitos de fabricação',
    'Estrutura metálica: 20 anos de garantia contra defeitos de fabricação',
    'Produção de Energia: 30 anos (mínimo 80% da produção nominal)',
  ].filter(Boolean)

  // ── HTML ──────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Contrato — ${numProposta} — ${cliNome}</title>
  <style>${CSS}</style>
</head>
<body>

<table class="doc-table">
<thead><tr><td class="doc-head-cell">
  <div class="running-header">
    <div class="rh-logo">${logoTag(empresa?.logoUrl)}</div>
    <div class="rh-num">Contrato nº ${numProposta}</div>
  </div>
</td></tr></thead>
<tfoot><tr><td class="doc-foot-cell">
  <div class="running-footer">
    <span class="rf-site">${empresa?.site ?? 'www.atomtech.tec.br'}</span>
    <span>${[empNome, empEmail, empresa?.telefone].filter(Boolean).join(' · ')}</span>
  </div>
</td></tr></tfoot>
<tbody><tr><td class="doc-body-cell">

<!-- Corpo do documento -->
<div class="doc-body">

  <div class="titulo-contrato">Contrato de Compra e Venda e Prestação de Serviços</div>

  <!-- ── PARTES ── -->
  <p class="parte-bloco">
    <strong>CONTRATANTE:</strong> ${contratanteDesc}, denominado a partir deste momento como <strong>CONTRATANTE</strong>.
  </p>
  <p class="parte-bloco">
    <strong>CONTRATADA:</strong> <strong>${empNome}</strong>${empEnd ? `, com sede no ${empEnd}` : ''}${empCnpj ? `, inscrita no CNPJ sob o nº <strong>${empCnpj}</strong>` : ''}${empIE ? `, e no Cadastro Estadual sob o nº ${empIE}` : ''}${empEmail ? `, e-mail: ${empEmail}` : ''}, neste ato representada pelo(s) senhor(es) <strong>${repsText}</strong>, denominada a partir deste momento como <strong>CONTRATADA</strong>;
  </p>
  <p class="clausula">
    As partes acima identificadas, resolvem de comum acordo celebrar o presente instrumento de Contrato de Compra e Venda e Prestação de Serviços, mediante as cláusulas e condições seguintes:
  </p>

  <!-- ── DO OBJETO ── -->
  <p class="secao-titulo">Do Objeto</p>
  <p class="clausula">
    <strong>CLÁUSULA 1ª</strong> - O presente contrato tem como objeto a implantação e instalação de um Sistema de Energia Solar Fotovoltaico de <strong>${potenciaKwp} kWp</strong>, conforme especificado na Proposta nº <strong>${numProposta}</strong>, datada de <strong>${dataEmissao}</strong>, a qual passa a integrar este instrumento para todos os fins de direito.
  </p>
  ${listaKit ? `<p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> — Os itens que compõem o kit fotovoltaico são: ${listaKit}
  </p>` : ''}
  <p class="paragrafo">
    <strong>PARÁGRAFO ${listaKit ? 'SEGUNDO' : 'PRIMEIRO'}</strong> — Embora a <strong>CONTRATADA</strong> seja responsável pela intermediação e gestão da aquisição dos materiais, o FABRICANTE/FORNECEDOR poderá emitir as notas fiscais diretamente em nome da <strong>CONTRATANTE</strong>, evitando-se a bitributação dos materiais, nos termos da legislação tributária aplicável. Esta medida não interfere na responsabilidade da <strong>CONTRATADA</strong> pelo gerenciamento da entrega e instalação.
  </p>

  <!-- ── DO PREÇO ── -->
  <p class="secao-titulo">Do Preço</p>
  <p class="clausula">
    <strong>CLÁUSULA 2ª</strong> - O <strong>CONTRATANTE</strong> pagará à <strong>CONTRATADA</strong> o valor total de <strong>${fmt(valorTotal)} (${valorExtenso})</strong>, conforme as condições de pagamento abaixo:
  </p>
  ${renderPagamento()}
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> — Em caso de inadimplemento, haverá multa de 2% (dois por cento), juros de 1% (um por cento) ao mês pro rata die e correção pelo IGP-M/FGV.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> — Em caso de cobrança judicial, serão acrescidos custas processuais e honorários advocatícios de no mínimo 5% (cinco por cento) sobre o valor da causa.
  </p>

  <!-- ── PRAZO DE ENTREGA ── -->
  <p class="secao-titulo">Do Prazo de Entrega</p>
  <p class="clausula">
    <strong>CLÁUSULA 3ª</strong> - A entrega dos equipamentos se dará em até ${prazoEntrega}. O endereço para entrega e instalação será <strong>${cliEnd}</strong>, local informado pelo <strong>CONTRATANTE</strong>.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 4ª</strong> - Os materiais recebidos deverão ser guardados em local seguro, preferencialmente abrigado do sol e chuva, até sua devida instalação.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 5ª</strong> - Cabe à <strong>CONTRATADA</strong> acompanhar a entrega para conferência do material. Caso não seja possível, o <strong>CONTRATANTE</strong> deverá conferir a quantidade de volumes, condições físicas das embalagens e dados da Nota Fiscal. Avarias devem ser anotadas no verso do documento fiscal e comunicadas imediatamente à <strong>CONTRATADA</strong>. Recomenda-se efetuar registro fotográfico.
  </p>

  <!-- ── DA PRESTAÇÃO DE SERVIÇOS ── -->
  <p class="secao-titulo">Da Prestação de Serviços</p>
  <p class="clausula">
    <strong>CLÁUSULA 6ª</strong> - A prestação dos serviços de instalação do Gerador Fotovoltaico compreende os seguintes atos:
  </p>
  <ol class="lista-clausula">
    <li>Layout simplificado determinando a quantidade e disposição dos painéis;</li>
    <li>Ancoragem das estruturas para fixação dos equipamentos;</li>
    <li>Instalação dos painéis solares;</li>
    <li>Instalação de ${isMicro ? 'Microinversor(es) Solar(es)' : 'Inversor Solar'};</li>
    <li>Passagem de cabos elétricos;</li>
    <li>Instalação de quadros de proteção (stringbox);</li>
    <li>Configuração do sistema de monitoramento web de geração de energia, ficando a <strong>CONTRATANTE</strong> obrigado a disponibilizar uma conexão de internet via Wi-Fi para viabilizar a configuração e o correto funcionamento do monitoramento;</li>
    <li>Instalação, montagem e configuração dos equipamentos segundo as normas vigentes e recomendações dos Fornecedores dos equipamentos;</li>
    <li>Elaboração e execução do projeto elétrico fotovoltaico;</li>
    <li>Emissão de Anotação de Responsabilidade Técnica junto ao CREA/DF ou CRT/DF;</li>
    <li>Homologação do sistema junto à Concessionária de Distribuição de Energia Elétrica Local – Neoenergia Brasília;</li>
    <li>Solicitação de Acesso à rede da Concessionária de Distribuição de Energia Elétrica Local – Neoenergia Brasília.</li>
  </ol>

  <p class="clausula">
    <strong>CLÁUSULA 7ª</strong> - A homologação do sistema junto à Concessionária deve atender as premissas da Resolução nº 1.000/21 da ANEEL (Agência Nacional de Energia Elétrica) e aos Normativos da Neoenergia Brasília, e terão suas etapas executadas conforme segue:
  </p>
  <ol class="lista-clausula" type="a">
    <li>Elaboração Projeto e Protocolo Neoenergia Brasília — até 10 (dez) dias corridos — Responsável: <strong>CONTRATADA</strong>;</li>
    <li>Análise Projeto Neoenergia Brasília — 15 (quinze) dias corridos (prazo legal estabelecido pela ANEEL) — Responsável: Neoenergia Brasília;</li>
    <li>Instalação Equipamentos — entre 1 (um) e 3 (três) dias úteis, após entrega do material e cronograma a ser estabelecido entre as partes — Responsável: <strong>CONTRATADA</strong>;</li>
    <li>Vistoria e substituição de medidores Neoenergia Brasília — com a solicitação, em média o protocolo é gerado em até 2 (dois) dias úteis e a vistoria ocorre em até 5 (cinco) dias úteis após este procedimento — Responsável: <strong>CONTRATADA</strong> (solicitar vistoria) e Neoenergia Brasília (vistoria e substituição de medidores).</li>
  </ol>
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> — O prazo poderá ser alterado em caso fortuito ou força maior (ex.: condições climáticas), ou em comum acordo entre as partes.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> — O contrato extingue-se automaticamente quanto aos serviços com a conclusão dos trabalhos, mantidas as cláusulas de garantia.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO TERCEIRO</strong> — A <strong>CONTRATADA</strong> não poderá ser responsabilizada por atrasos da Distribuidora, comprometendo-se a tomar todas as providências possíveis e acionar a ANEEL se necessário.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO QUARTO</strong> — O <strong>CONTRATANTE</strong> deverá outorgar procuração à pessoa indicada pela <strong>CONTRATADA</strong> para representá-lo perante a Distribuidora e a ANEEL.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO QUINTO</strong> — A aprovação do projeto é de exclusiva responsabilidade da Distribuidora. A <strong>CONTRATADA</strong> empregará seus melhores esforços para obter decisão favorável.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 8ª</strong> - A instalação iniciará somente após entrega dos equipamentos pelo Fornecedor e aprovação da homologação junto à Concessionária.
  </p>

  <!-- ── DAS RESPONSABILIDADES ── -->
  <p class="secao-titulo">Das Responsabilidades das Partes</p>
  <p class="clausula"><strong>CLÁUSULA 9ª</strong> — É de responsabilidade do <strong>CONTRATANTE</strong>:</p>
  <ol class="lista-clausula" type="I">
    <li>A realização dos pagamentos sob pena das sanções contratuais;</li>
    <li>Providenciar estrutura de telhado e acesso ao local de instalação, livre e desimpedido;</li>
    <li>Facilitar o acesso das pessoas indicadas pela <strong>CONTRATADA</strong> e fornecer infraestrutura civil necessária;</li>
    <li>Disponibilizar todas as informações necessárias à realização dos serviços;</li>
    <li>Informar horário de funcionamento e período de trabalho no empreendimento;</li>
    <li>Não introduzir modificações nos equipamentos nem permitir acesso não autorizado, sob pena de perder a garantia;</li>
    <li>Comunicar imediatamente à <strong>CONTRATADA</strong> reclamações ou danos causados por seus subordinados;</li>
    <li>Realizar manutenção preventiva pelo menos 1 (uma) vez a cada ano, conforme explicitado na Cláusula 14ª, parágrafos 3º, 4º e 5º.</li>
  </ol>

  <p class="clausula"><strong>CLÁUSULA 10ª</strong> — É de responsabilidade da <strong>CONTRATADA</strong>:</p>
  <ol class="lista-clausula" type="I">
    <li>Prestar, com a devida dedicação e seriedade e da forma e do modo ajustados, os serviços descritos neste contrato;</li>
    <li>Realizar a visita técnica no imóvel para relacionar as informações técnicas;</li>
    <li>O cumprimento integral das disposições deste contrato, responsabilizando-se administrativamente e tecnicamente pela direção, supervisão, planejamento e execução dos serviços aqui contratados;</li>
    <li>O respeito das normas, especificações técnicas e condições de segurança aplicáveis à espécie de serviços prestados;</li>
    <li>O fornecimento das Notas Fiscais referentes à sua prestação de serviços;</li>
    <li>Empregar pessoal técnico e habilitado para a correta execução dos serviços ora contratados, estando ainda a <strong>CONTRATADA</strong> responsável pelas atividades realizadas pelo seu pessoal, inexistindo, em hipótese alguma, vínculo de natureza trabalhista entre o pessoal indicado pela <strong>CONTRATADA</strong> e a <strong>CONTRATANTE</strong>;</li>
    <li>Responsabilizar-se pelos atos e omissões praticados por seus subordinados, bem como por quaisquer danos que eles venham a sofrer ou causar para a <strong>CONTRATANTE</strong> ou terceiros;</li>
    <li>Arcar devidamente, nos termos da legislação trabalhista, com a remuneração e demais verbas laborais devidas a seus subordinados, inclusive encargos fiscais e previdenciários referentes às relações de trabalho;</li>
    <li>Arcar com todas as despesas de natureza tributária decorrentes dos serviços especificados neste contrato;</li>
    <li>Cumprir todas as determinações impostas pelas autoridades públicas competentes, referentes a estes serviços;</li>
    <li>Manter sigilosas, mesmo após findo este contrato, as informações privilegiadas de qualquer natureza às quais tenha acesso em virtude da execução destes serviços;</li>
    <li>Providenciar todos os meios e os equipamentos necessários à correta execução do serviço.</li>
  </ol>
  <p class="clausula">A <strong>CONTRATADA</strong> não será responsável por danos, atrasos ou rendimentos do Gerador Fotovoltaico nos seguintes casos:</p>
  <ol class="lista-clausula" type="a">
    <li>Negligência ou mau uso do Gerador Fotovoltaico pela <strong>CONTRATANTE</strong>;</li>
    <li>Motivos de caso fortuito ou força maior, incluindo, mas não se limitando a vendavais, tempestades, furacões, chuvas de granizo, atos de vandalismo, furtos, entre outros, sombreamento decorrente de crescimento de árvores e de novas construções erigidas próximas ao Gerador Fotovoltaico;</li>
    <li>Obras de construção civil não previstas no projeto inicial;</li>
    <li>Mudança no projeto ou mudanças estruturais do Gerador Fotovoltaico feita pela <strong>CONTRATANTE</strong> ou por terceiros após sua instalação pela <strong>CONTRATADA</strong>; e</li>
    <li>Descumprimento de prazos de emissão do orçamento de conexão e de homologação do Gerador Fotovoltaico por parte da Distribuidora de Energia.</li>
  </ol>

  <!-- ── DA RESCISÃO ── -->
  <p class="secao-titulo">Da Rescisão</p>
  <p class="clausula">
    <strong>CLÁUSULA 11ª</strong> — Em caso de rescisão pelo <strong>CONTRATANTE</strong>, este pagará multa de 5% (cinco por cento) sobre o valor do contrato previsto na Cláusula 2ª.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 12ª</strong> — Além da multa, o <strong>CONTRATANTE</strong> indenizará a <strong>CONTRATADA</strong> pelas despesas havidas para obtenção do orçamento de conexão, incluindo taxas da Distribuidora, contratação de engenheiro eletricista e ART emitida junto ao CREA.
  </p>

  <!-- ── DA GARANTIA ── -->
  <p class="secao-titulo">Da Garantia</p>
  <p class="clausula">
    <strong>CLÁUSULA 13ª</strong> - As garantias dos produtos são:
  </p>
  <ul class="lista-clausula">
    ${garantias.map(g => `<li>${g}</li>`).join('\n    ')}
  </ul>
  <p class="clausula">
    <strong>CLÁUSULA 14ª</strong> — O prazo de garantia dos serviços de instalação do Gerador Fotovoltaico é de 12 (doze) meses, contados da data de emissão da Nota Fiscal de Serviços.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> — A <strong>CONTRATADA</strong> não será responsável em prestar a garantia nos casos de:
  </p>
  <ul class="lista-clausula">
    <li>Eventuais diminuições na produção de energia dos Equipamentos e/ou por danos causados pela <strong>CONTRATANTE</strong> e/ou terceiros ao Equipamento após a instalação e correta operação dos mesmos, bem como por sombreamento que seria impossível prever à época da assinatura do presente contrato;</li>
    <li>Mau uso, esforços indevidos, ou qualquer tipo de uso diferente daquele proposto para cada equipamento, bem como por problemas causados por montagem e/ou desmontagem, ou relacionados a adaptações e/ou alterações realizadas nos equipamentos por terceiros não indicados pela <strong>CONTRATADA</strong>;</li>
    <li>Problemas relacionados a condições inadequadas do local onde os equipamentos foram instalados, tais como telhados pouco resistentes etc.;</li>
    <li>Danos causados por serviços de limpeza ou conserto contratados pela <strong>CONTRATANTE</strong> e que não tenham sido executados pela <strong>CONTRATADA</strong> ou empresa por ela indicada;</li>
    <li>Danos causados por acidentes, quedas, sinistros ou agentes da natureza;</li>
    <li>Falta de manutenção preventiva periódica.</li>
  </ul>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> — A <strong>CONTRATADA</strong> se compromete a corrigir eventual falha no sistema de funcionamento do Gerador Fotovoltaico, sem cobrança de qualquer taxa de visita ou de conserto, se durante o prazo de garantia for constatado vício decorrente da instalação dos equipamentos.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO TERCEIRO</strong> — A manutenção preventiva do Gerador Fotovoltaico deve ser realizada periodicamente e às expensas da <strong>CONTRATANTE</strong> no mínimo 1 (uma) vez a cada 12 (doze) meses ou sempre que necessário.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO QUARTO</strong> — A manutenção preventiva consiste na limpeza dos módulos, inspeção visual da instalação, verificação e reaperto das estruturas de fixação dos módulos, verificação e reaperto dos terminais elétricos e conexões de todo o sistema instalado, medições elétricas de tensão e corrente, verificação e teste dos componentes elétricos do sistema instalado e inspeção do aterramento do sistema.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO QUINTO</strong> — Após o decurso do prazo de garantia, ou caso venha a ser constatado que a <strong>CONTRATANTE</strong> concorreu para a falha do Gerador Fotovoltaico, a visita e o respectivo conserto serão remunerados pelo total de horas de dedicação, à razão da taxa vigente à época a ser informada oportunamente, bem como o custo de deslocamento a ser contabilizado.
  </p>

  <!-- ── DAS RESPONSABILIDADES TRIBUTÁRIAS ── -->
  <p class="secao-titulo">Das Responsabilidades Tributárias</p>
  <p class="clausula">
    <strong>CLÁUSULA 15ª</strong> — Cada uma das partes será responsável exclusiva e responderá por todos os tributos ou encargos incidentes sobre a atividade que lhe couber na execução do presente contrato, obrigando-se a <strong>CONTRATADA</strong> a observar, rigorosamente, a legislação trabalhista vigente e as disposições coletivas aplicáveis à categoria profissional de seus empregados na região de execução dos serviços, sendo que os seus funcionários designados para a execução dos serviços objeto do presente contrato não guardarão qualquer relação de trabalho ou emprego com a <strong>CONTRATANTE</strong>, sendo a <strong>CONTRATADA</strong> única e exclusiva responsável pelas obrigações trabalhistas e cíveis, inclusive decorrentes de acidente de trabalho.
  </p>

  <!-- ── SERVIÇOS NÃO INCLUÍDOS ── -->
  <p class="secao-titulo">Dos Serviços Não Incluídos</p>
  <p class="clausula"><strong>CLÁUSULA 16ª</strong> — Não estão incluídos no presente instrumento os seguintes serviços:</p>
  <ol class="lista-clausula" type="I">
    <li>Fornecimento de Geradores para o Sistema;</li>
    <li>A <strong>CONTRATADA</strong> considera que não existirão interferências com outros sistemas elétricos ou civis;</li>
    <li>Adequações técnicas no imóvel necessárias para o pleno funcionamento do sistema, tais como: aterramento, quadros de distribuição incompatíveis ou insuficientes para acréscimo de dispositivos de proteção, criação de infraestrutura para instalação de inversor em ambientes inadequados para o seu pleno funcionamento ou infraestrutura customizada, adequações em telhados (exceto substituição de telhas que por ventura se quebrem no trabalho de instalação), entre outros;</li>
    <li>A <strong>CONTRATADA</strong> considera a necessidade de obtenção de vistorias ou aprovações junto aos órgãos oficiais (inclusas na proposta);</li>
    <li>O preço apresentado não inclui taxas ou prêmios relativos à contratação de seguros de risco de engenharia, incêndio, responsabilidade civil ou quaisquer outros;</li>
    <li>A <strong>CONTRATADA</strong> considera que não haverá paralisações parciais ou totais no andamento da obra, por motivos alheios à responsabilidade dela, tais como a não liberação de áreas, atrasos nas obras civis ou nos serviços de terceiros, aprovação de projetos etc. Caso ocorram atrasos, os custos relativos serão repassados integralmente à <strong>CONTRATANTE</strong>;</li>
    <li>Não são considerados adicionais de insalubridade para as equipes de instalação e manutenção; em caso de necessidade, os valores do contrato sofrerão alteração, a ser feita por aditivo contratual.</li>
  </ol>

  <!-- ── DISPOSIÇÕES GERAIS ── -->
  <p class="secao-titulo">Disposições Gerais</p>
  <p class="clausula">
    <strong>CLÁUSULA 17ª</strong> — Todos os pagamentos das despesas ou custos de mão de obra técnica, de manutenção corretiva e substituição de equipamento que estejam fora da garantia legal serão de responsabilidade da <strong>CONTRATANTE</strong>.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 18ª</strong> — A <strong>CONTRATADA</strong> poderá prestar serviço de manutenção nos equipamentos da <strong>CONTRATANTE</strong> se for do interesse dela; no entanto, será regido por outro contrato de prestação de serviços para este fim.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> — Após o prazo legal de garantia do serviço de instalação, caso a <strong>CONTRATANTE</strong> necessite de qualquer serviço da <strong>CONTRATADA</strong>, deverá solicitar um novo orçamento para o serviço pretendido.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> — Quanto à garantia dos produtos e equipamentos vendidos pela <strong>CONTRATADA</strong>, caso apresentem defeitos de fabricação, serão substituídos pela <strong>CONTRATADA</strong>, desde que estejam dentro do prazo de garantia do fabricante e atendam aos requisitos previstos no termo de garantia. A substituição ocorrerá por produto igual ou equivalente (em caso de obsolescência) em até 30 (trinta) dias.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO TERCEIRO</strong> — Após a instalação final, caso seja necessário o retorno da equipe da <strong>CONTRATADA</strong> para serviços adicionais não previstos neste documento, tais como reconfiguração de aplicativo e/ou inversor, adequações das instalações, alteração de posição de inversores e/ou painéis, adequações em instalações não previstas, entre outras, esse atendimento será orçado e cobrado à parte, mediante acordo prévio entre as partes.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 19ª</strong> — Este contrato é firmado em caráter irretratável e irrevogável, obrigando as partes que aqui assinam e seus sucessores a qualquer título.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 20ª</strong> — Pode a <strong>CONTRATADA</strong> executar qualquer medida protetora do domínio do objeto deste instrumento, bem como se proteger contra qualquer ato que a impeça de exercer tal direito.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 21ª</strong> — A tolerância de uma parte para com a outra, relativamente ao descumprimento de obrigações aqui assumidas, não implicará novação ou renúncia a qualquer direito, constituindo mera liberalidade, não impedindo a parte tolerante de exigir da outra, a qualquer tempo, o fiel e cabal cumprimento deste contrato.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 22ª</strong> — É vedada a cessão de direitos ou obrigações derivadas deste contrato sem o prévio consentimento, por escrito, da outra parte, o qual não poderá ser negado sem justificativa plausível.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 23ª</strong> — Este contrato não poderá ser alterado, nem haverá renúncia das suas disposições, exceto por meio de aditamento por escrito assinado pelas partes, observado o disposto na legislação aplicável.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 24ª</strong> — A decretação de invalidade, ilegalidade ou inexequibilidade de qualquer das cláusulas ou disposições contidas neste contrato por qualquer tribunal ou outro órgão competente não invalida as demais cláusulas e disposições remanescentes. Na ocorrência de que trata esta cláusula, as partes negociarão de boa-fé para ajustar as cláusulas e disposições por outras que não sejam inválidas, ilegais ou inexequíveis e que mantenham, em todas as circunstâncias, o equilíbrio dos interesses comerciais das partes.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 25ª</strong> — Notificações e outras correspondências a serem enviadas por uma parte a outra, relativas a este contrato, deverão ser enviadas por meio escrito, através de e-mail ou correio, para os endereços constantes no preâmbulo deste contrato, com entrega comprovada.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 26ª</strong> — As partes se comprometem a manter seus dados informados no contrato permanentemente atualizados mediante notificação à outra parte, sob pena de serem consideradas notificadas nos endereços aqui constantes, caso tenham sido alterados sem a notificação da outra parte.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 27ª</strong> — Este contrato constitui título executivo extrajudicial, nos termos do artigo 784, inciso III, do Código de Processo Civil, para efeitos de cobrança de todos os valores dele decorrentes.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 28ª</strong> — Este contrato será regido e interpretado, em todos os seus aspectos, de acordo com as leis brasileiras e com a regulamentação da ANEEL relativa à geração distribuída de energia elétrica, entre outros atos normativos, e estará sujeito a toda a legislação superveniente correlata com o objeto deste contrato.
  </p>

  <!-- ── DO FORO ── -->
  <p class="secao-titulo">Do Foro</p>
  <p class="clausula">
    As partes elegem o foro da cidade de <strong>${cidade}</strong> para dirimir as questões oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.
  </p>

  <p class="clausula" style="margin-top:3mm;">
    E por estarem as partes, <strong>CONTRATANTE</strong> e <strong>CONTRATADA</strong>, em pleno acordo com o disposto neste instrumento particular (PROPOSTA nº <strong>${numProposta}</strong> de <strong>${dataEmissao}</strong>), assinam-no eletronicamente, sem necessidade de testemunhas, ou fisicamente na presença de duas testemunhas, em 2 (duas) vias de igual teor e forma, destinando-se uma via para cada contratante.
  </p>

  <!-- ── DATA E ASSINATURAS ── -->
  <div class="data-local">
    ${cidade}, ${dataContrato || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
  </div>

  <div class="assinaturas-bloco">
    <div style="margin-bottom:8mm;">
      <div class="assinatura-wrapper">
        <div class="assinatura-espaco"></div>
        <div class="assinatura-linha">
          ${cliNome}<br>
          <small>CPF: ${cliCpf || '___.___.___-__'}</small><br>
          <small>CONTRATANTE</small>
        </div>
      </div>
    </div>

    <div>
      <p style="font-weight:700;font-size:9.5pt;margin-bottom:3mm;text-align:center;">
        ${empNome}<br><small>CNPJ: ${empCnpj}</small>
      </p>
      <div>
        <div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            ${rep1Nome}<br><small>CPF: ${rep1Cpf}</small>
          </div>
        </div>
        ${hasRep2 ? `<div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            ${rep2Nome}<br><small>CPF: ${rep2Cpf}</small>
          </div>
        </div>` : ''}
      </div>
    </div>
  </div>

</div><!-- fim doc-body -->

</td></tr></tbody>
</table>
<script>
  window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };
</script>
</body>
</html>`
}

// ─── FUNÇÃO PÚBLICA ───────────────────────────────────────────────

export function abrirContratoNoNavegador(dados: any, formaPagamento: string = ''): void {
  const html = buildHtml(dados, formaPagamento)
  const janela = window.open('', '_blank')
  if (!janela) {
    alert('Não foi possível abrir o contrato. Verifique se popups estão permitidos neste site.')
    return
  }
  janela.document.open()
  janela.document.write(html)
  janela.document.close()
  janela.focus()
  // A impressão é disparada pelo script interno do HTML após ajustar o rodapé ao pé da página
}
