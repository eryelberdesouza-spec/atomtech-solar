-- Migration: add prazo_execucao to proposta table
ALTER TABLE proposta ADD COLUMN IF NOT EXISTS prazo_execucao VARCHAR(300) NULL AFTER titulo_servico;
