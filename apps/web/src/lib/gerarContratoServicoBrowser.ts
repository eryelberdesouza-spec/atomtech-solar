// ═══════════════════════════════════════════════════════════════════
// gerarContratoServicoBrowser.ts
// Contrato de Prestação de Serviços — window.print()
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
  const dezenas  = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
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
        const d = Math.floor(resto / 10), u = resto % 10
        partes.push(u > 0 ? dezenas[d] + ' e ' + unidades[u] : dezenas[d])
      }
    }
    return partes.join(' e ')
  }

  const reais    = Math.floor(n)
  const centavos = Math.round((n - reais) * 100)
  const partes: string[] = []

  if (reais >= 1_000_000) partes.push(menorQueMil(Math.floor(reais / 1_000_000)) + (Math.floor(reais / 1_000_000) === 1 ? ' milhão' : ' milhões'))
  const k = Math.floor((reais % 1_000_000) / 1_000)
  if (k > 0) partes.push(menorQueMil(k) + ' mil')
  const resto = reais % 1_000
  if (resto > 0) partes.push(menorQueMil(resto))

  const textoReais = partes.join(' e ') + (reais === 1 ? ' real' : ' reais')
  if (centavos > 0) return textoReais + ' e ' + menorQueMil(centavos) + (centavos === 1 ? ' centavo' : ' centavos')
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
    const ls: string[] = []
    if (d.banco) ls.push(`Banco ${d.banco}`)
    if (d.agencia) ls.push(`Agência ${d.agencia}`)
    if (d.conta) ls.push(`Conta ${d.conta}`)
    if (d.pix) ls.push(`PIX: ${d.pix}`)
    if (ls.length) return ls.join(' - ')
  }
  const ls: string[] = []
  if (e?.bancoNome) ls.push(`Banco ${e.bancoNome}${e.bancoCodigo ? ` (${e.bancoCodigo})` : ''}`)
  if (e?.bancoAgencia) ls.push(`Agência ${e.bancoAgencia}`)
  if (e?.bancoConta) ls.push(`Conta ${e.bancoConta}`)
  if (e?.bancoPixChave) ls.push(`PIX: ${e.bancoPixChave}`)
  return ls.join(' - ')
}

function labelReferencia(ref: string, n: number): string {
  const map: Record<string, string> = {
    assinatura_contrato:          'da data da última assinatura do contrato',
    entrega_equipamentos:         'da data de entrega dos materiais',
    conclusao_servicos:           'da data de conclusão dos serviços',
    vencimento_parcela_anterior:  `do vencimento da ${n - 1}ª Parcela`,
    aprovacao_financiamento:      'da aprovação do financiamento',
  }
  return map[ref] ?? ref
}

function tipoPrazoLabel(tipo: string): string {
  return tipo === 'uteis' ? 'dias úteis' : 'dias corridos'
}

function logoTag(logoUrl: string | null | undefined): string {
  if (logoUrl) return `<img src="${logoUrl}" style="height:36px;" />`
  return `<span style="font-size:16pt;font-weight:900;letter-spacing:-1px;">ATOMTECH</span>`
}

