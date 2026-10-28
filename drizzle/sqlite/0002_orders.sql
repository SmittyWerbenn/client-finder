CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`user_id` text,
	`plan_id` text NOT NULL,
	`plan_name` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`company` text,
	`doku_payment_url` text,
	`doku_token_id` text,
	`doku_request_id` text,
	`channel` text,
	`paid_at` integer,
	`expires_at` integer,
	`notification_payload` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_invoice_unique` ON `orders` (`invoice_number`);
--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);
--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`created_at`);
