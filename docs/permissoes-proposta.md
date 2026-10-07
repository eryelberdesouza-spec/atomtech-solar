# Níveis de acesso — proposta para aprovação

> Status: **rascunho aguardando decisão do Eryelber.** Nada foi implementado.
> Criado em 2026-10-07.

## Por que isso existe

Os quatro perfis (Administrador, Comercial, Técnico, Visualizador) existem no
cadastro desde sempre e aparecem na tela com cores e descrições — mas **quase
nada é verificado no servidor**. Hoje só três coisas exigem permissão de fato:

| O que | Onde |
|---|---|
| Alterar configurações da empresa | `empresa.update` |
| Cancelar uma OS | `os.updateStatus` com status `cancelada` |
| Gerenciar usuários | `usuario.*` |

Há um bloqueio para o perfil **Técnico** no front (`App.tsx`, `Layout.tsx`),
que o restringe às telas de OS e manutenções — mas é o navegador escondendo o
menu, **não a API recusando**. Quem souber a URL passa por cima.

Efeito prático: um **Visualizador**, que a tela descreve como "somente
leitura", consegue criar e editar proposta, cliente e OS normalmente.

## Tabela proposta

Legenda: ✅ pode · 👁 só leitura · ❌ não

### Propostas

| Ação | Admin | Comercial | Técnico | Visualizador |
|---|:--:|:--:|:--:|:--:|
| Listar e abrir | ✅ | ✅ | 👁 só a da OS dele¹ | 👁 |
| Criar (solar e serviço) | ✅ | ✅ | ❌ | ❌ |
| Editar dados, itens, prazo | ✅ | ✅ | ❌ | ❌ |
| Dimensionamento e equipamentos | ✅ | ✅ | ✅¹ | ❌ |
| Precificação (custo e margem) | ✅ | ✅ | ❌ | ❌² |
| Condições comerciais e fechamento | ✅ | ✅ | ❌ | ❌ |
| Mudar status (enviar, aceitar, recusar) | ✅ | ✅ | ❌ | ❌ |
| Formalizar contrato | ✅ | ✅ | ❌ | ❌ |
| Gerar contrato / enviar para assinatura | ✅ | ✅ | ❌ | ❌ |
| Cancelar assinatura na ZapSign | ✅ | ✅ | ❌ | ❌ |
| Clonar | ✅ | ✅ | ❌ | ❌ |
| Arquivar / desarquivar | ✅ | ✅ | ❌ | ❌ |
| Excluir definitivamente | ✅ | ❌ | ❌ | ❌ |
| Gerar PDF | ✅ | ✅ | ✅ | ✅ |

### Clientes

| Ação | Admin | Comercial | Técnico | Visualizador |
|---|:--:|:--:|:--:|:--:|
| Listar e abrir | ✅ | ✅ | 👁 contato e endereço¹ | 👁 |
| Criar e editar | ✅ | ✅ | ❌ | ❌ |
| Unificar duplicados | ✅ | ✅ | ❌ | ❌ |
| Cancelar / reativar | ✅ | ✅ | ❌ | ❌ |
| Excluir definitivamente | ✅ | ❌ | ❌ | ❌ |
| Faturas de energia | ✅ | ✅ | ❌ | 👁 |

### Ordens de Serviço

| Ação | Admin | Comercial | Técnico | Visualizador |
|---|:--:|:--:|:--:|:--:|
| Listar e abrir | ✅ | ✅ | ✅ só as dele¹ | 👁 |
| Criar OS de contrato | ✅ | ✅ | ❌ | ❌ |
| Criar OS avulsa / manutenção | ✅ | ✅ | ❓³ | ❌ |
| Editar título, descrição, datas | ✅ | ✅ | ❌ | ❌ |
| Editar resumo e localização (campo) | ✅ | ✅ | ✅ | ❌ |
| Definir técnico responsável | ✅ | ✅ | ❌ | ❌ |
| Marcos: concluir | ✅ | ✅ | ✅ | ❌ |
| Agendamentos: criar e alterar | ✅ | ✅ | ✅ | ❌ |
| Anexar fotos e documentos | ✅ | ✅ | ✅ | ❌ |
| Excluir anexo | ✅ | ✅ | só o que ele subiu | ❌ |
| Mudar status (exceto cancelar) | ✅ | ✅ | ✅ | ❌ |
| Encerrar com assinatura | ✅ | ✅ | ✅ | ❌ |
| Cancelar OS | ✅ | ❌ | ❌ | ❌ |
| Etiquetas: criar e vincular | ✅ | ✅ | vincular | ❌ |
| Planos de manutenção | ✅ | ✅ | 👁 | ❌ |
| Importar histórico em lote | ✅ | ❌ | ❌ | ❌ |

