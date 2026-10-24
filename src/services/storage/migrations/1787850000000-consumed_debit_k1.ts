import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK11787850000000 implements MigrationInterface {
    name = 'ConsumedDebitK11787850000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "consumed_debit_k1" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_id" varchar NOT NULL, "pointer" varchar NOT NULL, "k1" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_consumed_debit_k1" ON "consumed_debit_k1" ("app_id", "pointer", "k1")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "unique_consumed_debit_k1"`);
        await queryRunner.query(`DROP TABLE "consumed_debit_k1"`);
    }
}
