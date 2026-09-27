// Termo de encerramento de Ordem de Serviço — gerado no cliente e renderizado
// em PDF vetorial pelo mesmo endpoint /pdf/render já usado pelas propostas
// (ver CLAUDE.md "PDFs de proposta (AGO)"). Documento simples de uma página,
// sem a qualificação jurídica completa dos contratos (contratoPartes.ts) —
// aqui é só a confirmação de que o serviço foi concluído e entregue.

const MOTIVO_LABEL: Record<string, string> = {
  cliente_ausente: 'Cliente ausente no momento do encerramento',
  cliente_recusou: 'Cliente optou por não assinar',
  outro:           'Outro motivo (ver observação)',
}

export interface DadosEncerramentoOS {
  osNumero: string
  clienteNome: string
  tecnicoResponsavel?: string | null
  tituloServico?: string | null
  resumoServico?: string | null
  dataConclusao: string // YYYY-MM-DD
  assinado: boolean
  assinaturaImagemDataUrl?: string // data:image/png;base64,...
  nomeSignatario?: string
  motivoSemAssinatura?: string
  observacao?: string
}

function fmtDataBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export function gerarHtmlEncerramento(d: DadosEncerramentoOS): string {
  const dataBR = fmtDataBR(d.dataConclusao)

  const blocoAssinatura = d.assinado
    ? `
      <div class="assinatura-box">
        <img src="${d.assinaturaImagemDataUrl}" alt="Assinatura" style="max-width:260px;max-height:90px;display:block;margin:0 auto;" />
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">${d.nomeSignatario || d.clienteNome}</div>
        <div class="assinatura-legenda">Assinatura eletrônica capturada na tela do responsável técnico em ${dataBR}</div>
      </div>`
    : `
      <div class="sem-assinatura-box">
        <div class="sem-assinatura-titulo">⚠ Encerrado sem assinatura do cliente</div>
        <div class="sem-assinatura-motivo">${MOTIVO_LABEL[d.motivoSemAssinatura ?? ''] ?? d.motivoSemAssinatura}</div>
        ${d.observacao ? `<div class="sem-assinatura-obs">"${d.observacao.replace(/</g, '&lt;')}"</div>` : ''}
      </div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #1A2433;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .header {
    background: #0E2040; color: #fff; padding: 18px 36px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .header-nome { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
  .header-nome span { color: #F5A623; }
  .header-tag { font-size: 11px; color: rgba(255,255,255,0.8); }
  .conteudo { padding: 28px 36px; }
  h1 { font-size: 18px; color: #0E2040; margin: 0 0 4px; }
  .subtitulo { font-size: 12px; color: #5A6B85; margin: 0 0 24px; }
  .campos { border: 1px solid #D7DEE8; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
  .campo { display: flex; margin-bottom: 8px; font-size: 12.5px; }
  .campo:last-child { margin-bottom: 0; }
  .campo-label { width: 150px; flex-shrink: 0; color: #5A6B85; font-weight: 700; }
  .campo-valor { color: #1A2433; }
  .resumo-titulo { font-size: 12.5px; font-weight: 700; color: #0E2040; margin: 0 0 6px; }
  .resumo-texto { font-size: 12.5px; line-height: 1.5; color: #1A2433; white-space: pre-wrap; margin-bottom: 24px; }
  .declaracao { font-size: 12px; line-height: 1.6; color: #1A2433; margin-bottom: 28px; text-align: justify; }
  .assinatura-box { text-align: center; padding: 20px 0 0; }
  .assinatura-linha { border-top: 1px solid #1A2433; width: 260px; margin: 4px auto 6px; }
  .assinatura-nome { font-size: 12.5px; font-weight: 700; }
  .assinatura-legenda { font-size: 10.5px; color: #5A6B85; margin-top: 4px; }
  .sem-assinatura-box {
    border: 1px solid #D9822B60; background: #D9822B0F; border-radius: 8px;
    padding: 16px 20px; text-align: center;
  }
  .sem-assinatura-titulo { font-size: 13px; font-weight: 700; color: #B4650A; margin-bottom: 6px; }
  .sem-assinatura-motivo { font-size: 12.5px; color: #1A2433; font-weight: 600; }
  .sem-assinatura-obs { font-size: 11.5px; color: #5A6B85; margin-top: 8px; font-style: italic; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 36px; font-size: 9.5px; color: #93A2B8; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-nome">ATOM <span>TECH</span></div>
    <div class="header-tag">Termo de Encerramento de Serviço</div>
  </div>
  <div class="conteudo">
    <h1>Termo de Encerramento — OS ${d.osNumero}</h1>
    <p class="subtitulo">Confirmação de conclusão e entrega do serviço ao cliente</p>

    <div class="campos">
      <div class="campo"><div class="campo-label">Cliente</div><div class="campo-valor">${d.clienteNome}</div></div>
      ${d.tituloServico ? `<div class="campo"><div class="campo-label">Serviço</div><div class="campo-valor">${d.tituloServico}</div></div>` : ''}
      ${d.tecnicoResponsavel ? `<div class="campo"><div class="campo-label">Técnico responsável</div><div class="campo-valor">${d.tecnicoResponsavel}</div></div>` : ''}
      <div class="campo"><div class="campo-label">Data de conclusão</div><div class="campo-valor">${dataBR}</div></div>
    </div>

    ${d.resumoServico ? `<div class="resumo-titulo">Resumo do serviço realizado</div><div class="resumo-texto">${d.resumoServico.replace(/</g, '&lt;')}</div>` : ''}

    <div class="declaracao">
      Pelo presente termo, confirma-se que o serviço acima identificado foi executado e entregue,
      ${d.assinado ? 'tendo o cliente (ou seu representante) declarado estar de acordo com a entrega mediante assinatura abaixo.' : 'não tendo sido possível colher a assinatura do cliente no momento do encerramento, conforme registrado abaixo.'}
    </div>

    ${blocoAssinatura}
  </div>
  <div class="footer">Documento gerado eletronicamente pelo AGO (Atom Gestão Operacional) em ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`
}
