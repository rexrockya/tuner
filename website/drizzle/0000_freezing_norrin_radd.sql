CREATE TABLE `metronome_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`bpm` integer DEFAULT 80 NOT NULL,
	`running` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
