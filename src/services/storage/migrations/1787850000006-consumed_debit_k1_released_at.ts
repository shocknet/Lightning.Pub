import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK1ReleasedAt1787850000006 implements MigrationInterface {
    name = 'ConsumedDebitK1ReleasedAt1787850000006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_released_at" ON "consumed_debit_k1" ("created_at") WHERE "status" = 'released'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_released_at"`)
    }
}
