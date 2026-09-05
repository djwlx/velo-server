CREATE TABLE `velo_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `velo_config_key_unique` ON `velo_config` (`key`);--> statement-breakpoint
CREATE TABLE `velo_files_115` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pc_code` text NOT NULL,
	`class` text,
	`cid` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `velo_files_115_pc_code_unique` ON `velo_files_115` (`pc_code`);