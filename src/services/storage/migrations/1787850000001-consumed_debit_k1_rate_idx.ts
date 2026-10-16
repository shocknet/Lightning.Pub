import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK1RateIdx1787850000001 implements MigrationInterface {
    name = 'ConsumedDebitK1RateIdx1787850000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_rate" ON "consumed_debit_k1" ("app_id", "pointer", "created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_rate"`);
    }
}
