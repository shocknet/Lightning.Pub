import { MigrationInterface, QueryRunner } from "typeorm";

export class ChannelRouting1709316653538 implements MigrationInterface {
    name = 'ChannelRouting1709316653538'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "channel_routing" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "day_unix" integer NOT NULL, "channel_id" varchar NOT NULL, "send_errors" integer NOT NULL DEFAULT (0), "receive_errors" integer NOT NULL DEFAULT (0), "forward_errors_as_input" integer NOT NULL DEFAULT (0), "forward_errors_as_output" integer NOT NULL DEFAULT (0), "missed_forward_fee_as_input" integer NOT NULL DEFAULT (0), "missed_forward_fee_as_output" integer NOT NULL DEFAULT (0), "forward_fee_as_input" integer NOT NULL DEFAULT (0), "forward_fee_as_output" integer NOT NULL DEFAULT (0), "latest_index_offset" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "channel_routing"`);
    }

}