### AGF — Financeiro

| Ação | Admin | Comercial | Técnico | Visualizador |
|---|:--:|:--:|:--:|:--:|
| Acessar o AGF | ✅ | ❓⁴ | ❌ | ❌ |
| Lançar, baixar, estornar títulos | ✅ | ❌ | ❌ | ❌ |
| Importar extrato e conciliar | ✅ | ❌ | ❌ | ❌ |
| DRE, fluxo de caixa, relatórios | ✅ | ❓⁴ | ❌ | ❌ |
| Plano de contas, contas, centros | ✅ | ❌ | ❌ | ❌ |
| Fechamento de período | ✅ | ❌ | ❌ | ❌ |

### Configurações e cadastros de apoio

| Ação | Admin | Comercial | Técnico | Visualizador |
|---|:--:|:--:|:--:|:--:|
| Dados da empresa e representantes | ✅ | ❌ | ❌ | ❌ |
| Usuários (criar, editar, senha) | ✅ | ❌ | ❌ | ❌ |
| **Premissas** (margem, tarifa, taxas) | ✅ | ❌⁵ | ❌ | ❌ |
| Catálogo de módulos e inversores | ✅ | ✅ | 👁 | 👁 |
| Textos institucionais e modelos de bloco | ✅ | ✅ | ❌ | 👁 |
| Relatório de Energia (gerar) | ✅ | ✅ | ✅ | ❌ |
| Relatório de Recargas (Moove) | ✅ | ✅ | ❌ | 👁 |

## Decisões que são suas — preciso da sua resposta

1. **"só a dele"** — vale a pena o técnico ver apenas as OS em que é o
   responsável, ou ele deve ver todas? Restringir protege informação de
   cliente, mas atrapalha quando um cobre o outro.

2. **Visualizador vê preço e margem?** A tela de Precificação expõe custo e
   margem da Atom. Propus ❌. Se esse perfil for para sócio ou contador, talvez
   deva ver.

3. **Técnico pode abrir OS avulsa?** Pós-venda e manutenção às vezes nascem em
   campo. Propus ❓ porque não sei como vocês trabalham.

4. **Quem entra no AGF?** Hoje **qualquer usuário logado** entra — inclusive
   Técnico e Visualizador. Isso me parece o buraco mais sério da lista. Talvez
   valha um quinto perfil, **Financeiro**, para a BeeFinance e quem cuida do
   caixa, sem dar poder de administrador.

5. **Premissas** definem margem e preço de toda proposta. Propus Admin apenas.
   Se o Comercial precisa ajustar margem no dia a dia, muda.

6. **Contradição a resolver**: a descrição do perfil Técnico na tela diz
   "Visualiza e edita dimensionamentos, exporta PDFs", mas o front o tranca nas
   telas de OS. Os dois não podem estar certos.

## Como pretendo implementar (depois de aprovada)

- Uma tabela única de permissões no servidor (`permissoes.ts`), com um
  `exigePermissao('proposta:editar')` aplicado rota a rota. Fonte única da
  verdade — nada de espalhar `if (role === 'admin')` pelo código.
- O front consulta a mesma tabela para esconder o que não pode ser feito. **O
  front esconde; o servidor recusa.** Esconder sem recusar é o que temos hoje,
  e não é segurança.
- Rodar primeiro em modo "só registra" por alguns dias: a API anota quem teria
  sido bloqueado, sem bloquear. Assim a gente descobre quem usa o quê antes de
  travar alguém no meio do expediente.
- Depois, ligar de verdade.
