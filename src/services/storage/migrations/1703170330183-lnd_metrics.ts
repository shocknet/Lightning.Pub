import { MigrationInterface, QueryRunner } from "typeorm";

export class LndMetrics1703170330183 implements MigrationInterface {
    name = 'LndMetrics1703170330183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "balance_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "block_height" integer NOT NULL, "confirmed_chain_balance" integer NOT NULL, "unconfirmed_chain_balance" integer NOT NULL, "total_chain_balance" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "channel_balance_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channel_id" varchar NOT NULL, "local_balance_sats" integer NOT NULL, "remote_balance_sats" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "balanceEventSerialId" integer)`);
        await queryRunner.query(`CREATE TABLE "routing_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "incoming_channel_id" integer NOT NULL, "incoming_htlc_id" integer NOT NULL, "outgoing_channel_id" integer NOT NULL, "outgoing_htlc_id" integer NOT NULL, "timestamp_ns" integer NOT NULL, "event_type" varchar NOT NULL, "incoming_amt_msat" integer, "outgoing_amt_msat" integer, "failure_string" varchar, "settled" boolean, "offchain" boolean, "forward_fail_event" boolean, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "temporary_channel_balance_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channel_id" varchar NOT NULL, "local_balance_sats" integer NOT NULL, "remote_balance_sats" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "balanceEventSerialId" integer, CONSTRAINT "FK_e203090b07e770fe2e21a32e7c1" FOREIGN KEY ("balanceEventSerialId") REFERENCES "balance_event" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_channel_balance_event"("serial_id", "channel_id", "local_balance_sats", "remote_balance_sats", "created_at", "updated_at", "balanceEventSerialId") SELECT "serial_id", "channel_id", "local_balance_sats", "remote_balance_sats", "created_at", "updated_at", "balanceEventSerialId" FROM "channel_balance_event"`);
        await queryRunner.query(`DROP TABLE "channel_balance_event"`);
        await queryRunner.query(`ALTER TABLE "temporary_channel_balance_event" RENAME TO "channel_balance_event"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channel_balance_event" RENAME TO "temporary_channel_balance_event"`);
        await queryRunner.query(`CREATE TABLE "channel_balance_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channel_id" varchar NOT NULL, "local_balance_sats" integer NOT NULL, "remote_balance_sats" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "balanceEventSerialId" integer)`);
        await queryRunner.query(`INSERT INTO "channel_balance_event"("serial_id", "channel_id", "local_balance_sats", "remote_balance_sats", "created_at", "updated_at", "balanceEventSerialId") SELECT "serial_id", "channel_id", "local_balance_sats", "remote_balance_sats", "created_at", "updated_at", "balanceEventSerialId" FROM "temporary_channel_balance_event"`);
        await queryRunner.query(`DROP TABLE "temporary_channel_balance_event"`);
        await queryRunner.query(`DROP TABLE "routing_event"`);
        await queryRunner.query(`DROP TABLE "channel_balance_event"`);
        await queryRunner.query(`DROP TABLE "balance_event"`);
    }

}
