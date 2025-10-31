import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminSettings1761683639419 implements MigrationInterface {
    name = 'AdminSettings1761683639419'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "admin_settings" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "env_name" varchar NOT NULL, "env_value" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_d8a6092ee66a2e65a9d278cf041" UNIQUE ("env_name"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "admin_settings"`);
    }
}
