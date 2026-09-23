import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK1CreatedAtUnix1787850000007 implements MigrationInterface {
    name = 'ConsumedDebitK1CreatedAtUnix1787850000007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" ADD COLUMN "created_at_unix" integer NOT NULL DEFAULT (0)`)
        await queryRunner.query(`UPDATE "consumed_debit_k1" SET "created_at_unix" = CAST(strftime('%s', "created_at") AS INTEGER)`)
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_rate"`)
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_rate" ON "consumed_debit_k1" ("app_id", "pointer", "created_at_unix")`)
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_released_at"`)
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_released_at" ON "consumed_debit_k1" ("created_at_unix") WHERE "status" = 'released'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_released_at"`)
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_released_at" ON "consumed_debit_k1" ("created_at") WHERE "status" = 'released'`)
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_rate"`)
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_rate" ON "consumed_debit_k1" ("app_id", "pointer", "created_at")`)
        await queryRunner.query(`ALTER TABLE "consumed_debit_k1" DROP COLUMN "created_at_unix"`)
    }
}
