-- Migração: Adiciona campos de formalização de contrato à tabela proposta
-- Execute este script no banco de dados de produção (Railway)

ALTER TABLE proposta
  ADD COLUMN contrato_formalizado TINYINT(1) NOT NULL DEFAULT 0 AFTER observacoes_internas,
  ADD COLUMN data_formalizacao DATE NULL AFTER contrato_formalizado;
