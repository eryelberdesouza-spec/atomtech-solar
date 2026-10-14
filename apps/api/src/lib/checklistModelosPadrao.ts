// Modelos iniciais de checklist de OS (aprovados pelo usuário em 2026-10-14).
// Carregados pelo botão "Carregar modelos padrão" em Configurações › Checklists
// de OS — depois disso vivem no banco e são editados pela tela. Alterar este
// arquivo NÃO muda modelos já carregados.
//
// `unidade`: item pede valor medido (ex.: Voc em V). `obr`: obrigatório para
// concluir a OS (ou marcado "não se aplica" com justificativa).

export type ItemModeloPadrao = { descricao: string; obr?: boolean; unidade?: string }
export type ModeloPadrao = { nome: string; itens: ItemModeloPadrao[] }

export const MODELOS_CHECKLIST_PADRAO: ModeloPadrao[] = [
  // Fotovoltaico em dois modelos (ajuste do usuário em 2026-10-14): hoje a
  // maioria das obras é com microinversor, e as verificações mudam — sem
  // string CC longa não há Voc por string a medir; o que importa é conexão
  // módulo↔micro, cabo tronco CA e todos os micros comunicando. As medições
  // de aterramento/isolamento saíram, mas o aterramento das estruturas fica
  // como verificação obrigatória sem medição (exigência normativa).
  {
    nome: 'Sistema fotovoltaico — inversor string',
    itens: [
      { descricao: 'Estrutura de fixação instalada conforme projeto, com vedação da cobertura conferida', obr: true },
      { descricao: 'Módulos fixados e alinhados, sem avarias visíveis', obr: true },
      { descricao: 'Polaridade das strings conferida antes da conexão ao inversor', obr: true },
      { descricao: 'Tensão de circuito aberto (Voc) por string', obr: true, unidade: 'V' },
      { descricao: 'Equipotencialização e aterramento de estruturas e massas executados', obr: true },
      { descricao: 'DPS CC e CA instalados conforme projeto', obr: true },
      { descricao: 'Proteções CA (disjuntor/DR) instaladas conforme projeto', obr: true },
      { descricao: 'Inversor fixado, com ventilação adequada', obr: true },
      { descricao: 'Condutores identificados e protegidos (eletroduto/eletrocalha)', obr: true },
      { descricao: 'Padrão de entrada verificado conforme norma da concessionária/projeto (ajustado quando necessário)', obr: true },
      { descricao: 'Placas de advertência instaladas (geração distribuída, dupla alimentação)', obr: true },
      { descricao: 'Inversor em operação, sem alarmes, injetando na rede', obr: true },
      { descricao: 'Monitoramento configurado e acesso entregue ao cliente', obr: true },
      { descricao: 'Cliente orientado sobre operação, desligamento e segurança', obr: true },
      { descricao: 'Local limpo, sobras e embalagens recolhidas', obr: true },
    ],
  },
  {
    nome: 'Sistema fotovoltaico — microinversor',
    itens: [
      { descricao: 'Estrutura de fixação instalada conforme projeto, com vedação da cobertura conferida', obr: true },
      { descricao: 'Módulos fixados e alinhados, sem avarias visíveis', obr: true },
      { descricao: 'Microinversores fixados na estrutura, conectores módulo↔micro travados', obr: true },
      { descricao: 'Cabo tronco CA conectado, extremidade vedada (terminador)', obr: true },
      { descricao: 'Tensão CA no ponto de conexão dos microinversores', obr: true, unidade: 'V' },
      { descricao: 'Equipotencialização e aterramento de estruturas e massas executados', obr: true },
      { descricao: 'DPS CA instalado conforme projeto', obr: true },
      { descricao: 'Proteções CA (disjuntor/DR) instaladas conforme projeto', obr: true },
      { descricao: 'Condutores identificados e protegidos (eletroduto/eletrocalha)', obr: true },
      { descricao: 'Padrão de entrada verificado conforme norma da concessionária/projeto (ajustado quando necessário)', obr: true },
      { descricao: 'Placas de advertência instaladas (geração distribuída, dupla alimentação)', obr: true },
      { descricao: 'Gateway/ECU comunicando com todos os microinversores', obr: true },
      { descricao: 'Microinversores em operação, sem alarmes, injetando na rede', obr: true },
      { descricao: 'Monitoramento configurado e acesso entregue ao cliente', obr: true },
      { descricao: 'Cliente orientado sobre operação, desligamento e segurança', obr: true },
      { descricao: 'Local limpo, sobras e embalagens recolhidas', obr: true },
    ],
  },
  {
    nome: 'Carregador veicular / Wallbox',
    itens: [
      { descricao: 'Circuito dedicado a partir do quadro de distribuição', obr: true },
      { descricao: 'Seção dos condutores compatível com a corrente do carregador', obr: true },
      { descricao: 'Disjuntor dimensionado conforme projeto', obr: true },
      { descricao: 'DR do tipo exigido pelo fabricante (A ou B)', obr: true },
      { descricao: 'DPS no quadro de alimentação' },
      { descricao: 'Aterramento conferido/instalado', obr: true },
      { descricao: 'Tensão de alimentação no ponto do carregador', obr: true, unidade: 'V' },
      // Nem todo carregador permite configurar a corrente — por isso opcional.
      { descricao: 'Corrente máxima configurada no carregador (quando o modelo permite)', unidade: 'A' },
      { descricao: 'Adequação do padrão de entrada junto à concessionária, quando aplicável' },
      { descricao: 'Carregador fixado conforme manual do fabricante', obr: true },
      // Opcional: o cliente às vezes ainda não tem o veículo ou não está no
      // local — isso não pode travar a conclusão da OS.
      { descricao: 'Teste de recarga realizado com sucesso' },
      { descricao: 'Aplicativo/conectividade configurados, quando aplicável' },
      { descricao: 'Circuito identificado no quadro', obr: true },
      { descricao: 'Cliente orientado sobre uso e segurança', obr: true },
      { descricao: 'Local limpo', obr: true },
    ],
  },
  {
    nome: 'CFTV',
    itens: [
      { descricao: 'Câmeras instaladas nos pontos definidos', obr: true },
      { descricao: 'Ângulo e enquadramento validados com o cliente', obr: true },
      { descricao: 'Cabeamento e conectores testados', obr: true },
      { descricao: 'Alimentação (fontes/PoE) conferida', obr: true },
      { descricao: 'DVR/NVR instalado e configurado', obr: true },
      { descricao: 'Gravação ativa e reprodução testada', obr: true },
      { descricao: 'Período de retenção das gravações', unidade: 'dias' },
      { descricao: 'Data e hora do gravador corretas', obr: true },
      { descricao: 'Acesso remoto configurado no dispositivo do cliente', obr: true },
      { descricao: 'Senhas padrão de fábrica substituídas e entregues ao cliente', obr: true },
      { descricao: 'Nobreak instalado e autonomia testada', unidade: 'min' },
      { descricao: 'Cabos organizados e identificados', obr: true },
      { descricao: 'Cliente orientado sobre operação', obr: true },
      { descricao: 'Local limpo', obr: true },
    ],
  },
  {
    nome: 'Infraestrutura elétrica / manutenção',
    itens: [
      { descricao: 'Circuito desenergizado e bloqueado antes da intervenção (NR-10)', obr: true },
      { descricao: 'Quadro inspecionado (aquecimento, oxidação, danos)', obr: true },
      { descricao: 'Reaperto das conexões', obr: true },
      { descricao: 'Tensão entre fases e fase-neutro', unidade: 'V' },
      { descricao: 'Corrente por fase', unidade: 'A' },
      // Resistência de aterramento, termografia e quadro de cargas saíram do
      // modelo (2026-10-14): entram como item avulso na OS que precisar.
      { descricao: 'Teste de funcionamento do DR' },
      { descricao: 'Identificação dos circuitos atualizada', obr: true },
      { descricao: 'Reenergização e teste de funcionamento', obr: true },
      { descricao: 'Pendências registradas no diário de campo', obr: true },
      { descricao: 'Local limpo', obr: true },
    ],
  },
]
