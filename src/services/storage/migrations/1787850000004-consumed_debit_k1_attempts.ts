import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK1Attempts1787850000004 implements MigrationInterface {
    name = 'ConsumedDebitK1Attempts1787850000004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" ADD COLUMN "npub" varchar`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" ADD COLUMN "status" varchar NOT NULL DEFAULT 'held'`)
        await queryRunner.query(`UPDATE "consumed_debit_k1" SET "status" = CASE WHEN "released" = 1 THEN 'released' ELSE 'held' END`)
        await queryRunner.query(`DROP INDEX "unique_consumed_debit_k1"`)
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_request"`)
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_active_consumed_debit_k1" ON "consumed_debit_k1" ("app_id", "pointer", "k1") WHERE "status" != 'released'`)
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_consumed_debit_k1_request" ON "consumed_debit_k1" ("app_id", "pointer", "request_id") WHERE "request_id" IS NOT NULL`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" DROP COLUMN "released"`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" ADD COLUMN "released" boolean NOT NULL DEFAULT 0`)
        await queryRunner.query(`UPDATE "consumed_debit_k1" SET "released" = CASE WHEN "status" = 'released' THEN 1 ELSE 0 END`)
        await queryRunner.query(`DELETE FROM "consumed_debit_k1" WHERE "status" = 'released'`)
        await queryRunner.query(`DROP INDEX "unique_active_consumed_debit_k1"`)
        await queryRunner.query(`DROP INDEX "unique_consumed_debit_k1_request"`)
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_consumed_debit_k1" ON "consumed_debit_k1" ("app_id", "pointer", "k1")`)
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_request" ON "consumed_debit_k1" ("app_id", "pointer", "request_id")`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" DROP COLUMN "status"`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" DROP COLUMN "npub"`)
    }
}
