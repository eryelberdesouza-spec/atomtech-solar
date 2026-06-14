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

function valorPorExtenso(n: number): string {
  if (n === 0) return 'zero reais'
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

  function menorQueMil(num: number): string {
    if (num === 0) return ''
    if (num === 100) return 'cem'
    const c = Math.floor(num / 100)
    const resto = num % 100
    const partes: string[] = []
    if (c > 0) partes.push(c === 1 && resto > 0 ? 'cento' : centenas[c])
    if (resto > 0) {
      if (resto < 20) partes.push(unidades[resto])
      else {
        const d = Math.floor(resto / 10)
        const u = resto % 10
        if (u > 0) partes.push(dezenas[d] + ' e ' + unidades[u])
        else partes.push(dezenas[d])
      }
    }
    return partes.join(' e ')
  }

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
    1: 'Entrada', 2: '2ª Parcela', 3: '3ª Parcela', 4: '4ª Parcela',
    5: '5ª Parcela', 6: '6ª Parcela', 7: '7ª Parcela', 8: '8ª Parcela',
  }
  return ord[n] ?? `${n}ª Parcela`
}

function logoTag(logoUrl: string | null | undefined): string {
  if (logoUrl) return `<img src="${logoUrl}" alt="logo" />`
  return `<span class="logo-text">ATOMTECH</span>`
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

    // Padrão — tabela de parcelas
    if (!parcelas.length) {
      return `<p class="clausula">O pagamento será realizado conforme condições acordadas entre as partes.</p>`
    }
    let html = `<table class="tabela-pagamento"><thead><tr>
      <th>#</th><th>Descrição</th><th>Valor</th><th>Prazo</th><th>Forma de Pagamento</th>
    </tr></thead><tbody>`
    parcelas.forEach((p: any) => {
      const meios     = Array.isArray(p.meiosPagamento) ? p.meiosPagamento.join(' / ') : ''
      const prazoLabel = p.prazoDias
        ? `Até ${p.prazoDias} ${tipoPrazoLabel(p.tipoPrazo)} contados ${labelReferencia(p.referenciaEvento, p.numeroParcela)}`
        : (p.descricaoEvento ?? '')
      const banco = dadosBancarios(empresa, p)
      html += `<tr>
        <td style="text-align:center;font-weight:700;">${numeroOrdinalLabel(p.numeroParcela)}</td>
        <td>${p.descricaoEvento ?? ''}</td>
        <td style="font-weight:700;white-space:nowrap;">${fmt(p.valor)}</td>
        <td style="font-size:8.5pt;">${prazoLabel}</td>
        <td style="font-size:8.5pt;">${meios}${banco ? '<br><small>' + banco + '</small>' : ''}</td>
      </tr>`
    })
    html += `</tbody></table>`
    return html
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
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> — Embora a <strong>CONTRATADA</strong> seja responsável pela intermediação e gestão da aquisição dos materiais, o FABRICANTE/FORNECEDOR poderá emitir as notas fiscais diretamente em nome da <strong>CONTRATANTE</strong>, evitando-se a bitributação dos materiais, nos termos da legislação tributária aplicável. Esta medida não interfere na responsabilidade da <strong>CONTRATADA</strong> pelo gerenciamento da entrega e instalação.
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
    <li>Integração com o sistema existente (quando aplicável);</li>
    <li>Configuração do sistema de monitoramento web, sendo necessária conexão Wi-Fi pelo <strong>CONTRATANTE</strong>;</li>
    <li>Instalação, montagem e configuração conforme normas vigentes e recomendações dos fabricantes;</li>
    <li>Elaboração e execução do projeto elétrico fotovoltaico;</li>
    <li>Emissão de ART junto ao CREA/DF ou CRT/DF;</li>
    <li>Homologação junto à Concessionária de Energia Elétrica Local;</li>
    <li>Solicitação de Acesso à rede da Distribuidora Local.</li>
  </ol>

  <p class="clausula">
    <strong>CLÁUSULA 7ª</strong> - A homologação junto à Concessionária atenderá a Resolução nº 1.000/21 da ANEEL e os normativos da Distribuidora, com as seguintes etapas:
  </p>
  <ol class="lista-clausula" type="a">
    <li>Elaboração do Projeto e Protocolo junto à Distribuidora — até 10 dias corridos — Responsável: <strong>CONTRATADA</strong>;</li>
    <li>Análise do Projeto pela Distribuidora — 15 dias corridos (prazo legal ANEEL) — Responsável: Distribuidora;</li>
    <li>Instalação dos Equipamentos — 1 a 3 dias úteis após entrega do material — Responsável: <strong>CONTRATADA</strong>;</li>
    <li>Vistoria e substituição de medidores — em média 7 dias úteis — Responsável: <strong>CONTRATADA</strong> (solicitar) e Distribuidora (executar).</li>
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
    <li>Realizar manutenção preventiva pelo menos 2 (duas) vezes ao ano.</li>
  </ol>

  <p class="clausula"><strong>CLÁUSULA 10ª</strong> — É de responsabilidade da <strong>CONTRATADA</strong>:</p>
  <ol class="lista-clausula" type="I">
    <li>Prestar os serviços com dedicação e da forma ajustada neste contrato;</li>
    <li>Realizar visita técnica no imóvel para levantamento das informações;</li>
    <li>Cumprir integralmente as disposições deste contrato, responsabilizando-se pela direção, supervisão e execução;</li>
    <li>Respeitar normas técnicas e condições de segurança aplicáveis;</li>
    <li>Fornecer Notas Fiscais referentes à sua prestação de serviços;</li>
    <li>Empregar pessoal técnico habilitado para a execução dos serviços;</li>
    <li>Responsabilizar-se pelos atos de seus subordinados e danos eventualmente causados;</li>
    <li>Providenciar todos os meios e equipamentos necessários à execução.</li>
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
    <strong>CLÁUSULA 14ª</strong> — A garantia dos serviços de instalação é de 12 (doze) meses, contados da emissão da Nota Fiscal de Serviços.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> — A garantia não cobre: (a) mau uso; (b) intervenção de terceiros não autorizados; (c) condições inadequadas do local; (d) danos por acidentes, sinistros ou agentes da natureza; (e) falta de manutenção preventiva periódica.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> — A <strong>CONTRATADA</strong> corrigirá falhas decorrentes da instalação sem cobrança durante o prazo de garantia.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO TERCEIRO</strong> — A manutenção preventiva deve ser realizada às expensas do <strong>CONTRATANTE</strong> no mínimo 1 (uma) vez a cada 12 (doze) meses.
  </p>

  <!-- ── DAS RESPONSABILIDADES TRIBUTÁRIAS ── -->
  <p class="secao-titulo">Das Responsabilidades Tributárias</p>
  <p class="clausula">
    <strong>CLÁUSULA 15ª</strong> — Cada parte responderá pelos tributos incidentes sobre a atividade que lhe couber. Os funcionários da <strong>CONTRATADA</strong> não guardarão qualquer relação de trabalho ou emprego com o <strong>CONTRATANTE</strong>.
  </p>

  <!-- ── SERVIÇOS NÃO INCLUÍDOS ── -->
  <p class="secao-titulo">Dos Serviços Não Incluídos</p>
  <p class="clausula"><strong>CLÁUSULA 16ª</strong> — Não estão incluídos neste instrumento:</p>
  <ol class="lista-clausula" type="I">
    <li>Fornecimento de geradores para o sistema;</li>
    <li>Interferências com outros sistemas elétricos ou civis não previstas;</li>
    <li>Adequações técnicas no imóvel (aterramento, quadros incompatíveis, infraestrutura customizada, adequações em telhados — exceto substituição de telhas quebradas durante a instalação);</li>
    <li>Taxas ou prêmios de seguros de risco de engenharia, incêndio, responsabilidade civil ou outros;</li>
    <li>Paralisações por motivos alheios à <strong>CONTRATADA</strong> (não liberação de áreas, atrasos em obras civis, etc.).</li>
  </ol>

  <!-- ── DISPOSIÇÕES GERAIS ── -->
  <p class="secao-titulo">Disposições Gerais</p>
  <p class="clausula">
    <strong>CLÁUSULA 17ª</strong> — Despesas de manutenção corretiva e substituição de equipamento fora da garantia são de responsabilidade do <strong>CONTRATANTE</strong>.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 18ª</strong> — A <strong>CONTRATADA</strong> poderá prestar serviço de manutenção se do seu interesse, regido por contrato específico.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 19ª</strong> — Este contrato é firmado em caráter irretratável e irrevogável, obrigando as partes e seus sucessores.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 20ª</strong> — É vedada a cessão de direitos ou obrigações sem o prévio consentimento escrito da outra parte.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 21ª</strong> — Alterações somente por aditamento escrito assinado pelas partes.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 22ª</strong> — Notificações deverão ser enviadas por escrito (e-mail ou correio) com entrega comprovada.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 23ª</strong> — Este contrato constitui título executivo extrajudicial nos termos do art. 784, III, do CPC.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 24ª</strong> — Este contrato é regido pelas leis brasileiras e pela regulamentação da ANEEL sobre geração distribuída.
  </p>

  <!-- ── DO FORO ── -->
  <p class="secao-titulo">Do Foro</p>
  <p class="clausula">
    As partes elegem o foro da cidade de <strong>${cidade}</strong> para dirimir questões oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.
  </p>

  <p class="clausula" style="margin-top:3mm;">
    E por estarem as partes em pleno acordo com o disposto neste instrumento (PROPOSTA nº <strong>${numProposta}</strong> de <strong>${dataEmissao}</strong>), assinam-no eletronicamente ou fisicamente na presença das testemunhas abaixo, em 2 (duas) vias de igual teor.
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

    <div style="margin-top:8mm;page-break-inside:avoid;break-inside:avoid;">
      <p style="font-size:9.5pt;margin-bottom:3mm;text-align:center;font-weight:700;">Testemunhas:</p>
      <div>
        <div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            _______________________________<br>
            <small>CPF: ___.___.___-__</small><br>
            <small>Testemunha 1</small>
          </div>
        </div>
        <div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            _______________________________<br>
            <small>CPF: ___.___.___-__</small><br>
            <small>Testemunha 2</small>
          </div>
        </div>
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
