import { MigrationInterface, QueryRunner } from "typeorm";

export class DebitAccess1726496225078 implements MigrationInterface {
    name = 'DebitAccess1726496225078'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "debit_access" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "key" varchar NOT NULL, "key_type" varchar NOT NULL, "total_debits" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_debit_access" ON "debit_access" ("app_user_id", "key", "key_type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "unique_debit_access"`);
        await queryRunner.query(`DROP TABLE "debit_access"`);
    }

}
