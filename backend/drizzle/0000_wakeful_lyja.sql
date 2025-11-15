CREATE TABLE `sessions` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `user_credentials` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`imap_host` text NOT NULL,
	`imap_port` integer DEFAULT 993 NOT NULL,
	`imap_secure` integer DEFAULT 1 NOT NULL,
	`imap_user` text NOT NULL,
	`imap_pass` text NOT NULL,
	`smtp_host` text NOT NULL,
	`smtp_port` integer DEFAULT 587 NOT NULL,
	`smtp_secure` integer DEFAULT 0 NOT NULL,
	`smtp_user` text NOT NULL,
	`smtp_pass` text NOT NULL,
	`from_email` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);