import { MigrationInterface, QueryRunner } from "typeorm";

export class TxSwapClaimBroadcastAccepted1796100000000 implements MigrationInterface {
    name = 'TxSwapClaimBroadcastAccepted1796100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_swap" ADD COLUMN "claim_broadcast_accepted" boolean NOT NULL DEFAULT (0)`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
