-- ═══════════════════════════════════════════════════════════════════
-- Migração: Etiquetas coloridas para Ordens de Serviço
-- Executar no Railway MySQL dashboard (Query tab)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `os_etiqueta` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `empresa_id` INT          NOT NULL,
  `nome`       VARCHAR(40)  NOT NULL,
  `cor`        VARCHAR(7)   NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_etiqueta_empresa` (`empresa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `os_etiqueta_link` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `ordem_servico_id` INT NOT NULL,
  `etiqueta_id`      INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_os_etiqueta` (`ordem_servico_id`, `etiqueta_id`),
  INDEX `idx_link_os` (`ordem_servico_id`),
  INDEX `idx_link_etiqueta` (`etiqueta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
