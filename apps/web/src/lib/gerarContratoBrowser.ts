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

// Converte número para extenso em português
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
    if (k > 0) partes.push(menorQueMil(k) + (k === 1 ? ' mil' : ' mil'))
  }
  const resto = reais % 1_000
  if (resto > 0) partes.push(menorQueMil(resto))

  const textoReais = partes.join(' e ') + (reais === 1 ? ' real' : ' reais')

  if (centavos > 0) {
    const txtCents = menorQueMil(centavos) + (centavos === 1 ? ' centavo' : ' centavos')
    return textoReais + ' e ' + txtCents
  }
  return textoReais
}

function enderecoCliente(c: any): string {
  const partes: string[] = []
  if (c?.endereco) partes.push(c.endereco + (c.numero ? ', ' + c.numero : ''))
  if (c?.complemento) partes.push(c.complemento)
  if (c?.bairro) partes.push(c.bairro)
  if (c?.cidade && c?.estado) partes.push(`${c.cidade}/${c.estado}`)
  else if (c?.cidade) partes.push(c.cidade)
  if (c?.cep) partes.push(`CEP ${c.cep}`)
  return partes.join(' – ') || '(endereço não informado)'
}

function enderecoEmpresa(e: any): string {
  const partes: string[] = []
  if (e?.endereco) partes.push(e.endereco)
  if (e?.cidade && e?.estado) partes.push(`${e.cidade}/${e.estado}`)
  if (e?.cep) partes.push(`CEP ${e.cep}`)
  return partes.join(', ')
}

function dadosBancarios(e: any, parcela: any): string {
  // Prefere dados bancários da parcela, fallback para empresa
  if (parcela?.dadosBancariosJson) {
    const d = parcela.dadosBancariosJson
    const linhas: string[] = []
    if (d.banco) linhas.push(`Banco ${d.banco}`)
    if (d.agencia) linhas.push(`Agência ${d.agencia}`)
    if (d.conta) linhas.push(`Conta ${d.conta}`)
    if (d.pix) linhas.push(`PIX: ${d.pix}`)
    if (linhas.length) return linhas.join(' - ')
  }
  const linhas: string[] = []
  if (e?.bancoNome) {
    const cod = e.bancoCodigo ? ` (${e.bancoCodigo})` : ''
    linhas.push(`Banco ${e.bancoNome}${cod}`)
  }
  if (e?.bancoAgencia) linhas.push(`Agência ${e.bancoAgencia}`)
  if (e?.bancoConta) linhas.push(`Conta ${e.bancoConta}`)
  if (e?.bancoPixChave) linhas.push(`PIX: ${e.bancoPixChave}`)
  return linhas.join(' - ')
}

// Label legível para referência de evento de pagamento
function labelReferencia(ref: string, n: number): string {
  const map: Record<string, string> = {
    assinatura_contrato: 'da data da última assinatura do contrato',
    entrega_equipamentos: 'da data de entrega dos equipamentos',
    conclusao_servicos: 'da data de conclusão dos serviços',
    vencimento_parcela_anterior: `do vencimento da ${n - 1}ª Parcela`,
    aprovacao_financiamento: 'da aprovação do financiamento',
  }
  return map[ref] ?? ref
}

function tipoPrazoLabel(tipo: string): string {
  return tipo === 'uteis' ? 'dias úteis' : 'dias corridos'
}

function ordinalExtenso(n: number): string {
  const ord: Record<number, string> = {
    1: 'primeira', 2: 'segunda', 3: 'terceira', 4: 'quarta',
    5: 'quinta', 6: 'sexta', 7: 'sétima', 8: 'oitava',
  }
  return ord[n] ?? `${n}ª`
}

function numeroOrdinalLabel(n: number): string {
  const ord: Record<number, string> = {
    1: 'Entrada', 2: '2ª Parcela', 3: '3ª Parcela', 4: '4ª Parcela',
    5: '5ª Parcela', 6: '6ª Parcela',
  }
  return ord[n] ?? `${n}ª Parcela`
}