function fmtCnpj(v: string | null | undefined): string {
  if (!v) return ''
  const n = v.replace(/\D/g, '')
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
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
  .header {
    display: flex; align-items: center;
    margin-bottom: 6mm;
    background: #1a2744;
    border-radius: 4px;
    padding: 6px 12px;
  }
  .header img { height: 36px; }
  .header span { color: #fff; }
  .header-line { flex: 1; }
  .titulo-contrato {
    text-align: center; font-size: 14pt; font-weight: 700;
    text-decoration: underline; text-transform: uppercase;
    margin-bottom: 8mm; letter-spacing: 0.04em;
  }
  .subtitulo-contrato {
    text-align: center; font-size: 11pt; font-weight: 600;
    color: #333; margin-bottom: 6mm;
  }
  .secao-titulo {
    font-size: 11pt; font-weight: 700; text-decoration: underline;
    text-transform: uppercase; margin: 3.5mm 0 1.5mm;
  }
  .clausula { text-align: justify; margin-bottom: 2mm; hyphens: auto; }
  .clausula strong { font-weight: 700; }
  .paragrafo { text-align: justify; margin-bottom: 1.5mm; hyphens: auto; }
  .parte-bloco { text-align: justify; margin-bottom: 4mm; hyphens: auto; }
  .parte-bloco strong { font-weight: 700; }
  .tabela-servicos {
    width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 10pt;
  }
  .tabela-servicos th {
    background: #f0f0f0; border: 1px solid #ccc; padding: 5px 8px;
    text-align: left; font-weight: 700; font-size: 9.5pt;
  }
  .tabela-servicos td {
    border: 1px solid #ccc; padding: 5px 8px; vertical-align: top;
  }
  .tabela-servicos tfoot td {
    background: #f5f5f5; font-weight: 700;
  }
  .tabela-pagamento {
    width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 10pt;
  }
  .tabela-pagamento th {
    background: #f5f5f5; border: 1px solid #ccc; padding: 4px 8px;
    text-align: left; font-weight: 700; font-size: 9.5pt;
  }
  .tabela-pagamento td { border: 1px solid #ccc; padding: 4px 8px; vertical-align: top; }
  .assinaturas-bloco { margin-top: 8mm; text-align: center; page-break-inside: avoid; break-inside: avoid; }
  .assinatura-wrapper { display: inline-block; width: 220px; margin: 0 16px; vertical-align: bottom; }
  .assinatura-espaco { height: 42mm; }
  .assinatura-linha {
    border-top: 1px solid #000; padding-top: 3px;
    font-size: 10pt; text-align: center;
  }
  .data-local { text-align: right; font-size: 11pt; margin: 8mm 0 4mm; }
  @media print {
    @page { size: A4; margin: 0; }
    body { margin: 0; }
    .page { margin: 0; }
    .header { background: none !important; border-bottom: 2px solid #1a2744; padding-bottom: 4px; }
    .header img { filter: brightness(0); }
    .header span { color: #000 !important; }
  }
`

// ─── BUILD HTML ───────────────────────────────────────────────────

function buildHtml(dados: any): string {
  const { proposta, condicoesComerciais, itensServico, empresa, cliente } = dados

  const condicoes: any[] = condicoesComerciais ?? []
  const ativas = condicoes.filter((c: any) => c.ativa !== false)
  const condicaoAtiva = (
    [...ativas].sort((a: any, b: any) => (b.parcelas?.length ?? 0) - (a.parcelas?.length ?? 0))[0] ??
    condicoes[0]
  )
  const parcelas: any[] = condicaoAtiva?.parcelas ?? []

  // Valor total: da condição comercial ativa ou soma dos itens de serviço
  const valorTotalItens = (itensServico ?? []).reduce((s: number, i: any) => s + Number(i.valorTotal ?? 0), 0)
  const valorTotal = Number(condicaoAtiva?.valorTotal ?? valorTotalItens)
  const valorExtenso = valorPorExtenso(valorTotal)

  const tituloServico = proposta.tituloServico ?? 'Prestação de Serviços'
  const prazoExecucao = proposta.prazoExecucao ?? ''
  const dataEmissao   = fmtDate(proposta.dataEmissao)

  // Endereços
  const endEmpresa = enderecoEmpresa(empresa)
  const endCli     = enderecoCliente(cliente)

  // Itens de serviço
  const itens: any[] = itensServico ?? []
  const tabelaItens = itens.length > 0 ? `
    <table class="tabela-servicos">
      <thead>
        <tr>
          <th>Descrição</th>
          <th style="width:60px;text-align:center;">Qtd</th>
          <th style="width:90px;text-align:right;">Unit.</th>
          <th style="width:100px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itens.map(i => `
          <tr>
            <td>${i.descricao ?? '—'}</td>
            <td style="text-align:center;">${Number(i.quantidade ?? 1).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
            <td style="text-align:right;">${fmt(i.valorUnitario)}</td>
            <td style="text-align:right;">${fmt(i.valorTotal)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right;">TOTAL</td>
          <td style="text-align:right;">${fmt(valorTotal)}</td>
        </tr>
      </tfoot>
    </table>
  ` : `<p class="clausula">Serviços descritos na proposta nº ${proposta.numero}, parte integrante deste contrato.</p>`

  // Tabela de pagamento
  let tabelaPagamento = ''
  if (parcelas.length > 0) {
    const rows = parcelas.map((p: any, idx: number) => {
      const n = p.numeroParcela ?? idx + 1
      const prazo = p.prazoDias != null
        ? `${n === 1 ? '' : `${p.prazoDias} ${tipoPrazoLabel(p.tipoPrazo ?? 'corridos')} `}${p.referenciaEvento ? `após ${labelReferencia(p.referenciaEvento, n)}` : ''}`
        : ''
      const banco = dadosBancarios(empresa, p)
      return `
        <tr>
          <td style="text-align:center;">${n}ª</td>
          <td>${fmt(p.valor)}</td>
          <td>${prazo || '—'}</td>
          <td style="font-size:9.5pt;">${banco || '—'}</td>
        </tr>
      `
    }).join('')
    tabelaPagamento = `
      <table class="tabela-pagamento">
        <thead>
          <tr>
            <th style="width:40px;">Parc.</th>
            <th style="width:90px;">Valor</th>
            <th>Condição / Prazo</th>
            <th>Dados Bancários</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `
  } else {
    tabelaPagamento = `<p class="clausula">Pagamento conforme condições comerciais da proposta nº ${proposta.numero}.</p>`
  }

  // Dados do contratante (empresa)
  const nomeEmpresa    = empresa?.nome ?? ''
  const cnpjEmpresa    = fmtCnpj(empresa?.cnpj)
  const nomeCliente    = cliente?.nome ?? ''
  const cpfCnpjCliente = fmtCnpj(cliente?.cpfCnpj)

  const logo = logoTag(empresa?.logoUrl)

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Contrato de Prestação de Serviços — ${tituloServico}</title>
      <style>${CSS}</style>
    </head>
    <body>
    <div class="page">

      <!-- Cabeçalho -->
      <div class="header">
        ${logo}
        <div class="header-line" style="margin-left:12px;">
          <div style="font-size:13pt;font-weight:900;color:#fff;letter-spacing:-0.5px;">${nomeEmpresa}</div>
          ${endEmpresa ? `<div style="font-size:9pt;color:#cbd5e1;">${endEmpresa}</div>` : ''}
          ${cnpjEmpresa ? `<div style="font-size:9pt;color:#cbd5e1;">CNPJ: ${cnpjEmpresa}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:9pt;color:#94a3b8;">Proposta</div>
          <div style="font-size:10pt;font-weight:700;color:#fff;">${proposta.numero}</div>
        </div>
      </div>

      <div class="titulo-contrato">Contrato de Prestação de Serviços</div>
      <div class="subtitulo-contrato">${tituloServico}</div>

      <!-- PARTES -->
      <div class="secao-titulo">Cláusula 1ª — Das Partes</div>
      <div class="parte-bloco">
        <strong>CONTRATADA:</strong> ${nomeEmpresa}${cnpjEmpresa ? `, inscrita no CNPJ sob nº ${cnpjEmpresa}` : ''}${endEmpresa ? `, com sede em ${endEmpresa}` : ''},
        doravante denominada <strong>CONTRATADA</strong>.
      </div>
      <div class="parte-bloco">
        <strong>CONTRATANTE:</strong> ${nomeCliente}${cpfCnpjCliente ? `, inscrito(a) no CPF/CNPJ sob nº ${cpfCnpjCliente}` : ''}${endCli ? `, residente/estabelecido(a) em ${endCli}` : ''},
        doravante denominado(a) <strong>CONTRATANTE</strong>.
      </div>
      <div class="clausula">
        As partes acima qualificadas têm, entre si, justo e contratado o presente instrumento, que se regerá pelas cláusulas e condições a seguir estipuladas.
      </div>

      <!-- OBJETO -->
      <div class="secao-titulo">Cláusula 2ª — Do Objeto</div>
      <div class="clausula">
        O presente contrato tem por objeto a prestação dos serviços descritos a seguir, conforme proposta comercial nº <strong>${proposta.numero}</strong> de ${dataEmissao}, que passa a ser parte integrante deste instrumento:
      </div>
      ${tabelaItens}

      <!-- PRAZO -->
      <div class="secao-titulo">Cláusula 3ª — Do Prazo de Execução</div>
      ${prazoExecucao
        ? `<div class="clausula">${prazoExecucao}</div>`
        : `<div class="clausula">O prazo de execução dos serviços será acordado entre as partes, levando em conta a disponibilidade de materiais e acesso ao local de trabalho.</div>`
      }
      <div class="clausula">
        O prazo começará a ser contado a partir da confirmação do pagamento da primeira parcela e da disponibilização das condições necessárias pela CONTRATANTE.
      </div>

      <!-- VALOR E PAGAMENTO -->
      <div class="secao-titulo">Cláusula 4ª — Do Valor e Forma de Pagamento</div>
      <div class="clausula">
        O valor total dos serviços objeto deste contrato é de <strong>${fmt(valorTotal)} (${valorExtenso})</strong>, a ser pago conforme o cronograma abaixo:
      </div>
      ${tabelaPagamento}
      <div class="clausula">
        O não pagamento de qualquer parcela no prazo estipulado implicará multa de 2% (dois por cento) sobre o valor da parcela em atraso, acrescida de juros moratórios de 1% (um por cento) ao mês, calculados pro rata die, além de correção monetária pelo IPCA.
      </div>

      <!-- OBRIGAÇÕES DA CONTRATADA -->
      <div class="secao-titulo">Cláusula 5ª — Das Obrigações da Contratada</div>
      <div class="clausula">Compete à CONTRATADA:</div>
      <ul class="lista-clausula" style="margin:2mm 0 2mm 10mm;list-style:disc;">
        <li>Executar os serviços descritos na Cláusula 2ª com qualidade técnica e observância às normas aplicáveis;</li>
        <li>Disponibilizar profissionais habilitados para a execução dos serviços;</li>
        <li>Manter sigilo sobre informações confidenciais do CONTRATANTE;</li>
        <li>Comunicar eventuais impedimentos ou alterações no cronograma com antecedência mínima de 48 horas;</li>
        <li>Entregar ao CONTRATANTE os documentos e laudos previstos no escopo dos serviços.</li>
      </ul>

      <!-- OBRIGAÇÕES DO CONTRATANTE -->
      <div class="secao-titulo">Cláusula 6ª — Das Obrigações do Contratante</div>
      <div class="clausula">Compete ao CONTRATANTE:</div>
      <ul class="lista-clausula" style="margin:2mm 0 2mm 10mm;list-style:disc;">
        <li>Efetuar os pagamentos nas condições e prazos estabelecidos neste contrato;</li>
        <li>Garantir acesso livre e seguro ao local de execução dos serviços nos horários acordados;</li>
        <li>Fornecer energia elétrica, água e demais infraestruturas necessárias sem custo adicional à CONTRATADA;</li>
        <li>Comunicar à CONTRATADA qualquer irregularidade verificada na execução dos serviços;</li>
        <li>Não interferir na execução dos serviços, respeitando as orientações técnicas da equipe da CONTRATADA.</li>
      </ul>

      <!-- GARANTIA -->
      <div class="secao-titulo">Cláusula 7ª — Da Garantia dos Serviços</div>
      <div class="clausula">
        Os serviços executados terão garantia contra defeitos de instalação e mão de obra pelo prazo de <strong>1 (um) ano</strong> a partir da data de conclusão, desde que observadas as condições normais de uso e manutenção.
      </div>
      <div class="clausula">
        A garantia não se aplica a danos causados por mau uso, acidentes, modificações realizadas por terceiros, fenômenos naturais ou qualquer causa alheia à execução dos serviços contratados.
      </div>

      <!-- RESCISÃO -->
      <div class="secao-titulo">Cláusula 8ª — Da Rescisão</div>
      <div class="clausula">
        Este contrato poderá ser rescindido por qualquer das partes, mediante notificação escrita com antecedência mínima de <strong>15 (quinze) dias</strong>, ficando a parte rescindente responsável pelos serviços já executados até a data da rescisão, proporcional ao valor total contratado.
      </div>
      <div class="clausula">
        Em caso de rescisão por iniciativa do CONTRATANTE após o início da execução dos serviços, será devido à CONTRATADA o valor correspondente aos serviços já executados, acrescido de multa rescisória equivalente a 20% (vinte por cento) do valor restante do contrato.
      </div>

      <!-- DISPOSIÇÕES GERAIS -->
      <div class="secao-titulo">Cláusula 9ª — Disposições Gerais</div>
      <div class="clausula">
        Este contrato obriga as partes e seus sucessores, e substitui quaisquer entendimentos ou propostas anteriores, verbais ou escritos, relativos ao seu objeto.
      </div>
      <div class="clausula">
        Eventuais alterações neste instrumento somente terão validade se formalizadas por escrito e assinadas por ambas as partes.
      </div>
      <div class="clausula">
        Fica eleito o foro da comarca de <strong>${empresa?.cidade ?? '_____________'}</strong> para dirimir quaisquer questões decorrentes deste contrato, com renúncia expressa a qualquer outro.
      </div>

      <!-- Local e data -->
      <div class="data-local">
        ${empresa?.cidade ? `${empresa.cidade}/${empresa.estado ?? ''}` : '______________'}, _____ de __________________ de ${new Date().getFullYear()}.
      </div>

      <!-- Assinaturas -->
      <div class="assinaturas-bloco">
        <div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            ${nomeEmpresa}<br/>
            <span style="font-size:9pt;">CONTRATADA</span>
          </div>
        </div>
        <div class="assinatura-wrapper">
          <div class="assinatura-espaco"></div>
          <div class="assinatura-linha">
            ${nomeCliente}<br/>
            <span style="font-size:9pt;">CONTRATANTE</span>
          </div>
        </div>
      </div>

      <!-- Testemunhas -->
      <div style="margin-top:12mm;page-break-inside:avoid;break-inside:avoid;">
        <div class="secao-titulo" style="font-size:10pt;">Testemunhas</div>
        <div style="display:flex;gap:40px;margin-top:8mm;">
          <div style="flex:1;">
            <div style="height:36mm;"></div>
            <div style="border-top:1px solid #000;padding-top:4px;font-size:9.5pt;text-align:center;">1ª Testemunha — Nome / CPF</div>
          </div>
          <div style="flex:1;">
            <div style="height:36mm;"></div>
            <div style="border-top:1px solid #000;padding-top:4px;font-size:9.5pt;text-align:center;">2ª Testemunha — Nome / CPF</div>
          </div>
        </div>
      </div>

    </div>
    </body>
    </html>
  `
}

// ─── FUNÇÃO EXPORTADA ─────────────────────────────────────────────

export function abrirContratoServicoNoNavegador(dados: any): void {
  const html = buildHtml(dados)
  const win = window.open('', '_blank', 'width=900,height=960,scrollbars=yes')
  if (!win) {
    alert('Por favor, permita popups para gerar o contrato.')
    return
  }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.focus(), 300)
}
