import { MigrationInterface, QueryRunner } from "typeorm";

export class TxSwapClaim1788000000000 implements MigrationInterface {
    name = 'TxSwapClaim1788000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_swap" ADD COLUMN "claim_tx_hex" text NOT NULL DEFAULT ('')`)
        await queryRunner.query(`ALTER TABLE "transaction_swap" ADD COLUMN "lockup_tx_hex" text NOT NULL DEFAULT ('')`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
