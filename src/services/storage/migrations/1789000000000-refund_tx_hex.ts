import { MigrationInterface, QueryRunner } from "typeorm";

export class RefundTxHex1789000000000 implements MigrationInterface {
    name = 'RefundTxHex1789000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice_swap" ADD COLUMN "refund_tx_hex" text NOT NULL DEFAULT ('')`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
