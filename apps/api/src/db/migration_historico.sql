-- ═══════════════════════════════════════════════════════════════════
-- Migração: Contratos Históricos (pré-plataforma)
-- Executar via GET /run-migration-historico
-- ═══════════════════════════════════════════════════════════════════

-- 1. Marca propostas como históricas (origem)
ALTER TABLE proposta
  ADD COLUMN IF NOT EXISTS `origem` ENUM('plataforma','historico') NOT NULL DEFAULT 'plataforma';

-- 2. Número de contrato externo + origem na OS
ALTER TABLE ordem_servico
  ADD COLUMN IF NOT EXISTS `origem` ENUM('plataforma','historico') NOT NULL DEFAULT 'plataforma',
  ADD COLUMN IF NOT EXISTS `numero_contrato_externo` VARCHAR(50) NULL;
