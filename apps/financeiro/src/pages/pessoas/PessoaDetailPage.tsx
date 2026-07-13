import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trpc } from '../../lib/trpc'
import {
  PageWrapper, SectionHeader, Card, Btn, Badge, Table, Spinner, C,
} from '../../components/ui'
import { maskCpfCnpj, maskTelefone, maskMoeda } from '../../lib/masks'
import { fmtData } from '../../lib/utils'
import { ModalEditarLancamento } from '../LancamentosPage'

const PROPOSTAS_URL = 'https://atomtech-solar-web.vercel.app'

const STATUS_PROPOSTA: Record<string, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', aceita: 'Aceita',
  recusada: 'Recusada', expirada: 'Expirada', cancelada: 'Cancelada',
}

function Campo({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text }}>{value}</div>
    </div>
  )
}

export function PessoaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pessoaId = Number(id)
  const utils = (trpc as any).useUtils()

  const { data, isLoading } = (trpc as any).fin.pessoa.detalhe.useQuery({ id: pessoaId })
  const [editandoTitulo, setEditandoTitulo] = useState<{ id: number; tipo: 'PAGAR' | 'RECEBER' } | null>(null)

  if (isLoading || !data) {
    return <PageWrapper><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div></PageWrapper>
  }

  const { pessoa, titulos, aReceberAberto, aPagarAberto, propostas } = data

  const endereco = [
    pessoa.logradouro && `${pessoa.logradouro}${pessoa.numero ? `, ${pessoa.numero}` : ''}${pessoa.complemento ? ` — ${pessoa.complemento}` : ''}`,
    pessoa.bairro,
    pessoa.cidade && pessoa.estado ? `${pessoa.cidade} / ${pessoa.estado}` : null,
    pessoa.cep,
  ].filter(Boolean).join(' · ')

  const titulosRows = titulos.map((t: any) => ({
    descricao: <span style={{ color: C.text }}>{t.descricao}</span>,
    tipo: <Badge status={t.tipo} />,
    emissao: <span style={{ color: C.textMuted, fontSize: 12 }}>{fmtData(t.emissao)}</span>,
    valor: <span style={{ fontWeight: 700, color: t.tipo === 'PAGAR' ? C.debit : C.credit }}>{maskMoeda(t.valorOriginal)}</span>,
  }))

  const propostasRows = propostas.map((p: any) => ({
    numero: (
      <div>
        <div style={{ color: C.text, fontWeight: 600 }}>{p.numero}</div>
        {p.tituloServico && <div style={{ color: C.textMuted, fontSize: 11 }}>{p.tituloServico}</div>}
      </div>
    ),
    tipo: <span style={{ color: C.textMuted, fontSize: 12 }}>{p.tipoProposta === 'servico_geral' ? 'Serviço' : 'Fotovoltaico'}</span>,
    status: <Badge status={p.status} label={STATUS_PROPOSTA[p.status] ?? p.status} />,
    formalizado: p.contratoFormalizado ? <span style={{ color: C.success, fontSize: 12 }}>✓ Formalizado</span> : <span style={{ color: C.textDim, fontSize: 12 }}>—</span>,
    valor: p.valorTotal ? <span style={{ fontWeight: 700, color: C.text }}>{maskMoeda(p.valorTotal)}</span> : <span style={{ color: C.textDim }}>—</span>,
    acoes: (
      <a href={`${PROPOSTAS_URL}/propostas/${p.id}`} target="_blank" rel="noreferrer">
        <Btn size="sm" variant="ghost">Abrir ↗</Btn>
      </a>
    ),
  }))

  return (
    <PageWrapper>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Btn size="sm" variant="ghost" onClick={() => navigate('/pessoas')}>← Voltar</Btn>
      </div>

      <SectionHeader
        title={pessoa.nome}
        action={
          <div style={{ display: 'flex', gap: 6 }}>
            {pessoa.isCliente && <Badge status="RECEBER" label="Cliente" />}
            {pessoa.isFornecedor && <Badge status="PAGAR" label="Fornecedor" />}
            <Badge status={pessoa.ativo ? 'ativo' : 'inativo'} />
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>A Receber (em aberto)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.credit }}>{maskMoeda(aReceberAberto)}</div>
        </Card>
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>A Pagar (em aberto)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.debit }}>{maskMoeda(aPagarAberto)}</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, marginBottom: 20 }}>
        {/* Dados cadastrais */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>Dados Cadastrais</h3>
          <Campo label={pessoa.tipoPessoa === 'FISICA' ? 'CPF' : 'CNPJ'} value={maskCpfCnpj(pessoa.cpfCnpj ?? '')} />
          <Campo label="Nome Fantasia" value={pessoa.fantasia} />
          <Campo label="E-mail" value={pessoa.email} />
          <Campo label="Telefone" value={pessoa.telefone ? maskTelefone(pessoa.telefone) : null} />
          <Campo label="Endereço" value={endereco || null} />
          <Campo label="Regime Tributário" value={pessoa.regime} />

          <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '18px 0 14px' }}>Dados Bancários / PIX</h3>
          <Campo label="Banco" value={pessoa.banco} />
          <Campo label="Tipo de Pagamento" value={pessoa.tipoPagamento} />
          <Campo label="Tipo de Chave PIX" value={pessoa.tipoPix} />
          <Campo label="Chave PIX" value={pessoa.chavePix} />

          {pessoa.observacoes && (
            <>
              <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '18px 0 14px' }}>Observações</h3>
              <p style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{pessoa.observacoes}</p>
            </>
          )}

          <Btn variant="ghost" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => navigate('/pessoas')}>
            ✏ Editar na lista de Pessoas
          </Btn>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Propostas / contratos */}
          <Card style={{ padding: 20 }}>
            <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Propostas / Contratos</h3>
            <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 12px' }}>
              Vinculados pelo CPF/CNPJ na plataforma de Propostas
            </p>
            {!pessoa.cpfCnpj ? (
              <p style={{ color: C.textMuted, fontSize: 12 }}>Cadastre o CPF/CNPJ desta pessoa para cruzar com propostas.</p>
            ) : propostasRows.length === 0 ? (
              <p style={{ color: C.textMuted, fontSize: 12 }}>Nenhuma proposta encontrada para este CPF/CNPJ.</p>
            ) : (
              <Table
                columns={[
                  { key: 'numero',      label: 'Proposta' },
                  { key: 'tipo',        label: 'Tipo',         width: '100px' },
                  { key: 'status',      label: 'Status',       width: '110px' },
                  { key: 'formalizado', label: 'Contrato',     width: '110px' },
                  { key: 'valor',       label: 'Valor',        width: '120px', align: 'right' },
                  { key: 'acoes',       label: '',             width: '90px' },
                ]}
                rows={propostasRows}
              />
            )}
          </Card>

          {/* Lançamentos financeiros */}
          <Card style={{ padding: 20 }}>
            <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Lançamentos Financeiros Recentes</h3>
            {titulosRows.length === 0 ? (
              <p style={{ color: C.textMuted, fontSize: 12, marginTop: 12 }}>Nenhum lançamento vinculado a esta pessoa ainda.</p>
            ) : (
              <>
                <p style={{ color: C.textDim, fontSize: 11, margin: '0 0 12px' }}>Clique em um lançamento para ver o detalhe completo</p>
                <Table
                  columns={[
                    { key: 'descricao', label: 'Descrição' },
                    { key: 'tipo',      label: 'Tipo',     width: '90px' },
                    { key: 'emissao',   label: 'Emissão',  width: '100px' },
                    { key: 'valor',     label: 'Valor',    width: '120px', align: 'right' },
                  ]}
                  rows={titulosRows}
                  onRowClick={(i: number) => setEditandoTitulo({ id: titulos[i].id, tipo: titulos[i].tipo })}
                />
              </>
            )}
          </Card>
        </div>
      </div>

      {editandoTitulo && (
        <ModalEditarLancamento
          tituloId={editandoTitulo.id}
          tipo={editandoTitulo.tipo}
          onClose={() => setEditandoTitulo(null)}
          onSuccess={() => utils.fin.pessoa.detalhe.invalidate({ id: pessoaId })}
        />
      )}
    </PageWrapper>
  )
}
