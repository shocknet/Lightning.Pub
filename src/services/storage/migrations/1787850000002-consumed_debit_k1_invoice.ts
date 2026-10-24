import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK1Invoice1787850000002 implements MigrationInterface {
    name = 'ConsumedDebitK1Invoice1787850000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" ADD COLUMN "invoice" varchar`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" DROP COLUMN "invoice"`)
    }
}
