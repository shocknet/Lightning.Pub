import { MigrationInterface, QueryRunner } from "typeorm";

export class InvoiceSwapFundingLock1791000000000 implements MigrationInterface {
    name = 'InvoiceSwapFundingLock1791000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoice_swap_funding_lock" ("payment_hash" varchar PRIMARY KEY NOT NULL, "swap_operation_id" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`)
        await queryRunner.query(`INSERT OR IGNORE INTO "invoice_swap_funding_lock" ("payment_hash", "swap_operation_id") SELECT "payment_hash", MIN("swap_operation_id") FROM "invoice_swap" WHERE "tx_id" != '' GROUP BY "payment_hash"`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "invoice_swap_funding_lock"`)
    }
}
