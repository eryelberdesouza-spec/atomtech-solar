-- Migração: Adiciona campos bancários/PIX à tabela fin_pessoa
-- Execute este script no banco de dados de produção (Railway)

ALTER TABLE fin_pessoa
  ADD COLUMN banco         VARCHAR(100) NULL AFTER observacoes,
  ADD COLUMN tipo_pix      VARCHAR(30)  NULL AFTER banco,
  ADD COLUMN chave_pix     VARCHAR(150) NULL AFTER tipo_pix,
  ADD COLUMN tipo_pagamento VARCHAR(50) NULL AFTER chave_pix;
