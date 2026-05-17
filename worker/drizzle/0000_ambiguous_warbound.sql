CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`symbol` text NOT NULL,
	`name` text,
	`sector` text,
	`market_id` text NOT NULL,
	`strategy_id` text NOT NULL,
	`sepa_score` real NOT NULL,
	`alert_level` text NOT NULL,
	`price` real NOT NULL,
	`price_change_pct` real,
	`vcp_quality` text,
	`vcp_quality_score` integer,
	`vcp_contractions` text,
	`vol_drying` integer,
	`pivot_price` real,
	`pivot_distance_pct` real,
	`score_c1` real,
	`score_c2` real,
	`score_c3` real,
	`score_c4` real,
	`score_c5` real,
	`score_c6` real,
	`score_c7` real,
	`breakout_status` text,
	`breakout_date` text,
	`price_52w_high` real,
	`revenue_growth_yoy` real,
	`eps_growth_yoy` real,
	`volume_ratio` real,
	`rsi_14` real,
	`adx_14` real,
	`bb_width_pct` real,
	`entry_price` real,
	`stop_price` real,
	`target_price` real,
	`risk_reward_ratio` real,
	`risk_pct` real,
	`prices_60d` text,
	`volumes_60d` text,
	`details` text,
	`created_at` text DEFAULT (datetime('now','localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_date_sym_strat` ON `alerts` (`date`,`symbol`,`strategy_id`,`market_id`);--> statement-breakpoint
CREATE INDEX `idx_date` ON `alerts` (`date`);--> statement-breakpoint
CREATE INDEX `idx_symbol` ON `alerts` (`symbol`);--> statement-breakpoint
CREATE INDEX `idx_level` ON `alerts` (`alert_level`);--> statement-breakpoint
CREATE INDEX `idx_score` ON `alerts` (`sepa_score`);--> statement-breakpoint
CREATE TABLE `markets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`timezone` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `price_cache` (
	`symbol` text NOT NULL,
	`market_id` text NOT NULL,
	`date` text NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real,
	`volume` integer,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`symbol`, `market_id`, `date`)
);
--> statement-breakpoint
CREATE TABLE `scan_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`market_id` text NOT NULL,
	`strategy_id` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`total_scanned` integer,
	`total_passed` integer,
	`status` text,
	`error_msg` text
);
--> statement-breakpoint
CREATE TABLE `symbols` (
	`symbol` text NOT NULL,
	`market_id` text NOT NULL,
	`name` text,
	`sector` text,
	`active` integer DEFAULT true,
	PRIMARY KEY(`symbol`, `market_id`),
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action
);
