import { MigrationInterface, QueryRunner } from "typeorm";

export class ChannelEvents1750777346411 implements MigrationInterface {
    name = 'ChannelEvents1750777346411'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "channel_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channel_id" varchar NOT NULL, "event_type" varchar NOT NULL, "inactive_since_unix" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "channel_event"`);
    }

}
