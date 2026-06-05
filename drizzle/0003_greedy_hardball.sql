ALTER TABLE `alerts` ADD `trend_template_score` integer;--> statement-breakpoint
CREATE INDEX `idx_tt_score` ON `alerts` (`trend_template_score`);