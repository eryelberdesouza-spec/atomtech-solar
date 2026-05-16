-- ═══════════════════════════════════════════════════════════════════
-- Migration: Proposta de Serviço Geral
-- Adiciona suporte a propostas de serviços (CFTV, carregadores, etc.)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Adiciona tipo de proposta e título do serviço na tabela proposta
ALTER TABLE proposta
  ADD COLUMN tipo_proposta ENUM('fotovoltaico', 'servico_geral') NOT NULL DEFAULT 'fotovoltaico'
    AFTER numero,
  ADD COLUMN titulo_servico VARCHAR(200) NULL
    AFTER data_validade;

-- 2. Cria tabela de itens de serviço para propostas genéricas
CREATE TABLE item_servico_proposta (
  id              INT          NOT NULL AUTO_INCREMENT,
  proposta_id     INT          NOT NULL,
  descricao       VARCHAR(300) NOT NULL,
  unidade         VARCHAR(30)  NOT NULL DEFAULT 'un',
  quantidade      DECIMAL(10,3) NOT NULL,
  valor_unitario  DECIMAL(10,2) NOT NULL,
  valor_total     DECIMAL(10,2) NOT NULL,
  ordem           INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_isp_proposta FOREIGN KEY (proposta_id)
    REFERENCES proposta(id) ON DELETE CASCADE
);
