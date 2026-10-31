ALTER TABLE `client_leads` ADD `status_updated_at` integer;--> statement-breakpoint
UPDATE `client_leads` SET `status_updated_at` = `updated_at` WHERE `status_updated_at` IS NULL;--> statement-breakpoint
ALTER TABLE `client_leads` ADD `assigned_to_id` text REFERENCES `users`(`id`) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `client_leads` ADD `assigned_to_name` text;--> statement-breakpoint
ALTER TABLE `client_leads` ADD `claimed_at` integer;--> statement-breakpoint
CREATE INDEX `client_leads_assigned_idx` ON `client_leads` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `client_leads_status_updated_idx` ON `client_leads` (`status_updated_at`);
