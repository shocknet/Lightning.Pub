import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK1Hold1787850000003 implements MigrationInterface {
    name = 'ConsumedDebitK1Hold1787850000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" ADD COLUMN "request_id" varchar`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" ADD COLUMN "released" boolean NOT NULL DEFAULT 0`)
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_request" ON "consumed_debit_k1" ("app_id", "pointer", "request_id")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_request"`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" DROP COLUMN "released"`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" DROP COLUMN "request_id"`)
    }
}
