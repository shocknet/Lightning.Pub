import { MigrationInterface, QueryRunner } from "typeorm";

export class BalanceEvents1724860966825 implements MigrationInterface {
    name = 'BalanceEvents1724860966825'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_balance_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "block_height" integer NOT NULL, "confirmed_chain_balance" integer NOT NULL, "unconfirmed_chain_balance" integer NOT NULL, "total_chain_balance" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "channels_balance" integer NOT NULL DEFAULT (0), "external_balance" integer NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "temporary_balance_event"("serial_id", "block_height", "confirmed_chain_balance", "unconfirmed_chain_balance", "total_chain_balance", "created_at", "updated_at") SELECT "serial_id", "block_height", "confirmed_chain_balance", "unconfirmed_chain_balance", "total_chain_balance", "created_at", "updated_at" FROM "balance_event"`);
        await queryRunner.query(`DROP TABLE "balance_event"`);
        await queryRunner.query(`ALTER TABLE "temporary_balance_event" RENAME TO "balance_event"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "balance_event" RENAME TO "temporary_balance_event"`);
        await queryRunner.query(`CREATE TABLE "balance_event" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "block_height" integer NOT NULL, "confirmed_chain_balance" integer NOT NULL, "unconfirmed_chain_balance" integer NOT NULL, "total_chain_balance" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "balance_event"("serial_id", "block_height", "confirmed_chain_balance", "unconfirmed_chain_balance", "total_chain_balance", "created_at", "updated_at") SELECT "serial_id", "block_height", "confirmed_chain_balance", "unconfirmed_chain_balance", "total_chain_balance", "created_at", "updated_at" FROM "temporary_balance_event"`);
        await queryRunner.query(`DROP TABLE "temporary_balance_event"`);
    }

}
