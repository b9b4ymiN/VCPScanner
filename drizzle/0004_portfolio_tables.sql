CREATE TABLE `portfolios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'VCP Sim' NOT NULL,
	`initial_cap` real DEFAULT 100000 NOT NULL,
	`cash_balance` real NOT NULL,
	`total_value` real NOT NULL,
	`total_pnl` real DEFAULT 0 NOT NULL,
	`total_pnl_pct` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
CREATE INDEX `idx_portfolios_status` ON `portfolios` (`status`);
CREATE TABLE `positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`portfolio_id` integer NOT NULL,
	`symbol` text NOT NULL,
	`entry_date` text NOT NULL,
	`entry_price` real NOT NULL,
	`stop_price` real NOT NULL,
	`target_price` real NOT NULL,
	`pivot_price` real NOT NULL,
	`quantity` integer NOT NULL,
	`cost_basis` real NOT NULL,
	`exit_date` text,
	`exit_price` real,
	`exit_reason` text,
	`pnl` real,
	`pnl_pct` real,
	`status` text DEFAULT 'open' NOT NULL,
	`sepa_score` integer,
	`vcp_quality` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `idx_positions_portfolio_status` ON `positions` (`portfolio_id`,`status`);
CREATE INDEX `idx_positions_portfolio_symbol_status` ON `positions` (`portfolio_id`,`symbol`,`status`);
CREATE TABLE `daily_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`portfolio_id` integer NOT NULL,
	`date` text NOT NULL,
	`cash_balance` real NOT NULL,
	`positions_value` real NOT NULL,
	`total_value` real NOT NULL,
	`daily_pnl` real NOT NULL,
	`daily_pnl_pct` real NOT NULL,
	`open_count` integer NOT NULL,
	`closed_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `idx_daily_snapshots_portfolio_date` ON `daily_snapshots` (`portfolio_id`,`date`);
