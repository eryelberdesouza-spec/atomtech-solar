-- ═══════════════════════════════════════════════════════════════════
-- Migração: Módulo Operacional — Ordens de Serviço
-- Executar no Railway MySQL dashboard (Query tab)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. ORDEM DE SERVIÇO ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ordem_servico` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `empresa_id`           INT          NOT NULL,
  `proposta_id`          INT          NOT NULL,
  `numero`               VARCHAR(20)  NOT NULL UNIQUE,
  `status`               ENUM('aberta','em_execucao','concluida','cancelada') NOT NULL DEFAULT 'aberta',
  `titulo`               VARCHAR(200) NULL,
  `descricao`            TEXT         NULL,
  `tecnico_responsavel`  VARCHAR(100) NULL,
  `data_prevista_inicio` DATE         NULL,
  `data_prevista_fim`    DATE         NULL,
  `data_inicio`          DATE         NULL,
  `data_conclusao`       DATE         NULL,
  `tem_agendamento`      TINYINT(1)   NOT NULL DEFAULT 1,
  `observacoes`          TEXT         NULL,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP    NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_os_empresa` (`empresa_id`),
  INDEX `idx_os_proposta` (`proposta_id`),
  INDEX `idx_os_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. AGENDAMENTOS DA OS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `os_agendamento` (
  `id`               INT         NOT NULL AUTO_INCREMENT,
  `ordem_servico_id` INT         NOT NULL,
  `empresa_id`       INT         NOT NULL,
  `data_agendada`    DATE        NOT NULL,
  `hora_inicio`      VARCHAR(5)  NULL,
  `hora_fim`         VARCHAR(5)  NULL,
  `tipo`             ENUM('vistoria','instalacao','manutencao','revisao','entrega') NOT NULL DEFAULT 'instalacao',
  `tecnico`          VARCHAR(100) NULL,
  `endereco`         TEXT        NULL,
  `observacoes`      TEXT        NULL,
  `status`           ENUM('agendado','confirmado','realizado','cancelado') NOT NULL DEFAULT 'agendado',
  `created_at`       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_agendamento_os` (`ordem_servico_id`),
  INDEX `idx_agendamento_empresa` (`empresa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. MARCOS DA OS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `os_marco` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `ordem_servico_id` INT          NOT NULL,
  `titulo`           VARCHAR(200) NOT NULL,
  `descricao`        TEXT         NULL,
  `ordem`            INT          NOT NULL DEFAULT 0,
  `data_prevista`    DATE         NULL,
  `data_realizada`   DATE         NULL,
  `concluido`        TINYINT(1)   NOT NULL DEFAULT 0,
  `responsavel`      VARCHAR(100) NULL,
  `observacoes`      TEXT         NULL,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_marco_os` (`ordem_servico_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
