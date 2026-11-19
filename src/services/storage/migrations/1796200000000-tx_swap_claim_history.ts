import { MigrationInterface, QueryRunner } from 'typeorm'

export class TxSwapClaimHistory1796200000000 implements MigrationInterface {
    name = 'TxSwapClaimHistory1796200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE transaction_swap ADD COLUMN claim_tx_history text NOT NULL DEFAULT ''")
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE transaction_swap DROP COLUMN claim_tx_history')
    }
}
