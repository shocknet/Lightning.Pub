import { MigrationInterface, QueryRunner } from "typeorm";

export class TxSwapClaimPublished1790000000000 implements MigrationInterface {
    name = 'TxSwapClaimPublished1790000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_swap" ADD COLUMN "claim_published" boolean NOT NULL DEFAULT (0)`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
