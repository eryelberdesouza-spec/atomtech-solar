-- ═══════════════════════════════════════════════════════════════════
-- Migração: Contratos Históricos (pré-plataforma)
-- Executar via GET /run-migration-historico
-- ═══════════════════════════════════════════════════════════════════

-- NOTA: versões mais antigas de MySQL não suportam `ADD COLUMN IF NOT EXISTS`.
-- Se a coluna já existir, o ALTER abaixo falha com erro de duplicidade — ignore e siga.

-- 1. Marca propostas como históricas (origem)
ALTER TABLE proposta
  ADD COLUMN `origem` ENUM('plataforma','historico') NOT NULL DEFAULT 'plataforma';

-- 2. Número de contrato externo + origem na OS
ALTER TABLE ordem_servico
  ADD COLUMN `origem` ENUM('plataforma','historico') NOT NULL DEFAULT 'plataforma',
  ADD COLUMN `numero_contrato_externo` VARCHAR(50) NULL;
