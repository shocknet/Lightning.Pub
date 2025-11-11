import { MigrationInterface, QueryRunner } from "typeorm";

export class TxSwap1762890527098 implements MigrationInterface {
    name = 'TxSwap1762890527098'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transaction_swap" ("swap_operation_id" varchar PRIMARY KEY NOT NULL, "app_user_id" varchar NOT NULL, "swap_quote_id" varchar NOT NULL, "swap_tree" varchar NOT NULL, "lockup_address" varchar NOT NULL, "refund_public_key" varchar NOT NULL, "timeout_block_height" integer NOT NULL, "invoice" varchar NOT NULL, "invoice_amount" integer NOT NULL, "transaction_amount" integer NOT NULL, "swap_fee_sats" integer NOT NULL, "chain_fee_sats" integer NOT NULL, "preimage" varchar NOT NULL, "ephemeral_public_key" varchar NOT NULL, "ephemeral_private_key" varchar NOT NULL, "used" boolean NOT NULL DEFAULT (0), "failure_reason" varchar NOT NULL DEFAULT (''), "tx_id" varchar NOT NULL DEFAULT (''), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`DROP INDEX "IDX_a609a4d3d8d9b07b90692a3c45"`);
        await queryRunner.query(`CREATE TABLE "temporary_user_invoice_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "paid_amount" integer NOT NULL, "routing_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, "liquidityProvider" varchar, "paymentIndex" integer NOT NULL DEFAULT (-1), "debit_to_pub" varchar, "swap_operation_id" varchar, CONSTRAINT "FK_ef2aa6761ab681bbbd5f94e0fcb" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6bcac90887eea1dc61d37db2994" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_invoice_payment"("serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider", "paymentIndex", "debit_to_pub") SELECT "serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider", "paymentIndex", "debit_to_pub" FROM "user_invoice_payment"`);
        await queryRunner.query(`DROP TABLE "user_invoice_payment"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_invoice_payment" RENAME TO "user_invoice_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a609a4d3d8d9b07b90692a3c45" ON "user_invoice_payment" ("invoice") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_a609a4d3d8d9b07b90692a3c45"`);
        await queryRunner.query(`ALTER TABLE "user_invoice_payment" RENAME TO "temporary_user_invoice_payment"`);
        await queryRunner.query(`CREATE TABLE "user_invoice_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "paid_amount" integer NOT NULL, "routing_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, "liquidityProvider" varchar, "paymentIndex" integer NOT NULL DEFAULT (-1), "debit_to_pub" varchar, CONSTRAINT "FK_ef2aa6761ab681bbbd5f94e0fcb" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6bcac90887eea1dc61d37db2994" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_invoice_payment"("serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider", "paymentIndex", "debit_to_pub") SELECT "serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider", "paymentIndex", "debit_to_pub" FROM "temporary_user_invoice_payment"`);
        await queryRunner.query(`DROP TABLE "temporary_user_invoice_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a609a4d3d8d9b07b90692a3c45" ON "user_invoice_payment" ("invoice") `);
        await queryRunner.query(`DROP TABLE "transaction_swap"`);
    }

}
