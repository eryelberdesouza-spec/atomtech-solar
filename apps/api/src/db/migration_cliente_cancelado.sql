-- ═══════════════════════════════════════════════════════════════════
-- Migração: Cancelamento de Cliente
-- Executar no Railway MySQL dashboard (Query tab)
-- NOTA: se a coluna já existir, o ALTER abaixo falha com erro de
-- duplicidade — ignore e siga (este MySQL não suporta IF NOT EXISTS em coluna).
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE cliente
  ADD COLUMN `cancelado` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `cancelado_em` TIMESTAMP NULL;
