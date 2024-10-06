import { MigrationInterface, QueryRunner } from "typeorm";

export class DebitAccessFixes1726685229264 implements MigrationInterface {
    name = 'DebitAccessFixes1726685229264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "unique_debit_access"`);
        await queryRunner.query(`CREATE TABLE "temporary_debit_access" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "total_debits" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_debit_access"("serial_id", "app_user_id", "total_debits", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "total_debits", "created_at", "updated_at" FROM "debit_access"`);
        await queryRunner.query(`DROP TABLE "debit_access"`);
        await queryRunner.query(`ALTER TABLE "temporary_debit_access" RENAME TO "debit_access"`);
        await queryRunner.query(`CREATE TABLE "temporary_debit_access" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "total_debits" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "npub" varchar NOT NULL, "authorized" boolean NOT NULL, "rules" text)`);
        await queryRunner.query(`INSERT INTO "temporary_debit_access"("serial_id", "app_user_id", "total_debits", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "total_debits", "created_at", "updated_at" FROM "debit_access"`);
        await queryRunner.query(`DROP TABLE "debit_access"`);
        await queryRunner.query(`ALTER TABLE "temporary_debit_access" RENAME TO "debit_access"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_debit_access" ON "debit_access" ("app_user_id", "npub") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "unique_debit_access"`);
        await queryRunner.query(`ALTER TABLE "debit_access" RENAME TO "temporary_debit_access"`);
        await queryRunner.query(`CREATE TABLE "debit_access" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "total_debits" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "debit_access"("serial_id", "app_user_id", "total_debits", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "total_debits", "created_at", "updated_at" FROM "temporary_debit_access"`);
        await queryRunner.query(`DROP TABLE "temporary_debit_access"`);
        await queryRunner.query(`ALTER TABLE "debit_access" RENAME TO "temporary_debit_access"`);
        await queryRunner.query(`CREATE TABLE "debit_access" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "key" varchar NOT NULL, "key_type" varchar NOT NULL, "total_debits" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "debit_access"("serial_id", "app_user_id", "total_debits", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "total_debits", "created_at", "updated_at" FROM "temporary_debit_access"`);
        await queryRunner.query(`DROP TABLE "temporary_debit_access"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_debit_access" ON "debit_access" ("app_user_id", "key", "key_type") `);
    }

}
