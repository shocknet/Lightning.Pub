import { MigrationInterface, QueryRunner } from "typeorm";

export class HtlcCount1724266887195 implements MigrationInterface {
    name = 'HtlcCount1724266887195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_channel_routing" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "day_unix" integer NOT NULL, "channel_id" varchar NOT NULL, "send_errors" integer NOT NULL DEFAULT (0), "receive_errors" integer NOT NULL DEFAULT (0), "forward_errors_as_input" integer NOT NULL DEFAULT (0), "forward_errors_as_output" integer NOT NULL DEFAULT (0), "missed_forward_fee_as_input" integer NOT NULL DEFAULT (0), "missed_forward_fee_as_output" integer NOT NULL DEFAULT (0), "forward_fee_as_input" integer NOT NULL DEFAULT (0), "forward_fee_as_output" integer NOT NULL DEFAULT (0), "latest_index_offset" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "events_as_output" integer NOT NULL DEFAULT (0), "events_as_input" integer NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "temporary_channel_routing"("serial_id", "day_unix", "channel_id", "send_errors", "receive_errors", "forward_errors_as_input", "forward_errors_as_output", "missed_forward_fee_as_input", "missed_forward_fee_as_output", "forward_fee_as_input", "forward_fee_as_output", "latest_index_offset", "created_at", "updated_at") SELECT "serial_id", "day_unix", "channel_id", "send_errors", "receive_errors", "forward_errors_as_input", "forward_errors_as_output", "missed_forward_fee_as_input", "missed_forward_fee_as_output", "forward_fee_as_input", "forward_fee_as_output", "latest_index_offset", "created_at", "updated_at" FROM "channel_routing"`);
        await queryRunner.query(`DROP TABLE "channel_routing"`);
        await queryRunner.query(`ALTER TABLE "temporary_channel_routing" RENAME TO "channel_routing"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel_routing" RENAME TO "temporary_channel_routing"`);
        await queryRunner.query(`CREATE TABLE "channel_routing" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "day_unix" integer NOT NULL, "channel_id" varchar NOT NULL, "send_errors" integer NOT NULL DEFAULT (0), "receive_errors" integer NOT NULL DEFAULT (0), "forward_errors_as_input" integer NOT NULL DEFAULT (0), "forward_errors_as_output" integer NOT NULL DEFAULT (0), "missed_forward_fee_as_input" integer NOT NULL DEFAULT (0), "missed_forward_fee_as_output" integer NOT NULL DEFAULT (0), "forward_fee_as_input" integer NOT NULL DEFAULT (0), "forward_fee_as_output" integer NOT NULL DEFAULT (0), "latest_index_offset" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "channel_routing"("serial_id", "day_unix", "channel_id", "send_errors", "receive_errors", "forward_errors_as_input", "forward_errors_as_output", "missed_forward_fee_as_input", "missed_forward_fee_as_output", "forward_fee_as_input", "forward_fee_as_output", "latest_index_offset", "created_at", "updated_at") SELECT "serial_id", "day_unix", "channel_id", "send_errors", "receive_errors", "forward_errors_as_input", "forward_errors_as_output", "missed_forward_fee_as_input", "missed_forward_fee_as_output", "forward_fee_as_input", "forward_fee_as_output", "latest_index_offset", "created_at", "updated_at" FROM "temporary_channel_routing"`);
        await queryRunner.query(`DROP TABLE "temporary_channel_routing"`);
    }

}
