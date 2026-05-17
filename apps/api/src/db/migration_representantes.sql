-- Migration: adiciona campos de representantes legais da empresa para contratos
ALTER TABLE empresa
  ADD COLUMN rep1_nome VARCHAR(200) NULL AFTER rodape_texto,
  ADD COLUMN rep1_cpf VARCHAR(30) NULL AFTER rep1_nome,
  ADD COLUMN rep1_descricao TEXT NULL AFTER rep1_cpf,
  ADD COLUMN rep2_nome VARCHAR(200) NULL AFTER rep1_descricao,
  ADD COLUMN rep2_cpf VARCHAR(30) NULL AFTER rep2_nome,
  ADD COLUMN rep2_descricao TEXT NULL AFTER rep2_cpf;
