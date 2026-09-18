ALTER TABLE `velo_users` RENAME COLUMN "username" TO "email";--> statement-breakpoint
DROP INDEX `velo_users_username_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `velo_users_email_unique` ON `velo_users` (`email`);