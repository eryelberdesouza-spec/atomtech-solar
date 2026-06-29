-- ═══════════════════════════════════════════════════════════════════
-- Migração: Diário de Campo (Notas) da Ordem de Serviço
-- Executar no Railway MySQL dashboard (Query tab)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `os_nota` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `ordem_servico_id` INT          NOT NULL,
  `empresa_id`       INT          NOT NULL,
  `texto`            TEXT         NOT NULL,
  `autor`            VARCHAR(100) NULL,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_nota_os` (`ordem_servico_id`),
  INDEX `idx_nota_empresa` (`empresa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
