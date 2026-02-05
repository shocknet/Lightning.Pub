import { MigrationInterface, QueryRunner } from "typeorm";

export class InvoiceSwaps1769529793283 implements MigrationInterface {
    name = 'InvoiceSwaps1769529793283'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invoice_swap" ("swap_operation_id" varchar PRIMARY KEY NOT NULL, "app_user_id" varchar NOT NULL, "swap_quote_id" varchar NOT NULL, "swap_tree" varchar NOT NULL, "claim_public_key" varchar NOT NULL, "payment_hash" varchar NOT NULL, "timeout_block_height" integer NOT NULL, "invoice" varchar NOT NULL, "invoice_amount" integer NOT NULL, "transaction_amount" integer NOT NULL, "swap_fee_sats" integer NOT NULL, "chain_fee_sats" integer NOT NULL, "ephemeral_public_key" varchar NOT NULL, "address" varchar NOT NULL, "ephemeral_private_key" varchar NOT NULL, "used" boolean NOT NULL DEFAULT (0), "preimage" varchar NOT NULL DEFAULT (''), "failure_reason" varchar NOT NULL DEFAULT (''), "tx_id" varchar NOT NULL DEFAULT (''), "service_url" varchar NOT NULL DEFAULT (''), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "invoice_swap"`);
    }

}
