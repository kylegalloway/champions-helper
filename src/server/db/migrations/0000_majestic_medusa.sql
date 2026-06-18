CREATE TABLE `import_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`url` text,
	`status` text NOT NULL,
	`message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta_team_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`species_id` integer NOT NULL,
	`move1` text NOT NULL,
	`move2` text NOT NULL,
	`move3` text NOT NULL,
	`move4` text NOT NULL,
	`ability` text NOT NULL,
	`nature` text NOT NULL,
	`sp_spread` text NOT NULL,
	`item` text,
	FOREIGN KEY (`team_id`) REFERENCES `meta_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`species_id`) REFERENCES `species`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_team_slots_team_slot` ON `meta_team_slots` (`team_id`,`slot`);--> statement-breakpoint
CREATE TABLE `meta_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`source` text NOT NULL,
	`source_url` text,
	`regulation_id` integer,
	`is_partial` integer DEFAULT 0 NOT NULL,
	`content_hash` text,
	`raw_json` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`regulation_id`) REFERENCES `regulations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regulation_species` (
	`regulation_id` integer NOT NULL,
	`species_id` integer NOT NULL,
	PRIMARY KEY(`regulation_id`, `species_id`),
	FOREIGN KEY (`regulation_id`) REFERENCES `regulations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`species_id`) REFERENCES `species`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regulations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`valid_from` text,
	`valid_to` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regulations_name_unique` ON `regulations` (`name`);--> statement-breakpoint
CREATE TABLE `roster_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_id` integer NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`move1` text NOT NULL,
	`move2` text NOT NULL,
	`move3` text NOT NULL,
	`move4` text NOT NULL,
	`ability` text NOT NULL,
	`nature` text NOT NULL,
	`sp_spread` text NOT NULL,
	`is_home_pokemon` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`species_id`) REFERENCES `species`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roster_entries_species_nickname` ON `roster_entries` (`species_id`,`nickname`);--> statement-breakpoint
CREATE TABLE `species` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pokeapi_url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `species_name_unique` ON `species` (`name`);