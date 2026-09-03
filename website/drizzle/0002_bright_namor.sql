CREATE TABLE `lick_progress` (
	`user_id` text NOT NULL,
	`lick_id` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`mastered` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `lick_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lick_progress_user_id` ON `lick_progress` (`user_id`);