// ─── CSS ──────────────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    color: #000;
    background: #fff;
    line-height: 1.55;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 22mm 20mm;
    background: #fff;
    position: relative;
    page-break-after: always;
  }
  .page:last-child { page-break-after: avoid; }

  /* Logo header */
  .header {
    display: flex;
    align-items: center;
    margin-bottom: 8mm;
    background: #1a2744;
    border-radius: 4px;
    padding: 6px 12px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header img { height: 36px; }
  .header-line { flex: 1; }

  /* Title */
  .titulo-contrato {
    text-align: center;
    font-size: 14pt;
    font-weight: 700;
    text-decoration: underline;
    text-transform: uppercase;
    margin-bottom: 8mm;
    letter-spacing: 0.04em;
  }

  /* Sections */
  .secao-titulo {
    font-size: 11pt;
    font-weight: 700;
    text-decoration: underline;
    text-transform: uppercase;
    margin: 6mm 0 3mm;
  }
  .clausula {
    text-align: justify;
    margin-bottom: 3mm;
    hyphens: auto;
  }
  .clausula strong { font-weight: 700; }
  .paragrafo {
    text-align: justify;
    margin-bottom: 2.5mm;
    hyphens: auto;
  }
  .lista-clausula {
    margin: 2mm 0 2mm 10mm;
  }
  .lista-clausula li {
    margin-bottom: 1.5mm;
    text-align: justify;
  }

  /* Partes */
  .parte-bloco {
    text-align: justify;
    margin-bottom: 4mm;
    hyphens: auto;
  }
  .parte-bloco strong { font-weight: 700; }

  /* Pagamento table */
  .tabela-pagamento {
    width: 100%;
    border-collapse: collapse;
    margin: 3mm 0;
    font-size: 10pt;
  }
  .tabela-pagamento th {
    background: #f5f5f5;
    border: 1px solid #ccc;
    padding: 4px 8px;
    text-align: left;
    font-weight: 700;
    font-size: 9.5pt;
  }
  .tabela-pagamento td {
    border: 1px solid #ccc;
    padding: 4px 8px;
    vertical-align: top;
  }

  /* Assinaturas */
  .assinaturas-bloco {
    margin-top: 12mm;
    text-align: center;
  }
  .assinatura-wrapper {
    display: inline-block;
    width: 220px;
    margin: 0 20px;
    vertical-align: bottom;
  }
  .assinatura-espaco {
    height: 18mm;
  }
  .assinatura-linha {
    border-top: 1px solid #000;
    padding-top: 3px;
    font-size: 10pt;
    text-align: center;
  }
  .data-local {
    text-align: right;
    font-size: 11pt;
    margin: 8mm 0 4mm;
  }

  @media print {
    @page { size: A4; margin: 0; }
    body { margin: 0; }
    .page { margin: 0; }
  }
`

// ─── LOGO SVG INLINE (fallback se empresa.logoUrl indisponível) ──

function logoTag(logoUrl: string | null | undefined): string {
  if (logoUrl) return `<img src="${logoUrl}" style="height:36px;" />`
  return `<span style="font-size:16pt;font-weight:900;letter-spacing:-1px;">ATOMTECH</span>`
}

// ─── GERAÇÃO DO HTML ──────────────────────────────────────────────

function buildHtml(dados: any): string {
  const { proposta, dimensionamento, equipamentos, precificacao, condicoesComerciais, empresa, cliente } = dados

  // Seleciona condição comercial ativa (parcelado_marcos preferencial)
  const condicoes: any[] = condicoesComerciais ?? []
  const condicaoAtiva = condicoes.find((c: any) => c.ativa) ?? condicoes[0]
  const parcelas: any[] = condicaoAtiva?.parcelas ?? []

  const valorTotal = Number(condicaoAtiva?.valorTotal ?? precificacao?.precoFinal ?? 0)
  const valorExtenso = valorPorExtenso(valorTotal)
  const potenciaKwp = Number(dimensionamento?.potenciaFinalKwp ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const modulo    = (equipamentos ?? []).find((e: any) => e.tipo === 'modulo')
  const inversor  = (equipamentos ?? []).find((e: any) => ['inversor', 'microinversor', 'otimizador'].includes(e.tipo))
  const isMicro   = inversor?.tipo === 'microinversor'

  // Garantias a partir dos equipamentos
  const garantiaModulo   = modulo?.garantiaAnos   ? `${modulo.garantiaAnos} anos` : '12 anos'
  const garantiaInversor = inversor?.garantiaAnos  ? `${inversor.garantiaAnos} anos` : '12 anos'

  const empNome = empresa?.nome ?? 'ATOM TECNOLOGIA INSTALAÇÕES E SERVIÇOS LTDA'
  const empCnpj = empresa?.cnpj ?? ''
  const empIE   = empresa?.inscricaoEstadual ?? ''
  const empEnd  = enderecoEmpresa(empresa)
  const empEmail = empresa?.email ?? ''

  const rep1Nome = empresa?.rep1Nome ?? '_______________________________'
  const rep1Cpf  = empresa?.rep1Cpf  ?? '___.___.___-__'
  const rep1Desc = empresa?.rep1Descricao ?? ''
  const rep2Nome = empresa?.rep2Nome ?? '_______________________________'
  const rep2Cpf  = empresa?.rep2Cpf  ?? '___.___.___-__'
  const rep2Desc = empresa?.rep2Descricao ?? ''

  const cliNome  = cliente?.nome ?? proposta?.clienteNome ?? ''
  const cliCpf   = cliente?.cpfCnpj ?? ''
  const cliEnd   = enderecoCliente(cliente)
  const cliEmail = cliente?.email ?? ''
  const cliTipoPessoa = cliente?.tipoPessoa ?? 'fisica'

  const numProposta   = proposta?.numero ?? ''
  const dataEmissao   = fmtDate(proposta?.dataEmissao)
  const dataContrato  = fmtDate(proposta?.dataValidade ?? proposta?.dataEmissao)
  const cidade        = empresa?.cidade ?? 'Brasília'

  // ── REPRESENTAÇÃO DO CONTRATANTE ──
  const contratanteDesc = cliTipoPessoa === 'juridica'
    ? `<strong>${cliNome}</strong>, inscrita no CNPJ sob nº <strong>${cliCpf}</strong>, com sede em ${cliEnd}${cliEmail ? `, e-mail: ${cliEmail}` : ''}`
    : `<strong>${cliNome}</strong>, ${cliCpf ? `portador do CPF: <strong>${cliCpf}</strong>, ` : ''}residente e domiciliado no ${cliEnd}${cliEmail ? `, e-mail: ${cliEmail}` : ''}`

  // ── REPRESENTAÇÃO DA CONTRATADA ──
  const rep1Full = rep1Desc
    ? `${rep1Nome}, ${rep1Desc}${rep1Cpf ? ` e CPF ${rep1Cpf}` : ''}`
    : rep1Nome + (rep1Cpf ? `, CPF ${rep1Cpf}` : '')
  const rep2Full = rep2Desc
    ? `${rep2Nome}, ${rep2Desc}${rep2Cpf ? ` e CPF/MF nº ${rep2Cpf}` : ''}`
    : rep2Nome + (rep2Cpf ? `, CPF ${rep2Cpf}` : '')
  const hasRep2 = !!(empresa?.rep2Nome)
  const repsText = hasRep2
    ? `${rep1Full}, e <strong>${rep2Full}</strong>`
    : rep1Full

  // ── CLÁUSULA 2 — PREÇO (parcelas) ──
  function renderParcelas(): string {
    if (!parcelas.length) {
      return `<p class="clausula">O pagamento será realizado conforme condições acordadas entre as partes.</p>`
    }
    let html = `<table class="tabela-pagamento"><thead><tr>
      <th>#</th><th>Descrição</th><th>Valor</th><th>Prazo</th><th>Forma</th>
    </tr></thead><tbody>`
    parcelas.forEach((p: any) => {
      const meios = Array.isArray(p.meiosPagamento) ? p.meiosPagamento.join(' / ') : ''
      const prazoLabel = p.prazoDias
        ? `em até ${p.prazoDias} ${tipoPrazoLabel(p.tipoPrazo)} contados ${labelReferencia(p.referenciaEvento, p.numeroParcela)}`
        : p.descricaoEvento
      const banco = dadosBancarios(empresa, p)
      html += `<tr>
        <td style="text-align:center;font-weight:700;">${numeroOrdinalLabel(p.numeroParcela)}</td>
        <td>${p.descricaoEvento ?? ''}</td>
        <td style="font-weight:700;white-space:nowrap;">${fmt(p.valor)}</td>
        <td style="font-size:9.5pt;">${prazoLabel}</td>
        <td style="font-size:9.5pt;">${meios}${banco ? '<br><small>' + banco + '</small>' : ''}</td>
      </tr>`
    })
    html += `</tbody></table>`
    return html
  }

  // Prazo de entrega (da proposta ou padrão)
  const prazoEntrega = proposta?.prazoExecucao ?? '15 (quinze) dias úteis após a confirmação do pagamento da primeira parcela'

  // Garantias dos equipamentos (Cláusula 13)
  const garantias = [
    modulo   ? `${modulo.fabricante ? modulo.fabricante + ' ' : ''}${modulo.modelo ? modulo.modelo + ' — ' : ''}Módulos Fotovoltaicos: ${garantiaModulo} contra defeito de fabricação` : null,
    inversor ? `${inversor.fabricante ? inversor.fabricante + ' ' : ''}${inversor.modelo ? inversor.modelo + ' — ' : ''}${isMicro ? 'Microinversor' : 'Inversor'}: ${garantiaInversor} contra defeitos de fabricação` : null,
    'String Box (caso acompanhe): 12 meses contra defeitos de fabricação (não cobrimos descargas elétricas)',
    'Conectores MC4: 3 anos contra defeitos de fabricação',
    'Estrutura metálica: 20 anos de garantia contra defeitos de fabricação',
    'Produção de Energia: 30 anos de produção de energia (mínimo 80%)',
  ].filter(Boolean)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contrato — ${numProposta} — ${cliNome}</title>
  <style>${CSS}</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  PÁGINA 1 — PARTES + OBJETO + PREÇO                           -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="header">
    ${logoTag(empresa?.logoUrl)}
  </div>

  <div class="titulo-contrato">Contrato de Compra e Venda e Prestação de Serviços</div>

  <!-- ── PARTES ─────────────────────────────────────────────────── -->
  <p class="parte-bloco">
    <strong>CONTRATANTE:</strong> ${contratanteDesc}, denominado a partir deste momento como <strong>CONTRATANTE</strong>.
  </p>

  <p class="parte-bloco">
    <strong>CONTRATADA:</strong> <strong>${empNome}</strong>
    ${empEnd ? `com sede no ${empEnd}` : ''}
    ${empCnpj ? `, inscrita no CNPJ sob o nº <strong>${empCnpj}</strong>` : ''}
    ${empIE ? `, e no Cadastro Estadual sob o nº ${empIE}` : ''}
    ${empEmail ? `, e-mail: ${empEmail}` : ''},
    neste ato representado pelo(s) senhor(es) <strong>${repsText}</strong>,
    denominada a partir deste momento como <strong>CONTRATADA</strong>;
  </p>

  <p class="clausula">
    As partes acima identificadas, resolvem de comum acordo celebrar o presente instrumento de Contrato de
    Compra e Venda e Prestação de Serviços, mediante as cláusulas e condições seguintes:
  </p>

  <!-- ── DO OBJETO ──────────────────────────────────────────────── -->
  <p class="secao-titulo">Do Objeto</p>

  <p class="clausula">
    <strong>CLÁUSULA 1ª</strong> - O presente contrato tem como objeto a implantação e instalação de um
    Sistema de Energia Solar Fotovoltaico de <strong>${potenciaKwp} kWp</strong>,
    conforme especificado na Proposta nº <strong>${numProposta}</strong>,
    datada de <strong>${dataEmissao}</strong>, a qual passa a integrar este instrumento para todos os fins de direito.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> - Fica estabelecido que, embora a <strong>CONTRATADA</strong> seja responsável pela
    intermediação e gestão da aquisição dos materiais, o FABRICANTE/FORNECEDOR poderá emitir as notas fiscais
    diretamente em nome da <strong>CONTRATANTE</strong>, evitando-se assim a bitributação dos materiais, nos termos
    da legislação tributária aplicável. Esta medida não interfere na responsabilidade da <strong>CONTRATADA</strong>
    pelo gerenciamento da entrega e instalação dos materiais.
  </p>

  <!-- ── DO PREÇO ───────────────────────────────────────────────── -->
  <p class="secao-titulo">Do Preço</p>

  <p class="clausula">
    <strong>CLÁUSULA 2ª</strong> - O <strong>CONTRATANTE</strong> pagará à <strong>CONTRATADA</strong>
    o valor total de <strong>${fmt(valorTotal)} (${valorExtenso})</strong>,
    sendo o mesmo pago conforme abaixo:
  </p>
  ${renderParcelas()}

  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> - Caso haja o inadimplemento de quaisquer valores por parte do
    <strong>CONTRATANTE</strong>, haverá a incidência de multa pecuniária de 2% (dois por cento), além de juros
    de 1% (um por cento) ao mês, calculados na forma pro rata die e correção monetária através do IGP-M
    Publicado pela Fundação Getúlio Vargas ou outro que venha a substituí-lo.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> - Em caso de cobrança judicial, será acrescido os valores dispendidos
    a título de custas processuais e honorários advocatícios cujo percentual não será inferior à 5% (cinco por cento)
    sobre o valor da causa.
  </p>
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  PÁGINA 2 — PRAZO DE ENTREGA + SERVIÇOS + HOMOLOGAÇÃO         -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="header">${logoTag(empresa?.logoUrl)}</div>

  <!-- ── PRAZO DE ENTREGA ───────────────────────────────────────── -->
  <p class="secao-titulo">Do Prazo de Entrega</p>

  <p class="clausula">
    <strong>CLÁUSULA 3ª</strong> - A entrega do bem se dará em até ${prazoEntrega}.
    O endereço para a entrega será <strong>${cliEnd}</strong>, local de instalação informado pelo <strong>CONTRATANTE</strong>.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 4ª</strong> - Os materiais recebidos deverão ser guardados em local seguro,
    preferencialmente abrigado do sol e chuva, até sua devida instalação.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 5ª</strong> - Cabe à <strong>CONTRATADA</strong> acompanhar a entrega para conferência
    de todo o material. Caso não seja possível este acompanhamento, o <strong>CONTRATANTE</strong> deverá
    conferir a quantidade de volumes, condições físicas externas das embalagens, observando se não há alguma
    avaria aparente, bem como os dados constantes na Nota Fiscal. Caso haja, deverá fazer observação por
    escrito no verso do documento fiscal e informar imediatamente a <strong>CONTRATADA</strong> para que
    sejam tomadas as providências, se for o caso. Recomenda-se efetuar registro fotográfico desta entrega.
  </p>

  <!-- ── DA PRESTAÇÃO DE SERVIÇOS ───────────────────────────────── -->
  <p class="secao-titulo">Da Prestação de Serviços</p>

  <p class="clausula">
    <strong>CLÁUSULA 6ª</strong> - A prestação dos serviços de instalação do Gerador Fotovoltaico compreende
    os seguintes atos:
  </p>
  <ol class="lista-clausula">
    <li>Layout simplificado determinando a quantidade e disposição dos painéis;</li>
    <li>Ancoragem das estruturas para fixação dos equipamentos;</li>
    <li>Instalação dos painéis solares;</li>
    <li>Instalação de ${isMicro ? 'Microinversor(es) Solar(es)' : 'Inversor Solar'};</li>
    <li>Passagem de cabos elétricos;</li>
    <li>Instalação de quadros de proteção (stringbox);</li>
    <li>Integração com o sistema existente (quando aplicável);</li>
    <li>Configuração do sistema de monitoramento web de geração de energia, ficando o <strong>CONTRATANTE</strong> obrigado a disponibilizar uma conexão de internet via wi-fi para viabilizar a configuração e o correto funcionamento do monitoramento;</li>
    <li>Instalação, montagem e configuração dos equipamentos segundo as normas vigentes e recomendações dos Fornecedores dos equipamentos;</li>
    <li>Elaboração e execução do projeto elétrico fotovoltaico;</li>
    <li>Emissão de Anotação de Responsabilidade Técnica junto ao CREA/DF ou CRT/DF;</li>
    <li>Homologação do sistema junto à Concessionária de Distribuição de Energia Elétrica Local;</li>
    <li>Solicitação de Acesso à rede da Concessionária de Distribuição de Elétrica Local.</li>
  </ol>

  <p class="clausula">
    <strong>CLÁUSULA 7ª</strong> - A homologação do sistema junto à Concessionária deve atender as premissas
    da Resolução nº 1.000/21 da ANEEL e aos Normativos da Distribuidora Local, com as etapas executadas
    conforme segue:
  </p>
  <ol class="lista-clausula" type="a">
    <li>Elaboração do Projeto e Protocolo junto à Distribuidora — até 10 (dez) dias corridos — Responsável: <strong>CONTRATADA</strong>;</li>
    <li>Análise do Projeto pela Distribuidora — 15 (quinze) dias corridos (prazo legal estabelecido pela ANEEL) — Responsável: Distribuidora;</li>
    <li>Instalação dos Equipamentos — entre 1 e 3 dias úteis, após entrega do material e cronograma a ser estabelecido entre as partes — Responsável: <strong>CONTRATADA</strong>;</li>
    <li>Vistoria e substituição de medidores — em média 2 dias úteis para geração do protocolo e 5 dias úteis após este procedimento para a vistoria — Responsável: <strong>CONTRATADA</strong> (solicitar vistoria) e Distribuidora (vistoria e substituição de medidoras).</li>
  </ol>

  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> - O prazo para finalização dos serviços poderá ser alterado quando
    comprovada situações que impossibilite a <strong>CONTRATADA</strong> de cumpri-lo dentro do combinado,
    ou seja, em caso fortuito ou força maior (condições climáticas desfavoráveis, por exemplo), ou ainda,
    em comum acordo entre as partes.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> - O contrato será automaticamente extinto, com relação aos serviços
    prestados, sem necessidade de aviso prévio da outra parte, com a conclusão dos serviços, mantida apenas
    as cláusulas de garantia.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO TERCEIRO</strong> - A <strong>CONTRATADA</strong> NÃO poderá ser responsabilizada
    caso não haja o cumprimento do prazo legal pela Distribuidora de Energia. Caso os prazos anteriormente
    informados não sejam cumpridos, a <strong>CONTRATADA</strong> se compromete a tomar todas as providências
    possíveis (exceto demandas judiciais) e, se necessário, acionar a ANEEL para resolução do atraso.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO QUARTO</strong> – Para cumprimento das etapas de homologação do Gerador Fotovoltaico,
    o <strong>CONTRATANTE</strong> deverá outorgar procuração à pessoa indicada pela <strong>CONTRATADA</strong>
    para representá-lo perante a Distribuidora de Energia e a ANEEL.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO QUINTO</strong> – O <strong>CONTRATANTE</strong> tem ciência de que a aprovação do
    projeto é de exclusiva responsabilidade da Distribuidora de Energia local, pelo que não assume a
    <strong>CONTRATADA</strong> a obrigação de obter êxito quanto ao pleito, mas diligenciar, empregando
    seus melhores esforços, para a ultimação de decisão favorável ao <strong>CONTRATANTE</strong>.
  </p>

  <p class="clausula">
    <strong>CLÁUSULA 8ª</strong> - O prazo de instalação dos equipamentos, conforme informado no item "c"
    da Cláusula 7ª, se iniciará somente após os equipamentos serem entregues pelo Fornecedor e a homologação
    do sistema junto à Concessionária de Energia estar aprovada.
  </p>
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  PÁGINA 3 — RESPONSABILIDADES + RESCISÃO + GARANTIA           -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="header">${logoTag(empresa?.logoUrl)}</div>

  <!-- ── DAS RESPONSABILIDADES ──────────────────────────────────── -->
  <p class="secao-titulo">Das Responsabilidades das Partes</p>

  <p class="clausula"><strong>CLÁUSULA 9ª</strong> – É de responsabilidade da parte <strong>CONTRATANTE</strong>:</p>
  <ol class="lista-clausula" type="I">
    <li>A realização dos pagamentos oriundos do presente instrumento sob pena das sanções contratuais;</li>
    <li>Providenciar a estrutura de telhado necessária para as inspeções e instalações, incluindo acesso ao local de instalação do sistema fotovoltaico, área livre, reservada e desimpedida para a execução dos serviços;</li>
    <li>Facilitar o acesso das pessoas indicadas pela <strong>CONTRATADA</strong> ao local de instalação dos equipamentos, devendo ainda fornecer toda a infraestrutura (obras civis) necessárias para a execução dos serviços;</li>
    <li>Disponibilizar todas as informações necessárias à realização dos serviços;</li>
    <li>Informar o horário de funcionamento e período de trabalho dentro das instalações do empreendimento;</li>
    <li>Não introduzir modificações de qualquer natureza nos equipamentos e não permitir o acesso de pessoas não autorizadas ao mesmo, sob pena de perder a garantia;</li>
    <li>Comunicar imediatamente a <strong>CONTRATADA</strong> sobre eventuais reclamações feitas contra seus subordinados, assim como sobre danos por eles causados;</li>
    <li>A realização de manutenção preventiva pelo menos 02 (duas) vezes a cada ano.</li>
  </ol>

  <p class="clausula"><strong>CLÁUSULA 10ª</strong> – É de responsabilidade da <strong>CONTRATADA</strong>:</p>
  <ol class="lista-clausula" type="I">
    <li>Prestar, com a devida dedicação e seriedade e da forma e do modo ajustados, os serviços descritos neste contrato;</li>
    <li>Realizar a visita técnica no imóvel para relacionar as informações técnicas;</li>
    <li>O cumprimento integral das disposições deste contrato, responsabilizando-se administrativamente e tecnicamente pela direção, supervisão, planejamento e execução dos serviços contratados;</li>
    <li>O respeito das normas, especificações técnicas e condições de segurança aplicáveis;</li>
    <li>O fornecimento das Notas Fiscais referentes à sua prestação de serviços;</li>
    <li>Empregar pessoal técnico e habilitado para a correta execução dos serviços;</li>
    <li>Responsabilizar-se pelos atos e omissões praticados por seus subordinados, bem como por quaisquer danos que eles venham a sofrer ou causar;</li>
    <li>Providenciar todos os meios e os equipamentos necessários à correta execução do serviço.</li>
  </ol>

  <!-- ── DA RESCISÃO ─────────────────────────────────────────────── -->
  <p class="secao-titulo">Da Rescisão</p>

  <p class="clausula">
    <strong>CLÁUSULA 11ª</strong> – Em caso de rescisão do Contrato pelo <strong>CONTRATANTE</strong>,
    este estará sujeito ao pagamento de multa equivalente ao percentual de 5% (cinco por cento), calculado
    sobre o preço do contrato previsto na Cláusula 2ª.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 12ª</strong> - Caso o <strong>CONTRATANTE</strong> rescinda o contrato, por qualquer
    motivo, além da multa prevista na Cláusula 2ª, deverá indenizar a <strong>CONTRATADA</strong> das
    despesas por ela havida para obtenção do orçamento de conexão, incluindo, mas não se limitando a taxas
    cobradas pela Distribuidora de Energia, custos com contratação de engenheiro eletricista e Anotação de
    Responsabilidade Técnica – ART emitida junto ao CREA.
  </p>

  <!-- ── DA GARANTIA ─────────────────────────────────────────────── -->
  <p class="secao-titulo">Da Garantia</p>

  <p class="clausula">
    <strong>CLÁUSULA 13ª</strong> - A garantia do produto vendido será descrita abaixo e será descrita
    por termo separado do contrato, onde constará todas as modalidades de conservação e a responsabilidade
    do <strong>CONTRATANTE</strong> e da <strong>CONTRATADA</strong>, conforme o artigo 50 do Código do
    Consumidor:
  </p>
  <ul class="lista-clausula">
    ${garantias.map(g => `<li>${g}</li>`).join('')}
  </ul>

  <p class="clausula">
    <strong>CLÁUSULA 14ª</strong> – O prazo de garantia dos serviços de instalação do Gerador Fotovoltaico
    é de 12 (doze) meses, contados da data de emissão da Nota Fiscal de Serviços.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO PRIMEIRO</strong> – A <strong>CONTRATADA</strong> não será responsável em prestar a
    garantia nos casos de: (a) mau uso ou uso diferente do proposto; (b) intervenção por terceiros não
    autorizados; (c) problemas causados por condições inadequadas do local; (d) danos por acidentes,
    quedas, sinistros ou agentes da natureza; (e) falta de manutenção preventiva periódica.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO SEGUNDO</strong> – A <strong>CONTRATADA</strong> se compromete a corrigir eventual
    falha no sistema de funcionamento do Gerador Fotovoltaico, sem cobrança de qualquer taxa de visita ou
    de conserto, se durante o prazo de garantia, for constatado vício decorrente da instalação dos
    equipamentos.
  </p>
  <p class="paragrafo">
    <strong>PARÁGRAFO TERCEIRO</strong> – A manutenção preventiva do Gerador Fotovoltaico deve ser
    realizada periodicamente e às expensas do <strong>CONTRATANTE</strong> no mínimo 1 (uma) vez a cada
    12 (doze) meses.
  </p>
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  PÁGINA 4 — SERVIÇOS NÃO INCLUÍDOS + DISPOSIÇÕES + FORO + ASS-->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="header">${logoTag(empresa?.logoUrl)}</div>

  <!-- ── RESPONSABILIDADES TRIBUTÁRIAS ──────────────────────────── -->
  <p class="secao-titulo">Das Responsabilidades</p>

  <p class="clausula">
    <strong>CLÁUSULA 15ª</strong> - Cada uma das partes será responsável exclusiva e responderá por todos
    os tributos ou encargos incidentes sobre a atividade que lhe couber na execução do presente contrato,
    sendo que os funcionários designados pela <strong>CONTRATADA</strong> para a execução dos serviços não
    guardarão qualquer relação de trabalho ou emprego com o <strong>CONTRATANTE</strong>.
  </p>

  <!-- ── SERVIÇOS NÃO INCLUÍDOS ────────────────────────────────── -->
  <p class="secao-titulo">Dos Serviços Não Incluídos</p>

  <p class="clausula"><strong>CLÁUSULA 16ª</strong> - Não estão incluídos no presente instrumento:</p>
  <ol class="lista-clausula" type="I">
    <li>Fornecimento de Geradores para o Sistema.</li>
    <li>Interferências com outros sistemas elétricos ou civis não previstas.</li>
    <li>Adequações técnicas no imóvel necessárias para o pleno funcionamento do sistema, tais como: aterramento, quadros de distribuição incompatíveis, infraestrutura customizada, adequações em telhados (exceto substituição de telhas que por ventura se quebre no trabalho de instalação), entre outros.</li>
    <li>Taxas ou prêmios relativos à contratação de seguros de risco de engenharia, incêndio, responsabilidade civil ou quaisquer outros.</li>
    <li>Paralizações parciais ou totais por motivos alheios à responsabilidade da <strong>CONTRATADA</strong>, tais como não liberação de áreas, atrasos em obras civis ou aprovação de projetos.</li>
  </ol>

  <!-- ── DISPOSIÇÕES GERAIS ─────────────────────────────────────── -->
  <p class="secao-titulo">Disposições Gerais</p>

  <p class="clausula">
    <strong>CLÁUSULA 17ª</strong> - Todos os pagamentos das despesas ou custos de mão de obra técnica,
    de manutenção corretiva e substituição de equipamento que estejam fora da garantia legal, serão de
    responsabilidade do <strong>CONTRATANTE</strong>.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 18ª</strong> - A <strong>CONTRATADA</strong> poderá prestar serviço de manutenção
    nos equipamentos do <strong>CONTRATANTE</strong> se for do seu interesse, no entanto, será regido por
    outro contrato de prestação de serviços para este fim.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 19ª</strong> – Este contrato é firmado em caráter irretratável e irrevogável,
    obrigando as partes que aqui assinam e seus sucessores a qualquer título.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 20ª</strong> – É vedada a cessão de direitos ou obrigações derivadas deste contrato
    sem o prévio consentimento, por escrito, da outra parte.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 21ª</strong> – Este contrato não poderá ser alterado, nem haverá renúncia das suas
    disposições, exceto por meio de aditamento por escrito assinado pelas partes, observado o disposto na
    legislação aplicável.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 22ª</strong> – Notificações e outras correspondências a serem enviadas por uma parte
    à outra, relativas a este contrato, deverão ser enviadas por meio escrito, através de e-mail ou
    correio, para os endereços constantes no preâmbulo do contrato, com entrega comprovada.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 23ª</strong> – Este contrato constitui título executivo extrajudicial, nos termos
    do artigo 784, inciso III, do Código de Processo Civil, para efeitos de cobrança de todos os valores
    dele decorrentes.
  </p>
  <p class="clausula">
    <strong>CLÁUSULA 24ª</strong> – Este contrato será regido e interpretado de acordo com as leis
    brasileiras e com a regulamentação da ANEEL relativa à geração distribuída de energia elétrica.
  </p>

  <!-- ── DO FORO ─────────────────────────────────────────────────── -->
  <p class="secao-titulo">Do Foro</p>

  <p class="clausula">
    As partes elegem o foro desta cidade para dirimir as questões oriundas deste contrato, com renúncia
    de qualquer outro, por mais privilegiado que seja.
  </p>

  <p class="clausula" style="margin-top:4mm;">
    E por estarem as partes, <strong>CONTRATANTE</strong> e <strong>CONTRATADA</strong>, em pleno acordo,
    em tudo quanto se encontra disposto neste instrumento particular
    (PROPOSTA nº <strong>${numProposta}</strong> de <strong>${dataEmissao}</strong>),
    assinam-no eletronicamente, sem necessidade de testemunhas, ou fisicamente na presença das duas
    testemunhas abaixo, em 2 (duas) vias de igual teor e forma, destinando-se uma via para cada contratante.
  </p>

  <!-- ── DATA E ASSINATURAS ─────────────────────────────────────── -->
  <div class="data-local">
    ${cidade}, ${dataContrato || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
  </div>

  <div class="assinaturas-bloco">
    <div style="margin-bottom:10mm;">
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
      <p style="font-weight:700;font-size:10pt;margin-bottom:4mm;text-align:center;">
        ${empNome}<br>
        <small>CNPJ: ${empCnpj}</small>
      </p>
      <div>
        <div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            ${rep1Nome}<br>
            <small>CPF: ${rep1Cpf}</small>
          </div>
        </div>
        ${hasRep2 ? `<div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            ${rep2Nome}<br>
            <small>CPF: ${rep2Cpf}</small>
          </div>
        </div>` : ''}
      </div>
    </div>

    <div style="margin-top:10mm;">
      <p style="font-size:10pt;margin-bottom:4mm;text-align:center;font-weight:700;">Testemunhas:</p>
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
</div>

</body>
</html>`

  return html
}

// ─── FUNÇÃO PÚBLICA ───────────────────────────────────────────────

export function abrirContratoNoNavegador(dados: any): void {
  const html = buildHtml(dados)
  const janela = window.open('', '_blank')
  if (!janela) {
    alert('Não foi possível abrir o contrato. Verifique se popups estão permitidos neste site.')
    return
  }
  janela.document.open()
  janela.document.write(html)
  janela.document.close()
  janela.focus()
  setTimeout(() => janela.print(), 800)
}
