ALTER TABLE `upload` ADD `sha256` text;--> statement-breakpoint
ALTER TABLE `upload` ADD `processed_at` integer;--> statement-breakpoint
CREATE INDEX `upload_pending_idx` ON `upload` (`processed_at`,`created_at`);